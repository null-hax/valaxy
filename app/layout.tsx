import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "VALAXY: BLOODLUST ARCADE",
  description: "Enter the Valaxy! Blast through waves of relentless enemies in a pixel-perfect retro nightmare!",
  keywords: ["arcade", "retro", "game", "galaga", "8-bit", "bloodlust", "pixel", "horror"],
  authors: [{ name: "West Coast AI Labs" }],
  openGraph: {
    title: "VALAXY: BLOODLUST ARCADE",
    description: "Enter the Valaxy! Blast through waves of relentless enemies in a pixel-perfect retro nightmare!",
    images: ['/valaxy-preview.png', '/blooddrop-meta.svg'],
    type: 'website',
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
        {/* Add Google Fonts for arcade typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        
        {/* Favicon */}
        <link rel="icon" href="/blooddrop.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/blooddrop.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
