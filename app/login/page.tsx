"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, TextInput } from "@/components/ui";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        if (body?.error?.fields) {
          setFieldErrors(body.error.fields);
        }
        setFormError(body?.error?.message ?? "Something went wrong. Try again.");
        return;
      }

      router.push("/app");
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

        <h1 className="mb-1 text-xl font-bold tracking-tight">Log in</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Welcome back. Enter your details to continue.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
          />

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button type="submit" variant="primary" size="md" loading={loading} className="mt-2">
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
}
