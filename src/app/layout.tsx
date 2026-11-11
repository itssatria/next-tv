import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXT TV",
  description:
    "Live channels, fixtures and highlights, laid out for the big screen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
