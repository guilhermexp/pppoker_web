import { Icons } from "@midpoker/ui/icons";
import { inputClassName } from "./constants";

interface CredentialsStepProps {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  isLoading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function CredentialsStep({
  username,
  setUsername,
  password,
  setPassword,
  isLoading,
  error,
  onSubmit,
}: CredentialsStepProps) {
  return (
    <div className="w-full space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
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

        {error && <p className="text-xs font-sans text-red-400/90">{error}</p>}
      </form>
    </div>
  );
}
