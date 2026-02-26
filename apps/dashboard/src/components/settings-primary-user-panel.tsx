"use client";

import { useUserQuery } from "@/hooks/use-user";
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

  const nickname =
    user?.fullName?.trim() || user?.email?.split("@")[0] || "Usuário";
  const pppokerNumericId = extractPppokerNumericId(user?.email);
  const hasExternalLinkedEmail =
    !!user?.email && !isInternalMappedEmail(user.email);

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

    </div>
  );
}
