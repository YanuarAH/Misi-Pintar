import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Misi Pintar — Belajar Seru, Selesaikan Misi!",
    template: "%s · Misi Pintar",
  },
  description:
    "Misi Pintar membantu siswa kelas 5–6 SD belajar Matematika lewat misi, simulasi, dan kuis interaktif dengan umpan balik langsung.",
  applicationName: "Misi Pintar",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Lompat ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
