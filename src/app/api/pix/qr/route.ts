import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const payload = req.nextUrl.searchParams.get("payload");
  if (!payload) {
    return NextResponse.json({ message: "payload ausente" }, { status: 400 });
  }

  try {
    const svg = await QRCode.toString(payload, {
      type: "svg",
      margin: 1,
      width: 256,
    });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  } catch {
    return NextResponse.json({ message: "Falha ao gerar QR Code." }, { status: 500 });
  }
}
