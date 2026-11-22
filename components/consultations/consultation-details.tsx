import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "./status-badge";
import type { Consultation, ConsultationEvent } from "./types";

const EVENT_LABELS: Record<ConsultationEvent["event_type"], string> = {
  created: "Created",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  completed: "Completed",
  reopened: "Reopened",
  status_changed: "Status changed",
};

export function ConsultationDetails({
  consultation,
  events,
}: {
  consultation: Consultation;
  events: ConsultationEvent[];
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">
                {consultation.first_name} {consultation.last_name}
              </CardTitle>
              <CardDescription>
                {formatDateTime(consultation.scheduled_at)}
              </CardDescription>
            </div>
            <StatusBadge status={consultation.status} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">When</dt>
              <dd className="text-sm">
                {formatDateTime(consultation.scheduled_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="text-sm capitalize">{consultation.status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Reason</dt>
              <dd className="text-sm whitespace-pre-wrap">
                {consultation.reason}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Created</dt>
              <dd className="text-sm">
                {formatDateTime(consultation.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Last updated</dt>
              <dd className="text-sm">
                {formatDateTime(consultation.updated_at)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            Every change recorded for this consultation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No events recorded yet.
            </p>
          ) : (
            <ol className="flex flex-col gap-4">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-border pl-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </span>
                  </div>

                  {event.event_type === "rescheduled" &&
                    event.old_scheduled_at &&
                    event.new_scheduled_at && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(event.old_scheduled_at)} →{" "}
                        {formatDateTime(event.new_scheduled_at)}
                      </p>
                    )}

                  {event.event_type !== "rescheduled" &&
                    event.old_status &&
                    event.new_status && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.old_status} → {event.new_status}
                      </p>
                    )}

                  {event.note && <p className="mt-1 text-sm">{event.note}</p>}

                  {event.actor?.email && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      by {event.actor.email}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  );
}
