import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getUserWithMemberships } from "@/lib/auth/current-user";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const session = verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value);
  if (session) {
    const { user } = await getUserWithMemberships(session.userId);
    if (user) {
      redirect("/app");
    }
  }

  return <SignupForm />;
}
