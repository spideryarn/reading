'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFooter = pathname === '/design';
  
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4">
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
      {showFooter && <Footer />}
    </>
  );
}