"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ServiceWorkerUpdater } from "@/components/ServiceWorkerUpdater";
import { AdPlacementRenderer } from "@/components/AdPlacementRenderer";
import { GlobalAdScripts } from "@/components/GlobalAdScripts";
import { Suspense } from "react";

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin =
    pathname?.startsWith("/admin") || pathname?.startsWith("/nhanconan");
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <GlobalAdScripts />
      <Suspense fallback={<div className="h-16 w-full" />}>
        <Navbar />
      </Suspense>
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <AdPlacementRenderer position="header" />
        </div>
        {children}
        <div className="container mx-auto px-4">
          <AdPlacementRenderer position="footer" />
        </div>
      </div>
      <ScrollToTop />
      <Footer />
      <ServiceWorkerUpdater />
    </>
  );
}
