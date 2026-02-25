"use client";

import { createClient } from "@midpoker/supabase/client";
import { Icons } from "@midpoker/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

interface ClubInfo {
  clubId: number;
  clubName: string;
  userRole: string;
  userRoleNum: number;
  memberCount: number;
  ligaId: number | null;
  avatarUrl: string;
}

const ROLE_LABELS: Record<string, string> = {
  dono: "Dono",
  gestor: "Gestor",
  super_agente: "Super Agente",
  agente: "Agente",
  membro: "Membro",
};

const ROLE_COLORS: Record<string, string> = {
  dono: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  gestor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  super_agente: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  agente: "bg-green-500/20 text-green-400 border-green-500/30",
  membro: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function canManageClub(role: string): boolean {
  return role === "dono" || role === "gestor";
}

export function PPPokerSignIn() {
  const [step, setStep] = useState<"credentials" | "select-club">(
    "credentials",
  );
  const [isLoading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [error, setError] = useState("");
  const [clubs, setClubs] = useState<ClubInfo[]>([]);
  const [pppokerUid, setPppokerUid] = useState<number | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to");
  const trpc = useTRPC();

  const loginMutation = useMutation(
    trpc.pppokerAuth.login.mutationOptions({
      onSuccess: async (data) => {
        if (data.step === "select_club") {
          // Step 1 complete: show club selection
          setPppokerUid(data.pppokerUid);
          setClubs(data.clubs);
          setStep("select-club");
          setLoading(false);
          return;
        }

        // Step 2 complete: full login done
        if (data.step === "done") {
          await supabase.auth.setSession({
            access_token: data.accessToken!,
            refresh_token: data.refreshToken!,
          });

          const redirectUrl = returnTo || "/";
          window.location.href = redirectUrl;
        }
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

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    loginMutation.mutate({
      username,
      password,
      verifyCode: needsVerify ? verifyCode : undefined,
    });
  };

  const handleSelectClub = (clubId: number) => {
    setLoading(true);
    setError("");

    loginMutation.mutate({
      username,
      password,
      clubId,
      verifyCode: needsVerify ? verifyCode : undefined,
    });
  };

  const handleBack = () => {
    setStep("credentials");
    setClubs([]);
    setPppokerUid(null);
    setError("");
  };

  const inputClassName =
    "w-full bg-[#0e0e0e] dark:bg-white/90 border border-[#0e0e0e] dark:border-white text-white dark:text-[#0e0e0e] font-sans font-medium text-sm h-[40px] px-4 hover:bg-[#1a1a1a] dark:hover:bg-white transition-colors placeholder:text-white/60 dark:placeholder:text-[#70707080] focus:outline-none focus:ring-2 focus:ring-white/20 dark:focus:ring-[#0e0e0e]/20";

  // ── Step 1: Credentials ──
  if (step === "credentials") {
    return (
      <div className="w-full space-y-4">
        <form onSubmit={handleCredentialsSubmit} className="space-y-3">
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

  // ── Step 2: Club selection ──
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={handleBack}
          className="text-white/60 dark:text-[#0e0e0e]/60 hover:text-white dark:hover:text-[#0e0e0e] transition-colors"
        >
          <Icons.ChevronLeft size={20} />
        </button>
        <span className="text-sm font-sans text-white/80 dark:text-[#0e0e0e]/80">
          Selecione um clube
        </span>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto">
        {clubs.length === 0 && (
          <p className="text-sm text-white/50 dark:text-[#0e0e0e]/50 text-center py-4">
            Nenhum clube encontrado para esta conta.
          </p>
        )}

        {clubs.map((club) => {
          const manageable = canManageClub(club.userRole);
          const roleLabel =
            ROLE_LABELS[club.userRole] || club.userRole;
          const roleColor =
            ROLE_COLORS[club.userRole] || ROLE_COLORS.membro;

          return (
            <button
              key={club.clubId}
              type="button"
              disabled={!manageable || isLoading}
              onClick={() => manageable && handleSelectClub(club.clubId)}
              className={`w-full text-left p-3 border transition-colors ${
                manageable
                  ? "bg-[#0e0e0e] dark:bg-white/90 border-[#1a1a1a] dark:border-white/20 hover:bg-[#1a1a1a] dark:hover:bg-white cursor-pointer"
                  : "bg-[#0e0e0e]/50 dark:bg-white/50 border-[#1a1a1a]/50 dark:border-white/10 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white dark:text-[#0e0e0e] truncate">
                      {club.clubName || `Clube ${club.clubId}`}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 border rounded-full font-medium ${roleColor}`}
                    >
                      {roleLabel}
                    </span>
                    {!manageable && (
                      <span className="text-xs px-2 py-0.5 bg-white/10 dark:bg-[#0e0e0e]/10 text-white/40 dark:text-[#0e0e0e]/40 border border-white/10 dark:border-[#0e0e0e]/10 rounded-full">
                        Em breve
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50 dark:text-[#0e0e0e]/50">
                    <span>ID: {club.clubId}</span>
                    <span>{club.memberCount} membros</span>
                    {club.ligaId && <span>Liga: {club.ligaId}</span>}
                  </div>
                </div>
                {manageable && (
                  <Icons.ChevronRight
                    size={16}
                    className="text-white/40 dark:text-[#0e0e0e]/40 flex-shrink-0"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm font-sans text-red-500">{error}</p>
      )}

      {isLoading && (
        <p className="text-sm font-sans text-white/60 dark:text-[#0e0e0e]/60 text-center">
          Entrando no clube...
        </p>
      )}
    </div>
  );
}
