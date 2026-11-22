import type { Tables } from "@/lib/database.types";

export type ConsultationStatus = "scheduled" | "completed" | "cancelled";

export type Consultation = Omit<Tables<"consultations">, "status"> & {
  status: ConsultationStatus;
};

export type ConsultationEventType =
  | "created"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "reopened"
  | "status_changed";

export type ConsultationEventActor = { email: string | null } | null;

export type ConsultationEvent = Omit<
  Tables<"consultation_events">,
  "event_type"
> & {
  event_type: ConsultationEventType;
  actor: ConsultationEventActor;
};
