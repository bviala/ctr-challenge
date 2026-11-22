import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateConsultationInput } from "@/lib/validation";

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
  const result = validateConsultationInput(body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { firstName, lastName, reason, scheduledAt } = result.value;

  const { data, error } = await supabase.rpc("create_consultation", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_reason: reason,
    p_scheduled_at: scheduledAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
