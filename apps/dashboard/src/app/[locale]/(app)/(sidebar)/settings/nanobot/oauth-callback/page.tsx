"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NanobotOAuthCallbackPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finalizando login OAuth...");
  const hasSubmittedRef = useRef(false);

  const completeMutation = useMutation(
    trpc.nanobot.completeProviderAuth.mutationOptions({
      onSuccess: async () => {
        setMessage("OAuth conectado com sucesso. Redirecionando...");
        await queryClient.invalidateQueries({
          queryKey: trpc.nanobot.providerAuthStatus.queryKey({
            provider: "openai_codex",
          }),
        });
        setTimeout(() => {
          const currentPath = window.location.pathname.replace(
            /\/oauth-callback\/?$/,
            "",
          );
          router.replace(`${currentPath}?oauth=connected`);
        }, 700);
      },
      onError: (error) => {
        setMessage(`Falha ao concluir OAuth: ${error.message}`);
      },
    }),
  );

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    if (error) {
      setMessage(`OAuth cancelado/falhou: ${errorDescription || error}`);
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      setMessage("Callback OAuth invalido: code/state ausentes.");
      return;
    }

    if (
      hasSubmittedRef.current ||
      completeMutation.isPending ||
      completeMutation.isSuccess
    ) {
      return;
    }
    hasSubmittedRef.current = true;
    completeMutation.mutate({
      provider: "openai_codex",
      code,
      state,
    });
  }, [completeMutation, searchParams]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="rounded-xl border p-6">
        <h1 className="text-lg font-semibold">OAuth do Nanobot</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
