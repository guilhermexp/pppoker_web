/**
 * SVG paths e componentes de logos customizados para o sidebar do 21st.dev
 */

import React from "react";

// Soft spring easing para todas as transições
export const softSpringEasing = "cubic-bezier(0.25, 1.1, 0.4, 1)";

/**
 * Logo do Mid Poker (versão quadrada para o sidebar)
 * Adaptado do logo existente do @midpoker/ui
 */
export function MidPokerLogoSquare() {
  return (
    <div className="aspect-square flex items-center justify-center min-h-px min-w-px overflow-clip relative shrink-0">
      <svg
        className="block size-full"
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          {/* Ícone de carta de poker estilizado */}
          <rect
            x="4"
            y="6"
            width="16"
            height="12"
            rx="2"
            fill="#FAFAFA"
            opacity="0.9"
          />
          <circle cx="12" cy="12" r="3" fill="#18181B" />
          <path
            d="M12 9 L14 12 L12 15 L10 12 Z"
            fill="#FAFAFA"
            opacity="0.8"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Badge da marca com logo e texto
 */
export function BrandBadge({
  isCollapsed,
}: {
  isCollapsed: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-4">
      <div className="shrink-0 w-6 h-6">
        <MidPokerLogoSquare />
      </div>
      <div
        className={`font-['Lexend',_sans-serif] text-[14px] font-semibold text-neutral-50 transition-all duration-500 ${
          isCollapsed ? "opacity-0 w-0" : "opacity-100"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        Mid Poker
      </div>
    </div>
  );
}

/**
 * Avatar círculo simples
 */
export function AvatarCircle({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-full bg-neutral-700 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
          fill="#FAFAFA"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}
