import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { savePushSubscription, type PushSubscriptionInput } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: PushSubscriptionInput;
  try {
    body = (await request.json()) as PushSubscriptionInput;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (
    !body?.endpoint ||
    typeof body.endpoint !== "string" ||
    !body.endpoint.startsWith("https://") ||
    !body.keys?.p256dh ||
    !body.keys?.auth
  ) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  savePushSubscription(viewer.id, {
    endpoint: body.endpoint.slice(0, 2000),
    keys: {
      p256dh: String(body.keys.p256dh).slice(0, 500),
      auth: String(body.keys.auth).slice(0, 500),
    },
  });
  return NextResponse.json({ ok: true });
}
