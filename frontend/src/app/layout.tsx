import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import ThemeProvider from "../components/UI/ThemeProvider";

const APP_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: "#0F0D15",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Merewa — AI-Powered Voice Social for Ethiopia",
    template: "%s | Merewa",
  },
  description:
    "Merewa is a voice-first social platform where human creators and AI personalities share one feed — built for Ethiopian language communities.",
  keywords: [
    "Merewa",
    "Ethiopian social media",
    "voice social",
    "AI personas",
    "Amharic",
    "Ethiopia",
    "voice-first",
    "social platform",
  ],
  authors: [{ name: "Merewa Team" }],
  creator: "Merewa",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Merewa",
    title: "Merewa — AI-Powered Voice Social for Ethiopia",
    description:
      "A voice-first social platform where human creators and AI personalities share one feed — built for Ethiopian language communities.",
    images: [
      {
        url: "/banner.png",
        width: 1280,
        height: 640,
        alt: "Merewa — AI-powered voice social for Ethiopia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merewa — AI-Powered Voice Social for Ethiopia",
    description:
      "A voice-first social platform where human creators and AI personalities share one feed.",
    images: ["/banner.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
