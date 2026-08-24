import webpush from "web-push";
import { isInQuietHours } from "@/lib/notifications/digest";
import { getPushServerConfig } from "@/lib/notifications/server-config";
import {
  buildTaskReminderPayload,
  isTaskReminderDue,
  manilaClock,
  taskReminderDeliveryKey,
  taskReminderLookbackMinutes,
  type ScheduledTaskReminder,
} from "@/lib/notifications/task-reminders";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
}

export async function POST(request: Request) {
  const pushConfig = getPushServerConfig();
  const admin = createAdminClient();
  if (!pushConfig || !admin) {
    return Response.json(
      { error: "Task reminder delivery is not configured." },
      { status: 503 },
    );
  }

  const token = bearerToken(request);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: authorized, error: authorizationError } = await admin.rpc(
    "validate_task_reminder_scheduler_secret",
    { p_secret: token },
  );
  if (authorizationError || !authorized) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    pushConfig.subject,
    pushConfig.publicKey,
    pushConfig.privateKey,
  );

  const now = new Date();
  const clock = manilaClock(now);
  const windowStart = manilaClock(
    new Date(now.getTime() - taskReminderLookbackMinutes * 60_000),
  );
  const { data: preferences, error: preferencesError } = await admin
    .from("user_preferences")
    .select("user_id,quiet_hours_start,quiet_hours_end")
    .eq("reminders_enabled", true)
    .eq("task_reminders", true);
  if (preferencesError) {
    return Response.json(
      { error: "Task reminder preferences could not be loaded." },
      { status: 500 },
    );
  }

  const userIds = (preferences ?? []).map((preference) => preference.user_id);
  if (userIds.length === 0) {
    return Response.json({ due: 0, sent: 0, skipped: 0 });
  }

  const [subscriptionsResult, tasksResult] = await Promise.all([
    admin
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .in("user_id", userIds),
    admin
      .from("tasks")
      .select("id,user_id,title,scheduled_for,scheduled_time,estimated_minutes")
      .in("user_id", userIds)
      .gte("scheduled_for", windowStart.date)
      .lte("scheduled_for", clock.date)
      .not("scheduled_time", "is", null)
      .not("status", "in", "(completed,cancelled)")
      .limit(500),
  ]);
  if (subscriptionsResult.error || tasksResult.error) {
    return Response.json(
      { error: "Task reminder inputs could not be loaded." },
      { status: 500 },
    );
  }

  const preferencesByUser = new Map(
    (preferences ?? []).map((preference) => [preference.user_id, preference]),
  );
  const subscriptionsByUser = new Map<
    string,
    NonNullable<typeof subscriptionsResult.data>
  >();
  for (const subscription of subscriptionsResult.data ?? []) {
    const userSubscriptions =
      subscriptionsByUser.get(subscription.user_id) ?? [];
    userSubscriptions.push(subscription);
    subscriptionsByUser.set(subscription.user_id, userSubscriptions);
  }

  const dueTasks = (tasksResult.data ?? []).filter((task) =>
    isTaskReminderDue(task as ScheduledTaskReminder, now),
  );
  let sent = 0;
  let skipped = 0;
  for (const taskValue of dueTasks) {
    const task = taskValue as ScheduledTaskReminder;
    const preference = preferencesByUser.get(task.user_id);
    if (
      !preference ||
      isInQuietHours(
        clock.time,
        preference.quiet_hours_start,
        preference.quiet_hours_end,
      )
    ) {
      skipped += 1;
      continue;
    }
    const subscriptions = subscriptionsByUser.get(task.user_id) ?? [];
    if (subscriptions.length === 0) {
      skipped += 1;
      continue;
    }

    const deliveryKey = taskReminderDeliveryKey(task);
    const reservation = await admin.from("notification_deliveries").insert({
      user_id: task.user_id,
      delivery_key: deliveryKey,
      notification_type: "task_due",
    });
    if (reservation.error?.code === "23505") {
      skipped += 1;
      continue;
    }
    if (reservation.error) continue;

    let deliveredForTask = 0;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(buildTaskReminderPayload(task)),
          { TTL: 900, urgency: "high" },
        );
        deliveredForTask += 1;
        sent += 1;
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number(error.statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
      }
    }
    if (deliveredForTask === 0) {
      await admin
        .from("notification_deliveries")
        .delete()
        .eq("user_id", task.user_id)
        .eq("delivery_key", deliveryKey);
    }
  }

  return Response.json({ due: dueTasks.length, sent, skipped });
}
