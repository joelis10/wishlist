import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { removePushSubscription } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: { endpoint?: string } = {};
  try {
    body = (await request.json()) as { endpoint?: string };
  } catch {
    // Allow a full opt-out with no body.
  }

  removePushSubscription(
    viewer.id,
    typeof body.endpoint === "string" ? body.endpoint.slice(0, 2000) : undefined,
  );
  return NextResponse.json({ ok: true });
}
