import type { Metadata, Viewport } from "next";
import { getViewer } from "@/lib/auth";
import { config } from "@/lib/env";
import { getPreferredTheme } from "@/lib/theme";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: "Wishlist",
    template: "%s · Wishlist",
  },
  description: "A quiet place for the things you would love.",
  applicationName: "Wishlist",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Wishlist",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "Wishlist",
    title: "Wishlist",
    description: "A quiet place for the things you would love.",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#171412" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const theme = await getPreferredTheme(viewer);

  return (
    <html lang="en" data-theme={theme === "system" ? undefined : theme}>
      <body>
        <SiteHeader />
        <main className="min-h-[calc(100dvh-4rem)]">{children}</main>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
