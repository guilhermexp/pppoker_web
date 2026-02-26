"use client";

import { useUserQuery } from "@/hooks/use-user";
import { useTeamQuery } from "@/hooks/use-team";
import { Avatar, AvatarFallback, AvatarImageNext } from "@midpoker/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";

function extractPppokerNumericId(email?: string | null) {
  if (!email) return null;
  const match = email.match(/^pppoker_(\d+)@/i);
  return match?.[1] ?? null;
}

function isInternalMappedEmail(email?: string | null) {
  if (!email) return false;
  return email.endsWith("@midpoker.internal");
}

export function SettingsPrimaryUserPanel() {
  const { data: user } = useUserQuery();
  const { data: team } = useTeamQuery();

  const nickname =
    user?.fullName?.trim() || user?.email?.split("@")[0] || "Usuário";
  const pppokerNumericId = extractPppokerNumericId(user?.email);
  const hasExternalLinkedEmail =
    !!user?.email && !isInternalMappedEmail(user.email);

  const clubName = team?.name ?? null;

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

            {pppokerNumericId && (
              <div className="mt-1 text-sm text-muted-foreground">
                ID:{" "}
                <span className="font-medium text-foreground">
                  {pppokerNumericId}
                </span>
              </div>
            )}

            {hasExternalLinkedEmail && (
              <div className="mt-1 text-sm text-muted-foreground break-all">
                Email:{" "}
                <span className="font-medium text-foreground">{user.email}</span>
              </div>
            )}

            {clubName && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">
                  {clubName}
                </span>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
