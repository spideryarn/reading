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
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link 
                href="/" 
                className="flex items-center space-x-2 transition-transform duration-200 hover:scale-105"
                aria-label="Return to homepage"
              >
                <Image
                  src="/spideryarn-logo.png"
                  alt="Spideryarn logo"
                  width={32}
                  height={32}
                  style={{ width: "auto", height: "auto" }}
                  className="drop-shadow-md h-8 w-8"
                />
                <span className="text-xl font-semibold text-spideryarn-orange font-trebuchet">Spideryarn</span>
              </Link>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
