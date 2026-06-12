import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "h-12 w-full rounded-md border border-[#dfe5d8] bg-white px-4 text-base text-[#16231d] outline-none transition focus:border-[#0b6b43] focus:ring-2 focus:ring-[#dff5df]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
