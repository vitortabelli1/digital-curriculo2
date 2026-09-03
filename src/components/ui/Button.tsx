import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "gradient" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#111111] text-white shadow-[0_10px_30px_rgba(0,0,0,.15)] hover:bg-black hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,.18)]",
  secondary:
    "bg-white text-[#111111] border border-[#DADADA] hover:bg-[#F8F8F8]",
  gradient:
    "bg-gradient-to-r from-[#FF5A1F] to-[#FF7A45] text-white shadow-[0_10px_30px_rgba(255,90,31,.25)] hover:shadow-[0_14px_34px_rgba(255,90,31,.32)]",
  ghost: "text-[#6B7280] hover:bg-[#F8F8F8] hover:text-[#111111]",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-8 text-[15px] font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
