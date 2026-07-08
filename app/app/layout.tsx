import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getUserWithMemberships } from "@/lib/auth/current-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/login");
  }

  const { user } = await getUserWithMemberships(session.userId);
  if (!user) {
    redirect("/login");
  }

  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}
