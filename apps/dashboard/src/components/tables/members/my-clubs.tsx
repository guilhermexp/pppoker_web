"use client";

import { useUserQuery } from "@/hooks/use-user";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback, AvatarImageNext } from "@midpoker/ui/avatar";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Shield, Crown, Settings, Star, User } from "lucide-react";

function extractPppokerNumericId(email?: string | null) {
  if (!email) return null;
  const match = email.match(/^pppoker_(\d+)@/i);
  return match?.[1] ?? null;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: typeof Crown; color: string }
> = {
  dono: { label: "Dono", icon: Crown, color: "text-yellow-400" },
  gestor: { label: "Gestor", icon: Settings, color: "text-blue-400" },
  super_agente: {
    label: "Super Agente",
    icon: Star,
    color: "text-purple-400",
  },
  agente: { label: "Agente", icon: Shield, color: "text-green-400" },
  membro: { label: "Membro", icon: User, color: "text-gray-400" },
};

export function MyClubs() {
  const { data: user } = useUserQuery();
  const trpc = useTRPC();

  const pppokerNumericId = extractPppokerNumericId(user?.email);

  const { data: clubsData, isLoading: clubsLoading } = useQuery({
    ...trpc.poker.pppoker.listMyClubs.queryOptions(),
    retry: false,
    staleTime: 60_000,
    enabled: !!pppokerNumericId,
  });

  const clubs = clubsData?.clubs ?? [];

  if (!pppokerNumericId) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma conta PPPoker vinculada.
      </p>
    );
  }

  return (
    <div className="pt-4">
      <p className="text-sm text-muted-foreground mb-4">
        Clubes vinculados a esta conta PPPoker.
      </p>

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
          {clubs.map(
            (club: {
              club_id: number;
              club_name: string;
              avatar_url: string;
              member_count: number;
              user_role: string;
              user_role_num: number;
              liga_id: number | null;
            }) => {
              const role =
                ROLE_CONFIG[club.user_role] ?? ROLE_CONFIG.membro!;
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
                      <span
                        className={`flex items-center gap-1 text-xs ${role.color}`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {role.label}
                      </span>
                      {club.liga_id && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          Liga {club.liga_id}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {club.club_id}
                    </p>
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
