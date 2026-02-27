import type { ClubInfo } from "./types";

export function ClubAvatar({ club }: { club: ClubInfo }) {
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
