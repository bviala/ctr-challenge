import { Badge } from "@/components/ui/badge";
import type { Consultation } from "./types";

export function StatusBadge({ status }: { status: Consultation["status"] }) {
  if (status === "completed") {
    return <Badge>Completed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }
  return <Badge variant="secondary">Scheduled</Badge>;
}
