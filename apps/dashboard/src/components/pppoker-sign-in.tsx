"use client";

import { createClient } from "@midpoker/supabase/client";
import { Icons } from "@midpoker/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function PPPokerSignIn() {
  const [isLoading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clubId, setClubId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");
  const trpc = useTRPC();

  const loginMutation = useMutation(
    trpc.pppokerAuth.login.mutationOptions({
      onSuccess: async (data) => {
        // Set the Supabase session with the returned tokens
        await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });

        // Hard redirect to ensure cookies are sent
        const redirectUrl = returnTo || "/";
        window.location.href = redirectUrl;
      },
      onError: (err) => {
        if (err.message.includes("Verificação por email")) {
          setNeedsVerify(true);
          setError(err.message);
        } else {
          setError(err.message || "Falha no login");
        }
        setLoading(false);
      },
    }),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const clubIdNum = Number.parseInt(clubId, 10);
    if (Number.isNaN(clubIdNum) || clubIdNum <= 0) {
      setError("ID do clube inválido");
      setLoading(false);
      return;
    }

    loginMutation.mutate({
      username,
      password,
      clubId: clubIdNum,
      verifyCode: needsVerify ? verifyCode : undefined,
    });
  };

  const inputClassName =
    "w-full bg-[#0e0e0e] dark:bg-white/90 border border-[#0e0e0e] dark:border-white text-white dark:text-[#0e0e0e] font-sans font-medium text-sm h-[40px] px-4 hover:bg-[#1a1a1a] dark:hover:bg-white transition-colors placeholder:text-white/60 dark:placeholder:text-[#70707080] focus:outline-none focus:ring-2 focus:ring-white/20 dark:focus:ring-[#0e0e0e]/20";

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Usuário PPPoker (email ou telefone)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className={inputClassName}
          />
          <input
            type="password"
            placeholder="Senha PPPoker"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClassName}
          />
          <input
            type="text"
            placeholder="ID do Clube"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            required
            className={inputClassName}
          />
          {needsVerify && (
            <input
              type="text"
              placeholder="Código de verificação (enviado por email)"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              required
              className={inputClassName}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#0e0e0e] dark:bg-white/90 border border-[#0e0e0e] dark:border-white text-white dark:text-[#0e0e0e] font-sans font-medium text-sm h-[40px] px-6 py-4 hover:bg-[#1a1a1a] dark:hover:bg-white transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Icons.Play size={16} />
            <span>
              {isLoading
                ? "Conectando..."
                : needsVerify
                  ? "Verificar e Entrar"
                  : "Entrar com PPPoker"}
            </span>
          </div>
        </button>

        {error && (
          <p
            className={`text-sm font-sans ${
              error.includes("Verificação")
                ? "text-yellow-500"
                : "text-red-500"
            }`}
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
