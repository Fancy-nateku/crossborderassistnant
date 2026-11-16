import type { ReactNode } from "react";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteHeader } from "@/components/site/site-header";
import { Container, PageShell } from "@/components/ui/container";

/**
 * Sign-in and register screens: one card, centred in the space under the header.
 * Flat by design (CLAUDE.md: no shadows) - the 1 px border and white panel lift it
 * off the page background.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center">
        <Container width="narrow" className="py-8 md:py-12">
          <div className="mx-auto w-full max-w-md rounded-control border border-line bg-panel p-6 md:p-8">
            {children}
          </div>
        </Container>
      </main>
      <BottomNav />
    </PageShell>
  );
}
