import { ArrowLeft, History } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Activity history" };

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("activity_log")
        .select("id,action,entity_type,entity_id,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };
  const activity = data ?? [];
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/settings"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" />
        Settings
      </Link>
      <p className="text-primary mt-8 font-mono text-[11px] font-semibold tracking-wider uppercase">
        Audit trail
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Activity history
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Meaningful changes are listed without storing full record payloads or
        secrets.
      </p>
      <div className="mt-8 space-y-2">
        {activity.length === 0 ? (
          <div className="border-border grid min-h-56 place-items-center rounded-2xl border border-dashed text-center">
            <div>
              <History className="text-primary mx-auto size-6" />
              <p className="mt-4 text-sm font-semibold">
                No meaningful activity yet.
              </p>
            </div>
          </div>
        ) : (
          activity.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-primary/10 text-primary grid size-9 place-items-center rounded-lg">
                  <History className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {String(item.action).replaceAll("_", " ")}
                  </p>
                  <p className="text-muted-foreground mt-1 font-mono text-[10px]">
                    {item.entity_type} · {item.entity_id}
                  </p>
                </div>
                <time className="text-muted-foreground text-right font-mono text-[10px]">
                  {new Date(item.created_at).toLocaleString("en-PH", {
                    timeZone: "Asia/Manila",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
