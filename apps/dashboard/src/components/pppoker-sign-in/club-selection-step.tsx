import { Icons } from "@midpoker/ui/icons";
import { useMemo } from "react";
import { ClubAvatar } from "./club-avatar";
import { ROLE_LABELS, ROLE_STYLES, canManageClub } from "./constants";
import type { ClubInfo } from "./types";

interface ClubSelectionStepProps {
  clubs: ClubInfo[];
  lastClubId: number | null;
  selectedClubId: number | null;
  isLoading: boolean;
  error: string;
  onSelectClub: (clubId: number) => void;
  onBack: () => void;
}

export function ClubSelectionStep({
  clubs,
  lastClubId,
  selectedClubId,
  isLoading,
  error,
  onSelectClub,
  onBack,
}: ClubSelectionStepProps) {
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

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-white/40 hover:text-white transition-colors p-0.5"
        >
          <Icons.ChevronLeft size={18} />
        </button>
        <div>
          <p className="text-sm font-medium text-white">Selecione um clube</p>
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
              onClick={() => manageable && onSelectClub(club.clubId)}
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
                    <span
                      className={`flex items-center gap-1 text-xs ${roleStyle.text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${roleStyle.dot}`}
                      />
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
                    <span className="text-[10px] text-white/30">Em breve</span>
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
