// Consultation details route: a thin shell; the client component fetches
// the consultation and its audit history through the API.
import { Suspense } from "react";

import { ConsultationDetails } from "@/components/consultations/consultation-details";
import { Spinner } from "@/components/ui/spinner";

async function ConsultationPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ConsultationDetails id={id} />;
}

export default function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading consultation…
        </div>
      }
    >
      <ConsultationPageContent params={params} />
    </Suspense>
  );
}
