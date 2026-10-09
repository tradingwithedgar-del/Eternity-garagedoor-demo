import { AppShell } from "@/components/AppShell";
import { CreditsProvider } from "@/components/Credits";
import { getUser } from "@/lib/auth";
import { isMock } from "@/lib/provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  // Pages redirect to /login themselves (they know their own path for ?next=).
  if (!user) return children;
  return (
    <CreditsProvider initial={user.credits}>
      <AppShell name={user.name} email={user.email} mock={isMock()}>
        {children}
      </AppShell>
    </CreditsProvider>
  );
}
