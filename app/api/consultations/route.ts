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

  if (!first_name || !last_name || !reason || !scheduled_at) {
    return NextResponse.json(
      { error: "first_name, last_name, reason and scheduled_at are required" },
      { status: 400 },
    );
  }

  if (new Date(scheduled_at) <= new Date()) {
    return NextResponse.json(
      { error: "scheduled_at must be in the future" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      student_id: user.id,
      first_name,
      last_name,
      reason,
      scheduled_at,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
