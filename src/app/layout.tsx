import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import PWARegistration from "@/components/feature/PWARegistration";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";

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
      <body className={inter.className} suppressHydrationWarning>
        <TimeTrackingProvider>
          <nav className="border-b bg-white sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between overflow-hidden">
              <Link href="/" className="text-xl font-bold text-indigo-600 shrink-0 mr-4">
                DeepListener
              </Link>
              <div className="flex gap-3 md:gap-6 text-sm font-medium overflow-x-auto no-scrollbar items-center h-full">
                <Link href="/library" className="hover:text-indigo-600 whitespace-nowrap">Library</Link>
                <Link href="/vault" className="hover:text-indigo-600 whitespace-nowrap">Vault</Link>
                <Link href="/dashboard" className="hover:text-indigo-600 whitespace-nowrap">Analytics</Link>
                <Link href="/review" className="hover:text-indigo-600 whitespace-nowrap pr-4">Review</Link>
              </div>
            </div>
          </nav>
          <main className="min-h-[calc(100vh-64px)] bg-gray-50/50">
            {children}
          </main>
          <Toaster position="top-center" />
          <PWARegistration />
        </TimeTrackingProvider>
      </body>
    </html>
  );
}