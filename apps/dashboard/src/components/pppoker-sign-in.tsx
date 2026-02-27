"use client";

import { createClient } from "@midpoker/supabase/client";
import { Icons } from "@midpoker/ui/icons";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

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

const ROLE_STYLES: Record<string, { dot: string; text: string }> = {
  dono: { dot: "bg-yellow-400", text: "text-yellow-400" },
  gestor: { dot: "bg-blue-400", text: "text-blue-400" },
  super_agente: { dot: "bg-purple-400", text: "text-purple-400" },
  agente: { dot: "bg-green-400", text: "text-green-400" },
  membro: { dot: "bg-zinc-500", text: "text-zinc-500" },
};

const LAST_CLUB_KEY = "pppoker_last_club_id";

function getLastClubId(): number | null {
  try {
    const val = localStorage.getItem(LAST_CLUB_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

function saveLastClubId(clubId: number) {
  try {
    localStorage.setItem(LAST_CLUB_KEY, String(clubId));
  } catch {
    // ignore
  }
}

function canManageClub(role: string): boolean {
  return role === "dono" || role === "gestor";
}

function ClubAvatar({ club }: { club: ClubInfo }) {
  const isUrl =
    club.avatarUrl?.startsWith("http://") ||
    club.avatarUrl?.startsWith("https://");

  if (isUrl) {
    return (
      <img
        src={club.avatarUrl}
        alt={club.clubName}
        className="h-10 w-10 rounded-full object-cover border border-white/10"
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-white/60">
      {(club.clubName || "C").charAt(0).toUpperCase()}
    </div>
  );
}

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

  // Sort: last-used first, then manageable (dono/gestor), then rest
  const sortedClubs = useMemo(() => {
    return [...clubs].sort((a, b) => {
      if (a.clubId === lastClubId) return -1;
      if (b.clubId === lastClubId) return 1;
      const aOk = canManageClub(a.userRole) ? 0 : 1;
      const bOk = canManageClub(b.userRole) ? 0 : 1;
      return aOk - bOk;
    });
  }, [clubs, lastClubId]);

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

  const inputClassName =
    "w-full bg-[#0e0e0e] border border-white/10 text-white font-sans font-medium text-sm h-[40px] px-4 hover:border-white/20 transition-colors placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 rounded-none";

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
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black font-sans font-medium text-sm h-[40px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Icons.Play size={14} />
            <span>{isLoading ? "Conectando..." : "Entrar com PPPoker"}</span>
          </button>

          {error && (
            <p className="text-xs font-sans text-red-400/90">{error}</p>
          )}
        </form>
      </div>
    );
  }

  // ── Step 1.5: Email verification (code -15 flow) ──
  if (step === "email-verify") {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="text-white/40 hover:text-white transition-colors p-0.5"
          >
            <Icons.ChevronLeft size={18} />
          </button>
          <div>
            <p className="text-sm font-medium text-white">
              Verificação por email
            </p>
            <p className="text-xs text-white/40">
              Sua conta requer verificação por email
              {secretMail ? ` (${secretMail})` : ""}
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifySubmit} className="space-y-3">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Email vinculado ao PPPoker"
                value={verifyEmail}
                onChange={(e) => setVerifyEmail(e.target.value)}
                required
                className={inputClassName}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={!verifyEmail || sendingCode || cooldown > 0}
                className="flex-shrink-0 bg-white/10 text-white text-xs font-medium px-3 h-[40px] hover:bg-white/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {sendingCode
                  ? "Enviando..."
                  : cooldown > 0
                    ? `${cooldown}s`
                    : codeSent
                      ? "Reenviar"
                      : "Enviar código"}
              </button>
            </div>

            {codeSent && (
              <input
                type="text"
                placeholder="Código de verificação recebido por email"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                required
                className={inputClassName}
                autoFocus
              />
            )}
          </div>

          {codeSent && (
            <button
              type="submit"
              disabled={isLoading || !verifyCode}
              className="w-full bg-white text-black font-sans font-medium text-sm h-[40px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icons.Play size={14} />
              <span>
                {isLoading ? "Verificando..." : "Verificar e Entrar"}
              </span>
            </button>
          )}

          {error && (
            <p className="text-xs font-sans text-red-400/90">{error}</p>
          )}

          {codeSent && !error && (
            <p className="text-xs font-sans text-emerald-400/80">
              Código enviado para {verifyEmail}
            </p>
          )}
        </form>
      </div>
    );
  }

  // ── Step 2: Club selection ──
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="text-white/40 hover:text-white transition-colors p-0.5"
        >
          <Icons.ChevronLeft size={18} />
        </button>
        <div>
          <p className="text-sm font-medium text-white">
            Selecione um clube
          </p>
          <p className="text-xs text-white/40">
            {clubs.length} {clubs.length === 1 ? "clube" : "clubes"} encontrados
          </p>
        </div>
      </div>

      {/* Club list */}
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
        {sortedClubs.map((club) => {
          const manageable = canManageClub(club.userRole);
          const isLastUsed = club.clubId === lastClubId;
          const isSelected = club.clubId === selectedClubId && isLoading;
          const roleLabel = ROLE_LABELS[club.userRole] || club.userRole;
          const roleStyle = ROLE_STYLES[club.userRole] || ROLE_STYLES.membro!;

          return (
            <button
              key={club.clubId}
              type="button"
              disabled={!manageable || isLoading}
              onClick={() => manageable && handleSelectClub(club.clubId)}
              className={`w-full text-left px-3 py-2.5 rounded transition-all duration-150 ${
                isSelected
                  ? "bg-white/10 border border-white/20"
                  : isLastUsed && manageable
                    ? "bg-white/[0.06] border border-white/15 hover:bg-white/10"
                    : manageable
                      ? "bg-transparent border border-transparent hover:bg-white/[0.04] hover:border-white/10"
                      : "bg-transparent border border-transparent opacity-40 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <ClubAvatar club={club} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {club.clubName || `Clube ${club.clubId}`}
                    </span>
                    {isLastUsed && manageable && (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                        Recente
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`flex items-center gap-1 text-xs ${roleStyle.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${roleStyle.dot}`} />
                      {roleLabel}
                    </span>
                    {club.ligaId && (
                      <span className="text-xs text-white/30">
                        Liga {club.ligaId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div className="flex-shrink-0">
                  {isSelected ? (
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  ) : manageable ? (
                    <Icons.ChevronRight className="h-4 w-4 text-white/20" />
                  ) : (
                    <span className="text-[10px] text-white/30">
                      Em breve
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-xs font-sans text-red-400/90 px-1">{error}</p>
      )}
    </div>
  );
}
