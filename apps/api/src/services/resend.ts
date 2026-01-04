import { Resend } from "resend";

let _resend: Resend | null = null;

export const getResend = () => {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "");
  }
  return _resend;
};

// For backward compatibility
export const resend = new Proxy({} as Resend, {
  get: (_, prop) => {
    const instance = getResend();
    return (instance as Record<string, unknown>)[prop as string];
  },
});
