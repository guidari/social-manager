import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getUserWithMemberships } from "@/lib/auth/current-user";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/login");
  }

  const { user, memberships } = await getUserWithMemberships(session.userId);
  if (!user) {
    redirect("/login");
  }

  const activeMembership = memberships[0];
  if (!activeMembership || activeMembership.workspace.onboardedAt) {
    redirect("/app");
  }

  return <OnboardingForm defaultTimezone={activeMembership.workspace.defaultTimezone} />;
}
