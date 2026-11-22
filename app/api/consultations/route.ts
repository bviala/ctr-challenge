import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/consultations
 * RLS scopes the result: students get their own, admins get all.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("consultations")
    .select("*")
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/consultations
 * Creates a consultation owned by the caller.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { first_name, last_name, reason, scheduled_at } = body;

  if (
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    typeof reason !== "string" ||
    typeof scheduled_at !== "string"
  ) {
    return NextResponse.json(
      {
        error:
          "first_name, last_name, reason and scheduled_at must be strings",
      },
      { status: 400 },
    );
  }

  const firstName = first_name.trim();
  const lastName = last_name.trim();
  const trimmedReason = reason.trim();

  if (!firstName || !lastName || !trimmedReason) {
    return NextResponse.json(
      { error: "first_name, last_name and reason are required" },
      { status: 400 },
    );
  }

  if (firstName.length > 100 || lastName.length > 100) {
    return NextResponse.json(
      { error: "first_name and last_name must be at most 100 characters" },
      { status: 400 },
    );
  }

  if (trimmedReason.length > 2000) {
    return NextResponse.json(
      { error: "reason must be at most 2000 characters" },
      { status: 400 },
    );
  }

  const scheduledDate = new Date(scheduled_at);
  if (Number.isNaN(scheduledDate.getTime())) {
    return NextResponse.json(
      { error: "scheduled_at must be a valid date" },
      { status: 400 },
    );
  }

  if (scheduledDate.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "scheduled_at must be in the future" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("create_consultation", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_reason: trimmedReason,
    p_scheduled_at: scheduled_at,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
