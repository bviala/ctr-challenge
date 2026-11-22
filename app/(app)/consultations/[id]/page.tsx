import { Suspense } from "react";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/consultations/back-button";
import { ConsultationDetails } from "@/components/consultations/consultation-details";
import { ConsultationDetailsSkeleton } from "@/components/consultations/consultation-details-skeleton";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ConsultationPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The id is interpolated into the API path; reject non-UUIDs so it cannot be
  // used for path traversal within the app.
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  return <ConsultationDetails id={id} />;
}

export default function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <div>
        <BackButton />
      </div>

      <Suspense fallback={<ConsultationDetailsSkeleton />}>
        <ConsultationPageContent params={params} />
      </Suspense>
    </div>
  );
}
