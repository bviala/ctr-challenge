"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
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

export function ConsultationDetails({ id }: { id: string }) {
  const router = useRouter();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [events, setEvents] = useState<ConsultationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [consultationRes, historyRes] = await Promise.all([
        fetch(`/api/consultations/${id}`),
        fetch(`/api/consultations/${id}/history`),
      ]);

      const [consultationJson, historyJson] = await Promise.all([
        consultationRes.json().catch(() => null),
        historyRes.json().catch(() => null),
      ]);

      if (!consultationRes.ok) {
        throw new Error(
          consultationJson?.error ?? "Could not load the consultation.",
        );
      }
      if (!historyRes.ok) {
        throw new Error(
          historyJson?.error ?? "Could not load the consultation history.",
        );
      }

      setConsultation(consultationJson as Consultation);
      setEvents((historyJson ?? []) as ConsultationEvent[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the consultation.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading consultation…
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : consultation ? (
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
                  <dt className="text-sm text-muted-foreground">
                    Last updated
                  </dt>
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
                    <li
                      key={event.id}
                      className="border-l-2 border-border pl-4"
                    >
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

                      {event.note && (
                        <p className="mt-1 text-sm">{event.note}</p>
                      )}

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
      ) : null}
    </div>
  );
}
