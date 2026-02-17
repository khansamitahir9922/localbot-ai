"use client";

import { useRef } from "react";
import {
  Bot,
  Users,
  LayoutTemplate,
  Cpu,
  Smartphone,
  Languages,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CARDS = [
  {
    icon: Bot,
    label: "Self-service AI chatbots with a human element",
    bg: "bg-amber-500/15",
    iconBg: "bg-amber-500",
    border: "border-amber-200",
    text: "text-amber-800",
  },
  {
    icon: LayoutTemplate,
    label: "Codeless drag-and-drop chatbot builder",
    bg: "bg-emerald-500/15",
    iconBg: "bg-emerald-500",
    border: "border-emerald-200",
    text: "text-emerald-800",
  },
  {
    icon: Cpu,
    label: "Integrations with top AI technology",
    bg: "bg-violet-500/15",
    iconBg: "bg-violet-500",
    border: "border-violet-200",
    text: "text-violet-800",
  },
  {
    icon: Smartphone,
    label: "Deployable on your website instantly",
    bg: "bg-rose-500/15",
    iconBg: "bg-rose-500",
    border: "border-rose-200",
    text: "text-rose-800",
  },
  {
    icon: Languages,
    label: "Multilingual chatbots",
    bg: "bg-sky-500/15",
    iconBg: "bg-sky-500",
    border: "border-sky-200",
    text: "text-sky-800",
  },
  {
    icon: Users,
    label: "Built for local businesses",
    bg: "bg-fuchsia-500/15",
    iconBg: "bg-fuchsia-500",
    border: "border-fuchsia-200",
    text: "text-fuchsia-800",
  },
];

export function WhyLocalBotCarousel(): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const step = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto py-2 scroll-smooth md:gap-6 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`min-w-[260px] max-w-[280px] snap-center rounded-2xl border-2 ${card.border} ${card.bg} p-6 shadow-md transition-all hover:shadow-lg sm:min-w-[280px]`}
              >
                <div
                  className={`mb-4 flex size-14 items-center justify-center rounded-xl ${card.iconBg} text-white shadow-lg`}
                >
                  <Icon className="size-7" />
                </div>
                <p className={`text-base font-bold ${card.text} leading-snug`}>
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden shrink-0 rounded-xl border-2 bg-[#2563EB] text-white hover:bg-[#1d4ed8] hover:text-white lg:flex lg:size-12"
          onClick={() => scroll("left")}
          aria-label="Previous"
        >
          <ChevronLeft className="size-6" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden shrink-0 rounded-xl border-2 bg-[#2563EB] text-white hover:bg-[#1d4ed8] hover:text-white lg:flex lg:size-12"
          onClick={() => scroll("right")}
          aria-label="Next"
        >
          <ChevronRight className="size-6" />
        </Button>
      </div>
    </div>
  );
}
