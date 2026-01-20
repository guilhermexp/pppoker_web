"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { ChevronLeftIcon } from "lucide-react";
import { EmailSignIn } from "@/components/email-sign-in";
import { Icons } from "@midpoker/ui/icons";

export function AuthPage() {
  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="bg-muted/60 relative hidden h-full flex-col border-r p-10 lg:flex">
        <div className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent" />
        <div className="z-10 flex items-center gap-2">
          <Icons.LogoSmall className="h-6 w-auto" />
        </div>
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;Esta plataforma me ajudou a economizar tempo e atender
              meus clientes mais rápido do que nunca.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold">
              ~ Cliente Mid Poker
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>
      <div className="relative flex min-h-screen flex-col justify-center p-4">
        <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-60"
        >
          <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)] absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full" />
          <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 [translate:5%_-50%] rounded-full" />
          <div className="bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full" />
        </div>
        <Button variant="ghost" className="absolute top-7 left-5" asChild>
          <a href="/">
            <ChevronLeftIcon className="size-4 me-2" />
            Home
          </a>
        </Button>
        <div className="mx-auto space-y-4 sm:w-sm">
          <div className="flex items-center gap-2 lg:hidden">
            <Icons.LogoSmall className="h-6 w-auto" />
          </div>
          <div className="flex flex-col space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-wide">
              Welcome to Mid Poker
            </h1>
            <p className="text-muted-foreground text-base">
              Sign in to your account to continue
            </p>
          </div>

          {/* Integração com EmailSignIn do Supabase */}
          <div className="flex items-center justify-center">
            <EmailSignIn />
          </div>

          <p className="text-muted-foreground mt-8 text-sm">
            By signing in you agree to our{" "}
            <a
              href="https://mid.poker/terms"
              className="hover:text-primary underline underline-offset-4"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://mid.poker/policy"
              className="hover:text-primary underline underline-offset-4"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    color: `rgba(15,23,42,${0.1 + i * 0.03})`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-slate-950 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}
