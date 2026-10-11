"use client";

import type { Factor } from "@supabase/supabase-js";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function MfaChallengeForm({ destination }: { destination: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [factor, setFactor] = useState<Factor | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void supabase.auth.mfa.listFactors().then((result) => {
      const verified = result.data?.totp[0] ?? null;
      setFactor(verified);
      if (result.error || !verified) {
        setError("No verified authenticator is available for this account.");
      }
    });
  }, [supabase]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          if (!factor || !/^\d{6}$/.test(code)) {
            setError("Enter the current 6-digit authenticator code.");
            return;
          }
          setError("");
          const challenge = await supabase.auth.mfa.challenge({
            factorId: factor.id,
          });
          if (challenge.error) {
            setError("The sign-in challenge could not be created.");
            return;
          }
          const verification = await supabase.auth.mfa.verify({
            factorId: factor.id,
            challengeId: challenge.data.id,
            code,
          });
          if (verification.error) {
            setError(
              "That code was not accepted. Wait for a new code and retry.",
            );
            return;
          }
          router.replace(destination as never);
          router.refresh();
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <label htmlFor="mfa-code" className="text-sm font-medium">
          Authenticator code
        </label>
        <Input
          id="mfa-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          autoFocus
          required
          aria-describedby="mfa-code-help"
        />
        <p id="mfa-code-help" className="text-muted-foreground text-xs">
          Open your authenticator app and enter the 6-digit code for ATLAS.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm leading-5">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={!factor}
        pending={pending}
        pendingLabel="Verifying…"
      >
        Verify and continue
      </Button>
    </form>
  );
}
