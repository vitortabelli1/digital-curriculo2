import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "eCurrículo Digital — Gerador de Currículos",
    short_name: "eCurrículo Digital",
    description:
      "Gere seu currículo profissional em PDF com IA e baixe por R$ 19,99.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}