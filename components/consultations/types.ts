export type ConsultationStatus = "scheduled" | "completed" | "cancelled";

export type Consultation = {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  reason: string;
  scheduled_at: string;
  status: ConsultationStatus;
  created_at: string;
  updated_at: string;
};

export type ConsultationEventType =
  | "created"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "reopened"
  | "status_changed";

export type ConsultationEventActor = { email: string | null } | null;

export type ConsultationEvent = {
  id: number;
  consultation_id: string;
  event_type: ConsultationEventType;
  actor_id: string | null;
  actor: ConsultationEventActor;
  old_scheduled_at: string | null;
  new_scheduled_at: string | null;
  old_status: ConsultationStatus | null;
  new_status: ConsultationStatus | null;
  note: string | null;
  created_at: string;
};
