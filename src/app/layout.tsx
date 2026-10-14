import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const sans = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const SITE_URL = "https://osscity.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OSS City",
    template: "%s | OSS City",
  },
  description:
    "Every open source project from Google Summer of Code organisations, built as a city. Lit windows reply to newcomers fast.",
  applicationName: "OSS City",
  openGraph: {
    type: "website",
    siteName: "OSS City",
    url: SITE_URL,
    title: "OSS City",
    description:
      "Every open source project from Google Summer of Code organisations, built as a city. Lit windows reply to newcomers fast.",
  },
  twitter: {
    card: "summary_large_image",
    title: "OSS City",
    description:
      "Every open source project from Google Summer of Code organisations, built as a city. Lit windows reply to newcomers fast.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
