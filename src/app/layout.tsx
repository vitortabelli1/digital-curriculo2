import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eCurrículo Digital — Conquiste mais entrevistas com um currículo profissional",
  description:
    "Crie seu currículo profissional formatado em PDF e conquiste mais entrevistas. Baixe por R$ 19,99 e adicione uma carta de apresentação.",
  manifest: "/manifest.ts",
  appleWebApp: {
    capable: true,
    title: "eCurrículo Digital",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#7f1d1d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
