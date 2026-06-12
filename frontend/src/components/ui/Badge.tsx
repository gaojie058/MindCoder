import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — compact status / tag pill. Token-driven, pairs with Button.
 */
export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-semibold transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        brand: "bg-primary-tint text-primary-strong",
        neutral: "bg-muted text-muted-foreground",
        ai: "bg-ai-tint text-ai border border-ai-border",
        success: "bg-emerald-50 text-emerald-600",
        warning: "bg-amber-50 text-amber-600",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border border-border text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-caption2",
        md: "px-2.5 py-0.5 text-caption",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export default function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge };
