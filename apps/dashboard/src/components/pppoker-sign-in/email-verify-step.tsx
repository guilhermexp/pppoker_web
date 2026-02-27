import { Icons } from "@midpoker/ui/icons";
import { inputClassName } from "./constants";

interface EmailVerifyStepProps {
  verifyEmail: string;
  setVerifyEmail: (v: string) => void;
  verifyCode: string;
  setVerifyCode: (v: string) => void;
  secretMail: string;
  codeSent: boolean;
  sendingCode: boolean;
  cooldown: number;
  isLoading: boolean;
  error: string;
  onSendCode: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function EmailVerifyStep({
  verifyEmail,
  setVerifyEmail,
  verifyCode,
  setVerifyCode,
  secretMail,
  codeSent,
  sendingCode,
  cooldown,
  isLoading,
  error,
  onSendCode,
  onSubmit,
  onBack,
}: EmailVerifyStepProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
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

      <form onSubmit={onSubmit} className="space-y-3">
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
              onClick={onSendCode}
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
            <span>{isLoading ? "Verificando..." : "Verificar e Entrar"}</span>
          </button>
        )}

        {error && <p className="text-xs font-sans text-red-400/90">{error}</p>}

        {codeSent && !error && (
          <p className="text-xs font-sans text-emerald-400/80">
            Código enviado para {verifyEmail}
          </p>
        )}
      </form>
    </div>
  );
}
