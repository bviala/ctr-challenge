import { AddConsultationDialog } from "@/components/consultations/add-consultation-dialog";

export default function StudentPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Student area</h1>
        <AddConsultationDialog />
      </div>
      <p className="text-muted-foreground">
        Your consultations will appear here.
      </p>
    </div>
  );
}
