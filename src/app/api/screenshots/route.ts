import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const tradeId = formData.get("tradeId") as string;
    const file = formData.get("file") as File;

    if (!tradeId || !file) {
      return NextResponse.json({ success: false, error: "Missing tradeId or file" }, { status: 400 });
    }

    // Verify trade exists
    const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade) {
      return NextResponse.json({ success: false, error: "Trade not found" }, { status: 404 });
    }

    // Save file to disk
    const ext = path.extname(file.name) || ".png";
    const uuid = randomUUID();
    const filename = `${uuid}${ext}`;
    const dirPath = path.join(process.cwd(), "data", "screenshots", tradeId);
    const filePath = path.join(dirPath, filename);
    const relativePath = `data/screenshots/${tradeId}/${filename}`;

    await mkdir(dirPath, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create DB record
    const screenshot = await prisma.tradeScreenshot.create({
      data: {
        tradeId,
        filename: file.name,
        path: relativePath,
      },
    });

    return NextResponse.json({ success: true, screenshot: { id: screenshot.id, filename: screenshot.filename } });
  } catch (error: any) {
    console.error("Screenshot upload failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
