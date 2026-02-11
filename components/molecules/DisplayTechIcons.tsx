// components/DisplayTechIcons.tsx
import React from "react";
import { cn } from "@/lib/utils";
import TechIcon from "./TechIcon";
import type { TechIconProps } from "@/types";

const DisplayTechIcons = ({ techStack }: TechIconProps) => {
  if (!techStack || !Array.isArray(techStack) || techStack.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-row items-center">
      {techStack.slice(0, 3).map((tech, index) => (
        <div
          key={tech}
          className={cn(
            "relative flex items-center justify-center rounded-full border border-border bg-card p-2 shadow-sm transition-transform hover:z-10 hover:scale-110",
            index >= 1 && "-ml-2.5",
          )}
        >
          <TechIcon tech={tech} size={24} className="size-6" showTooltip />
        </div>
      ))}
    </div>
  );
};

export default DisplayTechIcons;
