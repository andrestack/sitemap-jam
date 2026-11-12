"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";

export const buttonStyles = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium",
    "transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-out",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
  ],
  {
    variants: {
      variant: {
        primary: "bg-neutral-900 text-white hover:bg-neutral-700",
        // Gold leaf: the one call to action on a screen. The border gives the fill an edge on cream.
        gold: "border border-amber-500/60 bg-amber-400 text-neutral-900 hover:bg-amber-300",
        secondary: "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50",
        ghost: "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
        danger: "bg-red-600 text-white hover:bg-red-700",
        dashed: "border border-dashed border-neutral-300 text-neutral-500 hover:border-neutral-500 hover:bg-white hover:text-neutral-900",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "h-7 w-7",
        iconSm: "h-6 w-6",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={clsx(buttonStyles({ variant, size }), className)} {...props} />;
});

/** Icon-only button. The label is both the accessible name and a tooltip. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { label: ReactNode; ariaLabel: string; side?: "top" | "bottom" | "left" | "right" }
>(function IconButton({ label, ariaLabel, side = "top", variant = "ghost", size = "icon", className, type = "button", ...props }, ref) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        className={clsx(buttonStyles({ variant, size }), className)}
        {...props}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={6} className="z-50">
          <Tooltip.Popup className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white shadow-md transition-[opacity,scale] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
});
