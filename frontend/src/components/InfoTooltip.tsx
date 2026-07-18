import React from "react";
import * as Popover from "@radix-ui/react-popover";

interface InfoTooltipProps {
  content: string | React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
  content, 
  side = "top", 
  align = "center" 
}) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Help information"
          className="inline-flex items-center justify-center w-4 h-4 ml-1.5 text-xs font-semibold text-gray-400 bg-gray-100 hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-help"
        >
          ?
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={side}
          align={align}
          sideOffset={6}
          className="z-50 max-w-xs p-3 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          <div className="font-normal leading-relaxed whitespace-pre-line">
            {content}
          </div>
          
          {/* Subtle accent arrow pointing to the host element */}
          <Popover.Arrow className="fill-white dark:fill-gray-900 stroke-gray-200 dark:stroke-gray-800 stroke-1" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};