import { Fragment } from "react";
import { BriefcaseBusiness, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ApplicationCreateDialog } from "@/components/career/application-create-dialog";
import { ApplicationEditForm } from "@/components/career/application-edit-form";
import {
  CareerKanban,
  type CareerApplication,
} from "@/components/career/career-kanban";
import { StageSelect } from "@/components/career/stage-select";
import { PageHeading } from "@/components/shared/page-heading";
import { SensitiveValue } from "@/components/privacy/privacy-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCentavos } from "@/lib/money/money";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Career" };

function rate(numerator: number, denominator: number) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : null;
}

function ApplicationCards({
  applications,
  highlightId,
}: {
  applications: CareerApplication[];
  highlightId?: string;
}) {
  return (
    <div className="mt-6 space-y-3 lg:hidden">
      {applications.map((application) => {
        const overdue = application.is_follow_up_overdue;
        return (
          <Card
            key={application.id}
            id={`application-${application.id}`}
            className={
              application.id === highlightId
                ? "ring-primary/60 bg-primary/5 ring-2"
                : undefined
            }
          >
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {application.company_name}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {application.role_title} · {application.work_setup}
                  </p>
                </div>
                <StageSelect
                  applicationId={application.id}
                  companyName={application.company_name}
                  stage={application.stage}
                  className="min-h-11 shrink-0"
                />
              </div>

              <div className="border-border mt-4 grid gap-3 border-y py-3 min-[380px]:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-[11px]">
                    Next action
                  </p>
                  <p className="mt-1 text-sm">
                    {application.next_action ?? "No action set"}
                  </p>
                  {application.next_action_at && (
                    <p
                      className={`mt-1 text-xs ${
                        overdue
                          ? "text-destructive font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {overdue ? "Follow-up overdue · " : ""}
                      {new Date(application.next_action_at).toLocaleDateString(
                        "en-PH",
                        {
                          timeZone: "Asia/Manila",
                        },
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">
                    Salary range
                  </p>
                  <p className="mt-1 font-mono text-sm break-words">
                    <SensitiveValue>
                      {application.salary_min_centavos != null
                        ? formatCentavos(application.salary_min_centavos)
                        : "—"}
                      {application.salary_max_centavos != null
                        ? ` – ${formatCentavos(application.salary_max_centavos)}`
                        : ""}
                    </SensitiveValue>
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {application.job_url ? (
                  <Button asChild variant="secondary">
                    <a
                      href={application.job_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      Job link
                    </a>
                  </Button>
                ) : (
                  <Button variant="secondary" disabled>
                    No job link
                  </Button>
                )}
                <ApplicationEditForm application={application} compact />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; highlight?: string }>;
}) {
  const query = await searchParams;
  const view = query.view === "kanban" ? "kanban" : "table";
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
  const applications = (applicationsResult.data ?? []) as CareerApplication[];
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
      <nav
        aria-label="Breadcrumb"
        className={view === "kanban" ? "mb-4 hidden sm:block" : "mb-4"}
      >
        <ol className="text-muted-foreground flex min-h-11 items-center gap-1 text-sm">
          <li>
            <Link
              href="/dashboard"
              className="hover:text-foreground focus-visible:ring-ring -ml-3 inline-flex min-h-11 items-center rounded-xl px-3 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li>
            <span aria-current="page" className="text-foreground px-2">
              Career
            </span>
          </li>
        </ol>
      </nav>
      <PageHeading
        eyebrow="Opportunity pipeline"
        title="Career"
        description={
          view === "kanban"
            ? "Scan every opportunity, spot what needs attention, and move work forward."
            : "Keep every application tied to a stage, a date, and one clear next action."
        }
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="border-border bg-card flex rounded-xl border p-1">
              <Button
                asChild
                variant={view === "table" ? "default" : "ghost"}
                size="sm"
              >
                <Link href="/career?view=table">Table</Link>
              </Button>
              <Button
                asChild
                variant={view === "kanban" ? "default" : "ghost"}
                size="sm"
              >
                <Link href="/career?view=kanban">Kanban</Link>
              </Button>
            </div>
            <ApplicationCreateDialog />
          </div>
        }
      />
      {view === "table" && conversions.length > 0 && (
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
      {view === "table" && applications.length === 0 ? (
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
        <>
          <ApplicationCards
            applications={applications}
            highlightId={query.highlight}
          />
          <div className="border-border bg-card mt-6 hidden overflow-x-auto rounded-2xl border lg:block">
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
                    <Fragment key={application.id}>
                      <tr
                        key={application.id}
                        id={`application-${application.id}`}
                        className={`border-border border-b last:border-0 ${application.id === query.highlight ? "bg-primary/5 outline-primary/60 outline-2 -outline-offset-2" : ""}`}
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
                          <SensitiveValue>
                            {application.salary_min_centavos != null
                              ? formatCentavos(application.salary_min_centavos)
                              : "—"}
                            {application.salary_max_centavos != null
                              ? ` – ${formatCentavos(application.salary_max_centavos)}`
                              : ""}
                          </SensitiveValue>
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
                      <tr
                        key={`${application.id}-edit`}
                        className="border-border border-b last:border-0"
                      >
                        <td colSpan={5} className="px-4 pb-4">
                          <ApplicationEditForm application={application} />
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <CareerKanban
          applications={applications}
          nowIso={new Date().toISOString()}
        />
      )}
    </div>
  );
}
