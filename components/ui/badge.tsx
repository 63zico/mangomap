import * as React from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#dfe5d8] bg-[#f8faf4] px-2.5 py-1 text-xs font-semibold text-[#345046]",
        className,
      )}
      {...props}
    />
  );
}
