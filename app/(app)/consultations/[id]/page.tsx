import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/consultations/back-button";
import { ConsultationDetails } from "@/components/consultations/consultation-details";
import { ConsultationDetailsSkeleton } from "@/components/consultations/consultation-details-skeleton";
import type {
  Consultation,
  ConsultationEvent,
} from "@/components/consultations/types";

async function ConsultationPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // A server component can't use a relative URL, so derive the origin from the
  // incoming request and forward the cookies so the API route sees the session.
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const baseUrl = host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const cookie = requestHeaders.get("cookie") ?? "";

  const [consultationResponse, historyResponse] = await Promise.all([
    fetch(`${baseUrl}/api/consultations/${id}`, {
      headers: { cookie },
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/consultations/${id}/history`, {
      headers: { cookie },
      cache: "no-store",
    }),
  ]);

  if (consultationResponse.status === 404) {
    notFound();
  }

  if (consultationResponse.status === 401) {
    redirect("/auth/login");
  }

  if (!consultationResponse.ok || !historyResponse.ok) {
    return (
      <p className="text-sm text-destructive">
        Could not load the consultation.
      </p>
    );
  }

  const consultation = (await consultationResponse.json()) as Consultation;
  const events = (await historyResponse.json()) as ConsultationEvent[];

  return <ConsultationDetails consultation={consultation} events={events} />;
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
