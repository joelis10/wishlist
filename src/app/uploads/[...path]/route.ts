import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const filename = path.basename(parts.join("/"));
  if (!/^[a-zA-Z0-9-]+\.(jpg|webp)$/.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(path.join(config.dataDir, "uploads", filename));
    return new NextResponse(file, {
      headers: {
        "Content-Type": filename.endsWith(".webp") ? "image/webp" : "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
