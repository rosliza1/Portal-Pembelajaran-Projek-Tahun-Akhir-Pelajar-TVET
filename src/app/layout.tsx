import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portal FYP TVET — JTM | Elektrik Kuasa & RAC",
  description:
    "Portal Pembelajaran Projek Tahun Akhir Pelajar TVET (Bidang Elektrik Kuasa & RAC) — Jabatan Tenaga Manusia (JTM), Kementerian Sumber Manusia.",
  keywords: [
    "JTM", "TVET", "FYP", "Elektrik Kuasa", "RAC", "Portal Pembelajaran",
    "Jabatan Tenaga Manusia", "Malaysia", "Glassmorphism",
  ],
  authors: [{ name: "Jabatan Tenaga Manusia (JTM)" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors />
        {/* Jotform AI Agent chatbot — embedded per user request */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var s = document.createElement('script');
                s.src = 'https://cdn.jotfor.ms/agent/embedjs/019f5ff80e807000820311484e85a1937b00/embed.js';
                s.async = true;
                document.head.appendChild(s);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
