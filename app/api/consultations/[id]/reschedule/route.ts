import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/consultations/:id/reschedule
 * Body: { scheduled_at: string, note?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body?.scheduled_at) {
    return NextResponse.json(
      { error: "scheduled_at is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("reschedule_consultation", {
    p_consultation_id: id,
    p_scheduled_at: body.scheduled_at,
    p_note: body?.note ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
