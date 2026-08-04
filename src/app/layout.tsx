import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import PWARegistration from "@/components/feature/PWARegistration";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import ThemeProvider from "@/components/theme/ThemeProvider";
import AppShell from "@/components/app-shell/AppShell";
import LegacyLocaleMigrator from "@/components/i18n/LegacyLocaleMigrator";

export const metadata: Metadata = {
  title: "DeepListener",
  description: "Master English listening through atomic decoding.",
  manifest: "/manifest.json",
  // apple-touch-icon is emitted by Next when an icon entry is tagged
  // "apple". Without it, iOS home-screen installs fall back to an ugly
  // screenshot, which undercuts the PWA story. We reuse the 192px icon
  // (iOS scales it to 180px on the home screen) rather than ship a
  // dedicated asset that does not exist yet.
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DeepListener",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <TimeTrackingProvider>
              <AppShell>{children}</AppShell>
              <Toaster position="top-center" />
              <PWARegistration />
              <LegacyLocaleMigrator />
            </TimeTrackingProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
