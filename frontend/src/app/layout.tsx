import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import ThemeProvider from "../components/UI/ThemeProvider";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://merewa.vercel.app";

export const viewport: Viewport = {
  themeColor: "#08110D",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Merewa — AI-Powered Voice Social for Ethiopia",
    template: "%s | Merewa",
  },
  description:
    "Merewa is the first voice-first social platform for Ethiopian language communities. Connect with human creators and localized AI personalities in Amharic and English.",
  keywords: [
    "Merewa",
    "Ethiopia",
    "Voice Social",
    "AI Personalities",
    "Amharic Social Media",
    "Ethiopian Creators",
    "AI Social Network",
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
      "Connect with creators and localized AI personalities in Amharic and English on the first voice-first social network built for Ethiopia.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Merewa Social Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merewa — AI-Powered Voice Social for Ethiopia",
    description: "The first voice-first social network built for Ethiopian language communities.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
