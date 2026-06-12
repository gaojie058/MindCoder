import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — the single source of truth for actionable controls.
 *
 * Apple-HIG-flavored: continuous corners, restrained elevation, a calm
 * spring on press (active:scale), and one vibrant brand accent used
 * sparingly. Colors come entirely from design tokens (see index.css).
 *
 * Backward compatibility: older screens call <Button color="shallow|deep">
 * and rely on the legacy <div> render. That path is preserved untouched —
 * the new system only activates when an explicit `variant` is supplied.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold " +
    "rounded-xl transition-all duration-150 ease-out cursor-pointer select-none " +
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-background active:scale-[0.97] " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md",
        strong:
          "bg-primary-strong text-white shadow-sm hover:brightness-95 hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted",
        outline:
          "border border-primary/40 bg-transparent text-primary hover:bg-primary-tint",
        ghost:
          "bg-transparent text-foreground hover:bg-muted",
        ai:
          "border border-ai-border bg-ai-tint text-ai hover:brightness-[0.97]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:brightness-95 hover:shadow-md",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-footnote",
        md: "h-10 px-4 text-subhead",
        lg: "h-12 px-6 text-callout",
        icon: "h-10 w-10 p-0",
        pill: "h-9 px-4 text-footnote rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type LegacyColor = "shallow" | "deep";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** @deprecated legacy API — renders the old <div> pill. Prefer `variant`. */
  color?: LegacyColor;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, color, children, onClick, ...props }, ref) => {
    // ---- Legacy path: <Button color="shallow|deep"> renders a div pill. ----
    // Preserved verbatim so the 8 existing callers keep their exact layout.
    if (variant === undefined && size === undefined && !asChild) {
      const legacyColor: LegacyColor = color ?? "shallow";
      return (
        <div
          className={cn(
            legacyColor === "deep" ? "bg-deepbg" : "bg-shallowbg",
            "flex items-center justify-center text-white text-center cursor-pointer",
            className
          )}
          onClick={onClick as unknown as React.MouseEventHandler<HTMLDivElement>}
        >
          {children}
        </div>
      );
    }

    // ---- New path: token-driven, accessible <button>. ----
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        onClick={onClick}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export default Button;
export { Button };
