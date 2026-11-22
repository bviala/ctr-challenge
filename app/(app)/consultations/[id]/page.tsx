import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { BackButton } from "@/components/consultations/back-button";
import { ConsultationDetails } from "@/components/consultations/consultation-details";
import { ConsultationDetailsSkeleton } from "@/components/consultations/consultation-details-skeleton";
import type {
  Consultation,
  ConsultationEvent,
} from "@/components/consultations/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Trusted origin for the server-side call to our own API routes.
 *
 * Never derive this from the request (Host / X-Forwarded-Host): a forged
 * header would make the server issue a request to an attacker-controlled
 * host and forward the user's session cookie to it (SSRF + credential leak).
 */
function appBaseUrl() {
  const url =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return url.replace(/\/+$/, "");
}

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

  const baseUrl = appBaseUrl();
  const cookie = (await headers()).get("cookie") ?? "";

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
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Could not load the consultation</AlertTitle>
        <AlertDescription>
          Something went wrong while loading this consultation. Please try
          again in a moment.
        </AlertDescription>
      </Alert>
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
