import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { KioskProvider } from "@/app/kiosk/KioskContext";
import { AppLayout } from "@/components/AppLayout";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "CKB Tracker",
  description: "Martial Arts Attendance Tracking System",
  manifest: "/manifest.webmanifest",
  applicationName: "CKB Tracker",
  appleWebApp: {
    capable: true,
    title: "CKB Tracker",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: "/icon-192.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased font-sans">
        <ThemeProvider>
          <AuthProvider>
            <KioskProvider>
              <ServiceWorkerRegistration />
              <NetworkStatusBanner />
              <AppLayout>{children}</AppLayout>
            </KioskProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
