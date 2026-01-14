import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Daily Bunch - Curated Links, Delivered Daily",
    template: "%s | Daily Bunch",
  },
  description:
    "Your daily dose of curated links from across the web. The best of tech, business, and culture - powered by AI, curated by humans.",
  keywords: ["news", "links", "curation", "newsletter", "tech", "ai"],
  authors: [{ name: "Daily Bunch" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Daily Bunch",
    title: "Daily Bunch - Curated Links, Delivered Daily",
    description:
      "Your daily dose of curated links from across the web. The best of tech, business, and culture.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Bunch",
    description: "Curated links, delivered daily",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
