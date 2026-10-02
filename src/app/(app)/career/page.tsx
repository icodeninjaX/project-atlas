import {
  CareerWorkspace,
  parseCareerView,
} from "@/components/career/career-workspace";
import type { CareerApplication, CareerEvent } from "@/lib/career/view";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Career" };

export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; highlight?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const [applicationsResult, eventsResult] = supabase
    ? await Promise.all([
        supabase
          .from("career_application_overview")
          .select(
            "id,company_name,role_title,job_url,location,work_setup,employment_type,stage,salary_min_centavos,salary_max_centavos,next_action,next_action_at,applied_at,contact_name,contact_email,resume_version,notes,is_follow_up_overdue",
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("job_application_events")
          .select("job_application_id,event_type"),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <CareerWorkspace
      applications={(applicationsResult.data ?? []) as CareerApplication[]}
      events={(eventsResult.data ?? []) as CareerEvent[]}
      view={parseCareerView(query.view)}
      nowIso={new Date().toISOString()}
      highlightId={query.highlight}
    />
  );
}
