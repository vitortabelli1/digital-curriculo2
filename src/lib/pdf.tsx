"use client";

import { pdf } from "@react-pdf/renderer";
import { ResumePdf } from "@/components/resume/ResumePdf";
import type { ResumeData } from "./types";

export async function generatePdfBlob(data: ResumeData): Promise<Blob> {
  const instance = pdf(<ResumePdf data={data} />);
  return await instance.toBlob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string, suffix?: string) {
  const slug = (raw: string) =>
    raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const base = `curriculo-${slug(name) || "sem-nome"}`;
  const extra = suffix ? slug(suffix) : "";
  return extra ? `${base}-${extra}.pdf` : `${base}.pdf`;
}