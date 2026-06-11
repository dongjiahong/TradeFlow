import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { readFile, unlink } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const screenshot = await prisma.tradeScreenshot.findUnique({ where: { id } });
    if (!screenshot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), screenshot.path);
    const buffer = await readFile(filePath);

    const ext = path.extname(screenshot.filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".bmp": "image/bmp",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Screenshot serve failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const screenshot = await prisma.tradeScreenshot.findUnique({ where: { id } });
    if (!screenshot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), screenshot.path);
      await unlink(filePath);
    } catch {
      // File may already be gone, continue
    }

    // Delete DB record
    await prisma.tradeScreenshot.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Screenshot delete failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
