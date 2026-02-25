"use client";

import { useUserQuery } from "@/hooks/use-user";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback, AvatarImageNext } from "@midpoker/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Users, Shield, Crown, Settings, Star, User } from "lucide-react";

function extractPppokerNumericId(email?: string | null) {
  if (!email) return null;
  const match = email.match(/^pppoker_(\d+)@/i);
  return match?.[1] ?? null;
}

function isInternalMappedEmail(email?: string | null) {
  if (!email) return false;
  return email.endsWith("@midpoker.internal");
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  dono: { label: "Dono", icon: Crown, color: "text-yellow-400" },
  gestor: { label: "Gestor", icon: Settings, color: "text-blue-400" },
  super_agente: { label: "Super Agente", icon: Star, color: "text-purple-400" },
  agente: { label: "Agente", icon: Shield, color: "text-green-400" },
  membro: { label: "Membro", icon: User, color: "text-gray-400" },
};

export function SettingsPrimaryUserPanel() {
  const { data: user } = useUserQuery();
  const trpc = useTRPC();

  const { data: clubsData, isLoading: clubsLoading } = useQuery(
    trpc.poker.pppoker.listMyClubs.queryOptions(undefined, {
      retry: false,
      staleTime: 60_000,
    }),
  );

  const nickname =
    user?.fullName?.trim() || user?.email?.split("@")[0] || "Usuário";
  const pppokerNumericId = extractPppokerNumericId(user?.email);
  const hasExternalLinkedEmail =
    !!user?.email && !isInternalMappedEmail(user.email);

  const clubs = clubsData?.clubs ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Usuário principal</CardTitle>
          <CardDescription>
            Informações da conta que iniciou a sessão atual.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 rounded-full border-2 border-border">
              <AvatarImageNext
                src={user?.avatarUrl ?? ""}
                alt={nickname}
                width={96}
                height={96}
                quality={100}
              />
              <AvatarFallback className="rounded-full text-lg">
                {nickname.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="mt-4 text-2xl font-semibold text-primary">
              {nickname}
            </div>

            <div className="mt-2 text-sm text-muted-foreground">
              ID de usuário:{" "}
              <span className="font-medium text-foreground">
                {pppokerNumericId ?? "Não vinculado"}
              </span>
            </div>

            {hasExternalLinkedEmail && (
              <div className="mt-2 text-sm text-muted-foreground break-all">
                Email vinculado:{" "}
                <span className="font-medium text-foreground">{user.email}</span>
              </div>
            )}

            {!hasExternalLinkedEmail && (
              <div className="mt-2 text-sm text-muted-foreground">
                Email vinculado:{" "}
                <span className="font-medium text-foreground">Não vinculado</span>
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Resumo</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-400">
                  Ativo
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-primary">Sessão</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {pppokerNumericId ? "PPPoker" : "Web"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-4">
              <div className="grid grid-cols-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="text-foreground">
                  Perfil
                  <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-emerald-400" />
                </div>
                <div>Status</div>
                <div>Conta</div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-4xl font-semibold leading-none text-emerald-400">
                  {pppokerNumericId ? "OK" : "--"}
                </p>
                <p className="mt-3 text-lg text-muted-foreground">
                  {pppokerNumericId ? `ID ${pppokerNumericId}` : "Sem ID PPPoker"}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {["Avatar", "Nickname", "Email vinculado", "ID numérico"].map(
                  (label, index) => (
                    <div
                      key={label}
                      className="relative h-px bg-border/60 overflow-hidden"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-400/30"
                        style={{ width: `${92 - index * 18}%` }}
                      />
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clubs section */}
      {pppokerNumericId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Meus Clubes</CardTitle>
            <CardDescription>
              Clubes vinculados a esta conta PPPoker.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {clubsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!clubsLoading && clubs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum clube encontrado.
              </p>
            )}

            {!clubsLoading && clubs.length > 0 && (
              <div className="space-y-2">
                {clubs.map((club: {
                  club_id: number;
                  club_name: string;
                  avatar_url: string;
                  member_count: number;
                  user_role: string;
                  user_role_num: number;
                  liga_id: number | null;
                }) => {
                  const role = ROLE_CONFIG[club.user_role] ?? ROLE_CONFIG.membro!;
                  const RoleIcon = role.icon;

                  return (
                    <div
                      key={club.club_id}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/50"
                    >
                      <Avatar className="h-10 w-10 rounded-full border border-border flex-shrink-0">
                        <AvatarImageNext
                          src={club.avatar_url}
                          alt={club.club_name}
                          width={40}
                          height={40}
                          quality={80}
                        />
                        <AvatarFallback className="rounded-full text-xs">
                          {club.club_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {club.club_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`flex items-center gap-1 text-xs ${role.color}`}>
                            <RoleIcon className="h-3 w-3" />
                            {role.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {club.member_count}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {club.club_id}
                        </p>
                        {club.liga_id && (
                          <p className="text-[10px] text-muted-foreground">
                            Liga {club.liga_id}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
