import { ConsultationList } from "@/components/consultations/consultation-list";

export default function AdminPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Admin area</h1>
      <ConsultationList />
    </div>
  );
}
