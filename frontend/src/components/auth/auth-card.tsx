import type { ReactNode } from "react";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteHeader } from "@/components/site/site-header";
import { Container, PageShell } from "@/components/ui/container";

/**
 * Sign-in and register screens: one card, centred in the space under the header.
 * The page background (#FAFAF9) and the white panel are nearly the same, so the card
 * gets the stronger border and a soft shadow to read as a floating card. CLAUDE.md
 * says "no shadows" elsewhere; this is the one deliberate exception, asked for by the team.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center">
        <Container width="narrow" className="py-8 md:py-12">
          <div className="mx-auto w-full max-w-md rounded-control border border-line-strong bg-panel p-6 shadow-[0_8px_30px_rgba(0,0,0,0.10)] md:p-8">
            {children}
          </div>
        </Container>
      </main>
      <BottomNav />
    </PageShell>
  );
}
