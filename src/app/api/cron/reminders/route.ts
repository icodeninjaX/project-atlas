import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { mondayWeekStart } from "@/lib/dates/dates";
import {
  buildDigestBody,
  isInQuietHours,
  type ReminderCounts,
} from "@/lib/notifications/digest";
import { getPushServerConfig } from "@/lib/notifications/server-config";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function authorized(request: Request, secret: string) {
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function manilaClock(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
    weekday: part("weekday"),
  };
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00+08:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const pushConfig = getPushServerConfig();
  const admin = createAdminClient();
  if (!cronSecret || !pushConfig || !admin) {
    return Response.json(
      { error: "Reminder delivery is not configured." },
      { status: 503 },
    );
  }
  if (!authorized(request, cronSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    pushConfig.subject,
    pushConfig.publicKey,
    pushConfig.privateKey,
  );

  const now = new Date();
  const clock = manilaClock(now);
  const weekStart = mondayWeekStart(now);
  const debtWindowEnd = addDays(clock.date, 3);
  const { data: preferences, error: preferencesError } = await admin
    .from("user_preferences")
    .select(
      "user_id,task_reminders,debt_reminders,payday_reminders,review_reminders,quiet_hours_start,quiet_hours_end",
    )
    .eq("reminders_enabled", true);
  if (preferencesError) {
    return Response.json(
      { error: "Preferences could not be loaded." },
      { status: 500 },
    );
  }

  const userIds = (preferences ?? []).map((preference) => preference.user_id);
  if (userIds.length === 0) {
    return Response.json({ users: 0, sent: 0 });
  }

  const [
    subscriptionsResult,
    tasksResult,
    debtsResult,
    profilesResult,
    reviewsResult,
  ] = await Promise.all([
    admin
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .in("user_id", userIds),
    admin
      .from("tasks")
      .select("user_id")
      .in("user_id", userIds)
      .lte("scheduled_for", clock.date)
      .not("status", "in", "(completed,cancelled)"),
    admin
      .from("debts")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "active")
      .lte("next_due_date", debtWindowEnd),
    admin.from("profiles").select("id,next_payday").in("id", userIds),
    admin
      .from("weekly_reviews")
      .select("user_id,completed_at")
      .in("user_id", userIds)
      .eq("week_start", weekStart),
  ]);

  const queryError = [
    subscriptionsResult.error,
    tasksResult.error,
    debtsResult.error,
    profilesResult.error,
    reviewsResult.error,
  ].find(Boolean);
  if (queryError) {
    return Response.json(
      { error: "Reminder inputs could not be loaded." },
      { status: 500 },
    );
  }

  let sent = 0;
  let skipped = 0;
  for (const preference of preferences ?? []) {
    if (
      isInQuietHours(
        clock.time,
        preference.quiet_hours_start,
        preference.quiet_hours_end,
      )
    ) {
      skipped += 1;
      continue;
    }
    const userSubscriptions = (subscriptionsResult.data ?? []).filter(
      (subscription) => subscription.user_id === preference.user_id,
    );
    if (userSubscriptions.length === 0) continue;

    const counts: ReminderCounts = {
      tasks: preference.task_reminders
        ? (tasksResult.data ?? []).filter(
            (task) => task.user_id === preference.user_id,
          ).length
        : 0,
      debts: preference.debt_reminders
        ? (debtsResult.data ?? []).filter(
            (debt) => debt.user_id === preference.user_id,
          ).length
        : 0,
      payday:
        preference.payday_reminders &&
        (profilesResult.data ?? []).some(
          (profile) =>
            profile.id === preference.user_id &&
            profile.next_payday === clock.date,
        ),
      review:
        preference.review_reminders &&
        clock.weekday === "Sunday" &&
        !(reviewsResult.data ?? []).some(
          (review) =>
            review.user_id === preference.user_id && review.completed_at,
        ),
    };
    const body = buildDigestBody(counts);
    if (!body) continue;

    const deliveryKey = `daily:${clock.date}`;
    const reservation = await admin.from("notification_deliveries").insert({
      user_id: preference.user_id,
      delivery_key: deliveryKey,
      notification_type: "daily_digest",
    });
    if (reservation.error?.code === "23505") {
      skipped += 1;
      continue;
    }
    if (reservation.error) continue;

    let deliveredForUser = 0;
    for (const subscription of userSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({
            title: "Your ATLAS dayline",
            body,
            url: "/dashboard",
          }),
        );
        deliveredForUser += 1;
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
    if (deliveredForUser === 0) {
      await admin
        .from("notification_deliveries")
        .delete()
        .eq("user_id", preference.user_id)
        .eq("delivery_key", deliveryKey);
    }
  }

  return Response.json({ users: userIds.length, sent, skipped });
}
