"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Lisbon",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

function listTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return FALLBACK_TIMEZONES;
  }
}

interface OnboardingFormProps {
  defaultTimezone: string;
}

export function OnboardingForm({ defaultTimezone }: OnboardingFormProps) {
  const router = useRouter();
  const timezoneOptions = useMemo(
    () => listTimezones().map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") })),
    [],
  );
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultTimezone: timezone }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "Something went wrong. Try again.");
        return;
      }

      router.push("/app/accounts");
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

        <h1 className="mb-1 text-xl font-bold tracking-tight">Set your timezone</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          We&apos;ll use this to schedule posts and show recommended times correctly.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Select
            label="Workspace timezone"
            value={timezone}
            onChange={setTimezone}
            options={timezoneOptions}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="primary" size="md" loading={loading} className="mt-2">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
