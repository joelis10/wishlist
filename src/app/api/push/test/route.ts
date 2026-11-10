import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!checkRateLimit(`push-test:${viewer.id}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "Too many test notifications." }, { status: 429 });
  }

  const sent = await sendPushToUser(viewer.id, {
    title: "Wishlist notifications are on",
    body: "This is what a notification will look like.",
    url: "/settings",
  });

  if (sent === 0) {
    return NextResponse.json(
      { error: "No active notification subscription was found." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, sent });
}
