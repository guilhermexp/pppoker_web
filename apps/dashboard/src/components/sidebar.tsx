"use client";

import { cn } from "@midpoker/ui/cn";

import Link from "next/link";
import { useState } from "react";
import { MainMenu, SettingsMenuItem } from "./main-menu";
import { useSidebarPinned } from "./sidebar-context";
import { TeamDropdown } from "./team-dropdown";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const { isPinned, setIsPinned } = useSidebarPinned();

  const expanded = isPinned || isExpanded;

  return (
    <aside
      className={cn(
        "h-screen flex-shrink-0 flex-col desktop:overflow-hidden desktop:rounded-tl-[10px] desktop:rounded-bl-[10px] justify-between fixed top-0 pb-4 items-center hidden md:flex z-50 transition-all duration-200 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb;",
        "bg-background border-r border-border",
        expanded ? "w-[240px]" : "w-[56px]",
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div
        className={cn(
          "absolute top-0 left-0 h-[70px] flex items-center justify-center bg-background border-b border-border transition-all duration-200 ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb;",
          expanded ? "w-full" : "w-[55px]",
        )}
      >
        <Link href="/" className="absolute left-[14px] transition-none">
          <svg
            className="h-6 w-auto"
            viewBox="0 0 200 199"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_sidebar)">
              <g clipPath="url(#clip1_sidebar)">
                <g>
                  <rect
                    x="107.469"
                    y="199.301"
                    width="14.5784"
                    height="71.4846"
                    transform="rotate(179.9 107.469 199.301)"
                    fill="currentColor"
                  />
                  <rect
                    x="106.959"
                    y="75.4922"
                    width="14"
                    height="75.9607"
                    transform="rotate(179.9 106.959 75.4922)"
                    fill="currentColor"
                  />
                  <rect
                    x="143.756"
                    y="9.25391"
                    width="14.5784"
                    height="75.6694"
                    transform="rotate(29.36 143.756 9.25391)"
                    fill="currentColor"
                  />
                  <rect
                    x="81.0488"
                    y="120.723"
                    width="14.5784"
                    height="72.1569"
                    transform="rotate(29.36 81.0488 120.723)"
                    fill="currentColor"
                  />
                  <rect
                    x="182.494"
                    y="44.0703"
                    width="14.5784"
                    height="74.1255"
                    transform="rotate(59 182.494 44.0703)"
                    fill="currentColor"
                  />
                  <rect
                    x="74.0938"
                    y="109.203"
                    width="14.5784"
                    height="73.7623"
                    transform="rotate(59 74.0938 109.203)"
                    fill="currentColor"
                  />
                  <rect
                    x="154.41"
                    y="183.598"
                    width="14.5784"
                    height="72.0479"
                    transform="rotate(150.64 154.41 183.598)"
                    fill="currentColor"
                  />
                  <rect
                    x="93.6016"
                    y="75.5156"
                    width="14.5784"
                    height="76.0357"
                    transform="rotate(150.64 93.6016 75.5156)"
                    fill="currentColor"
                  />
                  <rect
                    x="189.061"
                    y="147.113"
                    width="14.5784"
                    height="74.0452"
                    transform="rotate(121 189.061 147.113)"
                    fill="currentColor"
                  />
                  <rect
                    x="81.2207"
                    y="82.3086"
                    width="14.5784"
                    height="74.4117"
                    transform="rotate(121 81.2207 82.3086)"
                    fill="currentColor"
                  />
                  <rect
                    x="126.053"
                    y="109.227"
                    width="14.5784"
                    height="73.8174"
                    transform="rotate(-90 126.053 109.227)"
                    fill="currentColor"
                  />
                  <rect
                    x="0.0292969"
                    y="109.227"
                    width="14.5784"
                    height="73.8174"
                    transform="rotate(-90 0.0292969 109.227)"
                    fill="currentColor"
                  />
                </g>
              </g>
              <path
                d="M125.99 109.126C126.647 106.523 126.998 103.645 126.998 100.492C126.998 85.3044 114.91 72.9922 99.998 72.9922C85.0864 72.9922 72.998 85.3044 72.998 100.492C72.998 103.65 73.3502 106.53 74.0083 109.137L100.005 82.6735L125.99 109.126Z"
                fill="currentColor"
              />
            </g>
            <defs>
              <clipPath id="clip0_sidebar">
                <rect
                  width="200"
                  height="110"
                  fill="white"
                  transform="translate(0 -1)"
                />
              </clipPath>
              <clipPath id="clip1_sidebar">
                <rect
                  width="200"
                  height="205"
                  fill="white"
                  transform="translate(0.0292969 -0.96875)"
                />
              </clipPath>
            </defs>
          </svg>
        </Link>
      </div>

      <div className="flex flex-col w-full pt-[70px] flex-1">
        <MainMenu isExpanded={expanded} settingsPlacement="hidden" />
      </div>

      <TeamDropdown
        isExpanded={expanded}
        bottomOffsetPx={isSettingsExpanded ? 260 : 72}
      />

      <div className="absolute bottom-4 left-0 w-full">
        <SettingsMenuItem
          isExpanded={expanded}
          onExpandedChange={setIsSettingsExpanded}
        />
      </div>
    </aside>
  );
}
