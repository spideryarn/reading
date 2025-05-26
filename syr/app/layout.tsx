import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
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
  title: "Spideryarn Reading",
  description: "AI-assisted document reading and analysis",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' }
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="fixed top-0 left-0 z-50 p-3">
          <Link 
            href="/" 
            className="block transition-transform duration-200 hover:scale-110 hover:rotate-3"
            aria-label="Return to homepage"
          >
            <Image
              src="/spideryarn-logo.png"
              alt="Spideryarn logo"
              width={28}
              height={28}
              style={{ width: "auto", height: "auto" }}
              className="drop-shadow-sm h-7"
            />
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
