import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50",
  secondary:
    "bg-surface text-plum border border-border-soft hover:bg-primary-soft disabled:opacity-50",
  danger: "bg-danger text-white hover:bg-red-700 disabled:bg-danger/50",
  ghost: "text-ink-muted hover:bg-primary-soft hover:text-primary",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
