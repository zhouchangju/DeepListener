import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import PWARegistration from "@/components/feature/PWARegistration";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import ThemeProvider from "@/components/theme/ThemeProvider";
import ThemeToggle from "@/components/theme/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DeepListener",
  description: "Master English listening through atomic decoding.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DeepListener",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <TimeTrackingProvider>
            <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
              <div className="container mx-auto flex h-16 items-center justify-between gap-4 overflow-hidden px-4">
                <Link href="/" className="mr-2 shrink-0 text-xl font-bold text-indigo-600 transition-colors dark:text-indigo-300">
                  DeepListener
                </Link>
                <div className="flex h-full min-w-0 flex-1 items-center justify-end gap-2">
                  <div className="no-scrollbar flex h-full items-center gap-3 overflow-x-auto text-sm font-medium text-muted-foreground md:gap-6">
                    <Link href="/library" className="whitespace-nowrap transition-colors hover:text-foreground">Library</Link>
                    <Link href="/vault" className="whitespace-nowrap transition-colors hover:text-foreground">Vault</Link>
                    <Link href="/dashboard" className="whitespace-nowrap transition-colors hover:text-foreground">Analytics</Link>
                    <Link href="/review" className="whitespace-nowrap transition-colors hover:text-foreground">Review</Link>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </nav>
            <main className="min-h-[calc(100vh-64px)] bg-muted/30">
              {children}
            </main>
            <Toaster position="top-center" />
            <PWARegistration />
          </TimeTrackingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
