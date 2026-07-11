"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, TextInput } from "@/components/ui";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (body?.error?.fields) {
          setFieldErrors(body.error.fields);
        }
        setFormError(body?.error?.message ?? "Something went wrong. Try again.");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="h-7 w-7 shrink-0 rounded-md bg-primary" aria-hidden />
          <span className="text-base font-bold tracking-tight">PostPilot</span>
        </div>

        <h1 className="mb-1 text-xl font-bold tracking-tight">Create your account</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Start scheduling and optimizing your posts in minutes.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextInput
            label="Name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={fieldErrors.name}
          />
          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
          />
          <TextInput
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
          />

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" variant="primary" size="md" loading={loading} className="mt-2">
            Sign up
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
