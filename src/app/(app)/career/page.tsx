import { BriefcaseBusiness, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ApplicationForm } from "@/components/career/application-form";
import { StageSelect } from "@/components/career/stage-select";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Career" };

const stages = [
  "interested",
  "preparing",
  "applied",
  "assessment",
  "interview",
  "final_interview",
  "offer",
  "rejected",
  "withdrawn",
  "accepted",
] as const;

type Application = {
  id: string;
  company_name: string;
  role_title: string;
  job_url: string | null;
  work_setup: string;
  stage: string;
  salary_min_centavos: number | null;
  salary_max_centavos: number | null;
  next_action: string | null;
  next_action_at: string | null;
  applied_at: string | null;
  is_follow_up_overdue: boolean;
};

function rate(numerator: number, denominator: number) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : null;
}

export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view = (await searchParams).view === "kanban" ? "kanban" : "table";
  const supabase = await createClient();
  const [applicationsResult, eventsResult] = supabase
    ? await Promise.all([
        supabase
          .from("career_application_overview")
          .select(
            "id,company_name,role_title,job_url,work_setup,stage,salary_min_centavos,salary_max_centavos,next_action,next_action_at,applied_at,is_follow_up_overdue",
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("job_application_events")
          .select("job_application_id,event_type"),
      ])
    : [{ data: [] }, { data: [] }];
  const applications = (applicationsResult.data ?? []) as Application[];
  const events = eventsResult.data ?? [];
  const reached = (types: string[]) =>
    new Set(
      events
        .filter((event) => types.includes(event.event_type))
        .map((event) => event.job_application_id),
    );
  const applied = new Set([
    ...applications
      .filter((application) => application.applied_at)
      .map((application) => application.id),
    ...reached([
      "stage_applied",
      "stage_assessment",
      "stage_interview",
      "stage_final_interview",
      "stage_offer",
      "stage_accepted",
    ]),
  ]);
  const assessment = reached([
    "stage_assessment",
    "stage_interview",
    "stage_final_interview",
    "stage_offer",
    "stage_accepted",
  ]);
  const interview = reached([
    "stage_interview",
    "stage_final_interview",
    "stage_offer",
    "stage_accepted",
  ]);
  const offer = reached(["stage_offer", "stage_accepted"]);
  const conversions = [
    ["Applied → assessment", rate(assessment.size, applied.size)],
    ["Assessment → interview", rate(interview.size, assessment.size)],
    ["Interview → offer", rate(offer.size, interview.size)],
  ].filter((metric): metric is [string, string] => metric[1] !== null);
  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeading
        eyebrow="Opportunity pipeline"
        title="Career"
        description="Keep every application tied to a stage, a date, and one clear next action."
        actions={
          <>
            <Button
              asChild
              variant={view === "table" ? "default" : "secondary"}
              size="sm"
            >
              <Link href="/career?view=table">Table</Link>
            </Button>
            <Button
              asChild
              variant={view === "kanban" ? "default" : "secondary"}
              size="sm"
            >
              <Link href="/career?view=kanban">Kanban</Link>
            </Button>
          </>
        }
      />
      {conversions.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {conversions.map(([label, value]) => (
            <Card key={label}>
              <CardContent>
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="mt-3 font-mono text-2xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-6">
        <ApplicationForm />
      </div>

      {applications.length === 0 ? (
        <div className="border-border mt-6 grid min-h-60 place-items-center rounded-2xl border border-dashed text-center">
          <div>
            <BriefcaseBusiness className="text-primary mx-auto size-6" />
            <p className="mt-4 text-sm font-semibold">
              Build your opportunity pipeline.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Add a role before applying so the next action never disappears.
            </p>
          </div>
        </div>
      ) : view === "table" ? (
        <div className="border-border bg-card mt-6 overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-border text-muted-foreground border-b text-xs">
              <tr>
                <th className="p-4 font-medium">Company / role</th>
                <th className="p-4 font-medium">Stage</th>
                <th className="p-4 font-medium">Next action</th>
                <th className="p-4 font-medium">Salary range</th>
                <th className="p-4 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => {
                const overdue = application.is_follow_up_overdue;
                return (
                  <tr
                    key={application.id}
                    className="border-border border-b last:border-0"
                  >
                    <td className="p-4">
                      <p className="font-semibold">
                        {application.company_name}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {application.role_title} · {application.work_setup}
                      </p>
                    </td>
                    <td className="p-4">
                      <StageSelect
                        applicationId={application.id}
                        companyName={application.company_name}
                        stage={application.stage}
                      />
                    </td>
                    <td className="p-4">
                      <p>{application.next_action ?? "No action set"}</p>
                      {application.next_action_at && (
                        <p
                          className={`mt-1 text-xs ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                        >
                          {overdue ? "Follow-up overdue · " : ""}
                          {new Date(
                            application.next_action_at,
                          ).toLocaleDateString("en-PH", {
                            timeZone: "Asia/Manila",
                          })}
                        </p>
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs">
                      {application.salary_min_centavos != null
                        ? formatCentavos(application.salary_min_centavos)
                        : "—"}
                      {application.salary_max_centavos != null
                        ? ` – ${formatCentavos(application.salary_max_centavos)}`
                        : ""}
                    </td>
                    <td className="p-4">
                      {application.job_url ? (
                        <a
                          href={application.job_url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open job link for ${application.company_name}`}
                          className="text-primary"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {stages.slice(0, 7).map((stage) => {
            const items = applications.filter(
              (application) => application.stage === stage,
            );
            return (
              <section
                key={stage}
                className="w-72 shrink-0"
                aria-labelledby={`stage-${stage}`}
              >
                <h2
                  id={`stage-${stage}`}
                  className="text-muted-foreground mb-3 flex items-center justify-between text-xs font-semibold capitalize"
                >
                  {stage.replaceAll("_", " ")}
                  <span className="font-mono">{items.length}</span>
                </h2>
                <div className="space-y-2">
                  {items.map((application) => (
                    <Card key={application.id}>
                      <CardContent>
                        <p className="text-sm font-semibold">
                          {application.company_name}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {application.role_title}
                        </p>
                        {application.next_action && (
                          <p className="border-border mt-4 border-t pt-3 text-xs">
                            {application.next_action}
                          </p>
                        )}
                        <div className="mt-3">
                          <StageSelect
                            applicationId={application.id}
                            companyName={application.company_name}
                            stage={application.stage}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
