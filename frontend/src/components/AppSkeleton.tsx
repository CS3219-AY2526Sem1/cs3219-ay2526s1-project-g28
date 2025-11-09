// src/components/AppSkeleton.tsx
import React from "react";

type Mode = "light" | "dark";

/** Light by default; pass mode="dark" if you want the old look */
export default function AppSkeleton({ mode = "light" }: { mode?: Mode }) {
  const isLight = mode === "light";

  const page = isLight ? "bg-neutral-50 text-neutral-900" : "bg-[#0b0a10] text-white";
  const blockBase = "rounded-2xl";
  const block = isLight ? "bg-white" : "bg-[rgb(18,16,26)]";

  // subtle shimmer band on top of the block color
  const shimmerBand = isLight
    ? "from-neutral-200/60 via-neutral-300/60 to-neutral-200/60"
    : "from-white/5 via-white/10 to-white/5";

  const shimmer =
    `bg-[linear-gradient(110deg,transparent_0%,transparent_8%,rgba(255,255,255,0)_8%)] 
     bg-[length:200%_100%] 
     before:content-[''] before:block before:h-full before:w-full before:rounded-2xl 
     before:bg-gradient-to-r before:${shimmerBand} 
     before:bg-[length:200%_100%] before:animate-[shimmer_1.4s_infinite]`;

  const Card = ({ h, w = "w-full" }: { h: string; w?: string }) => (
    <div className={`${blockBase} ${block} relative overflow-hidden ${w}`} style={{ height: h }}>
      <div className={`absolute inset-0 ${shimmer}`} />
    </div>
  );

  return (
    <div className={`min-h-screen w-full ${page}`}>
      <div className="h-4" />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* header pills */}
        <div className="flex gap-4">
          <Card h="40px" w="w-28" />
          <Card h="40px" w="w-24" />
          <Card h="40px" w="w-24" />
        </div>

        {/* big content card */}
        <Card h="380px" />

        {/* text rows */}
        <div className="space-y-4">
          <Card h="16px" w="w-64" />
          <Card h="16px" w="w-80" />
          <Card h="16px" w="w-56" />
          <div className="mt-3">
            <Card h="36px" w="w-32" />
          </div>
        </div>

        {/* second card */}
        <Card h="300px" />
      </div>
    </div>
  );
}
