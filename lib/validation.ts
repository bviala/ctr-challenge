export type ConsultationValidationResult =
  | {
      ok: true;
      value: {
        firstName: string;
        lastName: string;
        reason: string;
        scheduledAt: string;
      };
    }
  | { ok: false; error: string };

/**
 * Validates the body of POST /api/consultations.
 *
 * `now` is injectable so the future-date rule can be tested deterministically.
 */
export function validateConsultationInput(
  body: unknown,
  now: number = Date.now(),
): ConsultationValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body" };
  }

  const { first_name, last_name, reason, scheduled_at } = body as Record<
    string,
    unknown
  >;

  if (
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    typeof reason !== "string" ||
    typeof scheduled_at !== "string"
  ) {
    return {
      ok: false,
      error: "first_name, last_name, reason and scheduled_at must be strings",
    };
  }

  const firstName = first_name.trim();
  const lastName = last_name.trim();
  const trimmedReason = reason.trim();

  if (!firstName || !lastName || !trimmedReason) {
    return { ok: false, error: "first_name, last_name and reason are required" };
  }

  if (firstName.length > 100 || lastName.length > 100) {
    return {
      ok: false,
      error: "first_name and last_name must be at most 100 characters",
    };
  }

  if (trimmedReason.length > 2000) {
    return { ok: false, error: "reason must be at most 2000 characters" };
  }

  const scheduledDate = new Date(scheduled_at);
  if (Number.isNaN(scheduledDate.getTime())) {
    return { ok: false, error: "scheduled_at must be a valid date" };
  }

  if (scheduledDate.getTime() <= now) {
    return { ok: false, error: "scheduled_at must be in the future" };
  }

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      reason: trimmedReason,
      scheduledAt: scheduled_at,
    },
  };
}
