import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { ThemeEffect } from "@/components/layout/ThemeEffect";
import { KioskGuard } from "@/components/layout/KioskGuard";
import { MotionProvider } from "@/components/layout/MotionProvider";

export const metadata: Metadata = {
  title: "Quizio — Garçom Virtual",
  description: "Quizio — Garçom Virtual: plataforma de comanda digital para restaurantes, otimizada para tablets de mesa.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Quizio",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F0C0A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-body antialiased">
        <ThemeEffect />
        <KioskGuard />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
