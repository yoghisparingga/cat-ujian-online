import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500",
  secondary:
    "bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-100 disabled:opacity-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  ghost: "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  );
}
