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
