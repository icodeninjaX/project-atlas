"use client";

import type { Factor } from "@supabase/supabase-js";
import Image from "next/image";
import { KeyRound, ShieldCheck, ShieldPlus, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormFeedback,
  StatusChip,
} from "@/components/settings/settings-chrome";
import { createClient } from "@/lib/supabase/client";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type PendingAction = "begin" | "cancel" | "verify" | "remove";

export function MfaSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [removalCode, setRemovalCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>("begin");
  const [pending, startTransition] = useTransition();

  const loadFactors = useCallback(async () => {
    const result = await supabase.auth.mfa.listFactors();
    if (result.error) {
      setError("Authenticator settings could not be loaded.");
      return;
    }
    setFactors(result.data.all);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => void loadFactors());
  }, [loadFactors]);

  const verifiedFactor = factors.find(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  );

  const beginEnrollment = () => {
    setPendingAction("begin");
    startTransition(async () => {
      setError("");
      setMessage("");
      const result = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "ATLAS authenticator",
        issuer: "ATLAS",
      });
      if (result.error) {
        setError("Authenticator enrollment could not be started.");
        return;
      }
      const qrCode = result.data.totp.qr_code.startsWith("data:")
        ? result.data.totp.qr_code
        : `data:image/svg+xml;utf-8,${encodeURIComponent(result.data.totp.qr_code)}`;
      setEnrollment({
        factorId: result.data.id,
        qrCode,
        secret: result.data.totp.secret,
      });
      await loadFactors();
    });
  };

  const cancelEnrollment = () => {
    setPendingAction("cancel");
    startTransition(async () => {
      if (enrollment) {
        await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
      }
      setEnrollment(null);
      setEnrollmentCode("");
      await loadFactors();
    });
  };

  const verifyEnrollment = () => {
    setPendingAction("verify");
    startTransition(async () => {
      if (!enrollment || !/^\d{6}$/.test(enrollmentCode)) {
        setError("Enter the 6-digit code from your authenticator app.");
        return;
      }
      setError("");
      const challenge = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });
      if (challenge.error) {
        setError("The authenticator challenge could not be created.");
        return;
      }
      const verification = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.data.id,
        code: enrollmentCode,
      });
      if (verification.error) {
        setError("That code was not accepted. Wait for a new code and retry.");
        return;
      }
      setEnrollment(null);
      setEnrollmentCode("");
      setMessage("Authenticator protection is now enabled.");
      await loadFactors();
    });
  };

  const removeFactor = () => {
    setPendingAction("remove");
    startTransition(async () => {
      if (!verifiedFactor) return;
      if (
        !window.confirm(
          "Remove authenticator protection? Future logins will only require your password.",
        )
      ) {
        return;
      }
      setError("");
      const assurance =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (
        assurance.data?.currentLevel !== "aal2" &&
        !/^\d{6}$/.test(removalCode)
      ) {
        setError("Enter a current 6-digit code before removing the factor.");
        return;
      }
      if (assurance.data?.currentLevel !== "aal2") {
        const challenge = await supabase.auth.mfa.challenge({
          factorId: verifiedFactor.id,
        });
        if (challenge.error) {
          setError("The authenticator challenge could not be created.");
          return;
        }
        const verification = await supabase.auth.mfa.verify({
          factorId: verifiedFactor.id,
          challengeId: challenge.data.id,
          code: removalCode,
        });
        if (verification.error) {
          setError("That code was not accepted.");
          return;
        }
      }
      const result = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });
      if (result.error) {
        setError("Authenticator protection could not be removed.");
        return;
      }
      setRemovalCode("");
      setMessage("Authenticator protection was removed.");
      await loadFactors();
    });
  };

  return (
    <div className="bg-background/55 ring-border/80 relative mt-2.5 overflow-hidden rounded-2xl p-3.5 ring-1 sm:p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={
            verifiedFactor
              ? "bg-positive/12 text-positive ring-positive/25 grid size-9 shrink-0 place-items-center rounded-xl ring-1"
              : "bg-muted/80 text-muted-foreground ring-border/80 grid size-9 shrink-0 place-items-center rounded-xl ring-1"
          }
        >
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Authenticator app
            <StatusChip tone={verifiedFactor ? "positive" : "caution"}>
              {verifiedFactor ? "Protected" : "Recommended"}
            </StatusChip>
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            Require a rotating 6-digit code after your password. ATLAS enforces
            the stronger session before opening private pages.
          </p>

          {verifiedFactor ? (
            <div className="bg-positive/[0.06] ring-positive/20 mt-4 rounded-xl p-3.5 ring-1">
              <p className="text-positive flex items-center gap-2 text-sm font-semibold">
                <KeyRound aria-hidden="true" className="size-4" />
                Two-step verification enabled
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {verifiedFactor.friendly_name ?? "ATLAS authenticator"}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={removalCode}
                  onChange={(event) => setRemovalCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="Code if this session is AAL1"
                  aria-label="Authenticator code for removal"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  pending={pending && pendingAction === "remove"}
                  pendingLabel="Removing…"
                  onClick={removeFactor}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>
            </div>
          ) : enrollment ? (
            <div className="bg-card/70 ring-border/80 mt-4 rounded-xl p-3.5 ring-1 sm:p-4">
              <ol className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1.5 text-xs leading-5">
                <li className="flex items-center gap-2">
                  <span className="bg-primary/12 text-primary grid size-5 place-items-center rounded-full font-mono text-[10px] font-semibold">
                    1
                  </span>
                  Scan the code with an authenticator app.
                </li>
                <li className="flex items-center gap-2">
                  <span className="bg-primary/12 text-primary grid size-5 place-items-center rounded-full font-mono text-[10px] font-semibold">
                    2
                  </span>
                  Enter the current 6-digit code to finish.
                </li>
              </ol>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                <Image
                  src={enrollment.qrCode}
                  alt="Authenticator enrollment QR code"
                  width={176}
                  height={176}
                  unoptimized
                  className="self-center rounded-xl bg-white p-2 shadow-[0_10px_30px_-18px_rgb(7_10_15/0.6)] ring-1 ring-black/10 sm:self-start"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Manual setup key
                    </p>
                    <code className="bg-muted/80 ring-border/80 mt-1 block overflow-x-auto rounded-lg px-2.5 py-2 font-mono text-xs tracking-wider ring-1">
                      {enrollment.secret}
                    </code>
                  </div>
                  <Input
                    value={enrollmentCode}
                    onChange={(event) => setEnrollmentCode(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    aria-label="Authenticator verification code"
                    className="font-mono text-lg tracking-[0.4em]"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      pending={pending && pendingAction === "verify"}
                      pendingLabel="Verifying…"
                      onClick={verifyEnrollment}
                    >
                      Verify and enable
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      pending={pending && pendingAction === "cancel"}
                      pendingLabel="Cancelling…"
                      onClick={cancelEnrollment}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              className="mt-4"
              disabled={pending}
              pending={pending && pendingAction === "begin"}
              pendingLabel="Starting…"
              onClick={beginEnrollment}
            >
              <ShieldPlus className="size-4" />
              Set up authenticator
            </Button>
          )}

          {(message || error) && (
            <FormFeedback success={!error} className="mt-3">
              {error || message}
            </FormFeedback>
          )}
        </div>
      </div>
    </div>
  );
}
