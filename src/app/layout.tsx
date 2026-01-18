import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Bunch",
  description: "Cultural signal intelligence - track link velocity across newsletters and feeds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
