import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex — JEE Practice",
  description: "AI-guided hints, weekly mocks ranked all-India, and the cleanest practice loop for JEE Mains & Advanced.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
