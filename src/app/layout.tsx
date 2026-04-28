import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { RegisterSW } from "@/components/pwa/register-sw";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Asesoria Empresarial Juan Garcia S.L.",
    template: "%s | Asesoria Juan Garcia",
  },
  description:
    "Plataforma segura para clientes de Asesoria Empresarial Juan Garcia S.L.: gestion documental cifrada, comunicacion directa con tu asesor y cumplimiento RGPD.",
  applicationName: "Asesoria Juan Garcia",
  authors: [{ name: "Asesoria Empresarial Juan Garcia S.L." }],
  generator: "Next.js",
  keywords: ["asesoria", "fiscal", "RGPD", "Espana", "documentos cifrados"],
  robots: { index: false, follow: false }, // privada hasta lanzamiento
  formatDetection: { telephone: false, email: false, address: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Juan Garcia",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F2A47" },
    { media: "(prefers-color-scheme: dark)", color: "#0F2A47" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <CookieBanner />
        <RegisterSW />
      </body>
    </html>
  );
}
