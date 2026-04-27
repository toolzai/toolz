import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavigationDock from "@/components/NavigationDock";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://toolzai.co.in"),
  title: {
    default: "Toolz | Ultimate Free AI & Creator Tools Platform",
    template: "%s | Toolz",
  },
  description: "Toolz offers a powerful suite of free, browser-based tools for creators. Upscale images, remove objects, generate box-shadows, apply VHS and CRT filters, and more instantly without installation.",
  keywords: [
    "toolz",
    "creator tools",
    "image upscaler",
    "image resizer",
    "object eraser",
    "vhs filter",
    "crt filter",
    "box shadow generator",
    "ascii art generator",
    "ai roast engine",
    "free online tools",
    "design utilities"
  ],
  authors: [{ name: "Toolz" }],
  creator: "Toolz",
  publisher: "Toolz",
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
  icons: {
    icon: "/logo.ico",
  },
  alternates: {
    canonical: "https://toolzai.co.in",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://toolzai.co.in",
    title: "Toolz | Ultimate Free AI & Creator Tools Platform",
    description: "Toolz offers a powerful suite of free, browser-based tools for creators. Upscale images, remove objects, generate box-shadows, apply VHS and CRT filters, and more instantly.",
    siteName: "Toolz",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Toolz - AI & Creator Tools Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Toolz | Ultimate Free AI & Creator Tools Platform",
    description: "Toolz offers a powerful suite of free, browser-based tools for creators. Upscale images, remove objects, generate box-shadows, apply VHS and CRT filters, and more instantly.",
    images: ["/og-image.jpg"],
    creator: "@toolz",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <NavigationDock />
      </body>
    </html>
  );
}
