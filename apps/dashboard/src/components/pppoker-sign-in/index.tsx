"use client";

import { useTRPC } from "@/trpc/client";
import { createClient } from "@midpoker/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ClubSelectionStep } from "./club-selection-step";
import { getLastClubId, saveLastClubId } from "./constants";
import { CredentialsStep } from "./credentials-step";
import { EmailVerifyStep } from "./email-verify-step";
import type { ClubInfo } from "./types";

export function PPPokerSignIn() {
  const [step, setStep] = useState<
    "credentials" | "email-verify" | "select-club"
  >("credentials");
  const [isLoading, setLoading] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [secretMail, setSecretMail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [clubs, setClubs] = useState<ClubInfo[]>([]);
  const [pppokerUid, setPppokerUid] = useState<number | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");
  const trpc = useTRPC();

  const lastClubId = useMemo(() => getLastClubId(), []);

  const sendCodeMutation = useMutation(
    trpc.pppokerAuth.sendVerificationCode.mutationOptions({
      onSuccess: () => {
        setCodeSent(true);
        setSendingCode(false);
        setError("");
        setCooldown(60);
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      },
      onError: (err) => {
        setSendingCode(false);
        setError(err.message || "Falha ao enviar codigo");
      },
    }),
  );

  const loginMutation = useMutation(
    trpc.pppokerAuth.login.mutationOptions({
      onSuccess: async (data) => {
        if (data.step === "select_club") {
          setPppokerUid(data.pppokerUid);
          setClubs(data.clubs);
          setStep("select-club");
          setLoading(false);
          return;
        }

        if (data.step === "done") {
          if (data.clubId) saveLastClubId(data.clubId);

          await supabase.auth.setSession({
            access_token: data.accessToken!,
            refresh_token: data.refreshToken!,
          });

          const redirectUrl = returnTo || "/";
          window.location.href = redirectUrl;
        }
      },
      onError: (err) => {
        setLoading(false);
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.type === "email_verification") {
            setSecretMail(parsed.secret_mail || "");
            setStep("email-verify");
            setError("");
            return;
          }
        } catch {
          // not JSON, regular error
        }
        setError(err.message || "Falha no login");
      },
    }),
  );

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    loginMutation.mutate({
      username,
      password,
    });
  };

  const handleSendCode = () => {
    if (!verifyEmail || sendingCode || cooldown > 0) return;
    setSendingCode(true);
    setError("");
    sendCodeMutation.mutate({ email: verifyEmail });
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    loginMutation.mutate({
      username,
      password,
      verifyCode,
    });
  };

  const handleSelectClub = (clubId: number) => {
    setLoading(true);
    setSelectedClubId(clubId);
    setError("");

    loginMutation.mutate({
      username,
      password,
      clubId,
      verifyCode: verifyCode || undefined,
    });
  };

  const handleBack = () => {
    if (step === "email-verify") {
      setStep("credentials");
      setCodeSent(false);
      setVerifyCode("");
      setVerifyEmail("");
      setCooldown(0);
    } else {
      setStep("credentials");
      setClubs([]);
      setPppokerUid(null);
      setSelectedClubId(null);
    }
    setError("");
  };

  // ── Step 1: Credentials ──
  if (step === "credentials") {
    return (
      <CredentialsStep
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        isLoading={isLoading}
        error={error}
        onSubmit={handleCredentialsSubmit}
      />
    );
  }

  // ── Step 1.5: Email verification (code -15 flow) ──
  if (step === "email-verify") {
    return (
      <EmailVerifyStep
        verifyEmail={verifyEmail}
        setVerifyEmail={setVerifyEmail}
        verifyCode={verifyCode}
        setVerifyCode={setVerifyCode}
        secretMail={secretMail}
        codeSent={codeSent}
        sendingCode={sendingCode}
        cooldown={cooldown}
        isLoading={isLoading}
        error={error}
        onSendCode={handleSendCode}
        onSubmit={handleVerifySubmit}
        onBack={handleBack}
      />
    );
  }

  // ── Step 2: Club selection ──
  return (
    <ClubSelectionStep
      clubs={clubs}
      lastClubId={lastClubId}
      selectedClubId={selectedClubId}
      isLoading={isLoading}
      error={error}
      onSelectClub={handleSelectClub}
      onBack={handleBack}
    />
  );
}
