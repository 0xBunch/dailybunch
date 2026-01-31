import type { Metadata } from "next";
import "./globals.css";
import { OrganizationSchema, WebSiteSchema } from "@/components/schema/SchemaOrg";

export const metadata: Metadata = {
  title: "Daily Bunch",
  description: "Cultural signal intelligence - track link velocity across newsletters and feeds",
  openGraph: {
    title: "Daily Bunch",
    description: "What are tastemakers collectively pointing at right now?",
    url: "https://dailybunch.com",
    siteName: "Daily Bunch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Bunch",
    description: "What are tastemakers collectively pointing at right now?",
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Special+Gothic+Condensed+One&family=Special+Gothic+Expanded+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <OrganizationSchema />
        <WebSiteSchema />
        {children}
      </body>
    </html>
  );
}
