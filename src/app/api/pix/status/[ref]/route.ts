import { NextResponse } from "next/server";
import { isPixPaid } from "@/lib/pix-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  return NextResponse.json({ paid: isPixPaid(ref) });
}
