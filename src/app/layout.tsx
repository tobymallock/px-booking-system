import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PX Group Booking System",
  description: "Booking, invoicing and revenue management for Performance Verbier, Powder Extreme and Vivid.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
