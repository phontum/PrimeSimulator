import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps): JSX.Element {
  const variants = {
    primary: "bg-violet-500 text-white hover:bg-violet-400 disabled:bg-zinc-700",
    secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700",
  };

  return (
    <button
      className={`h-11 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
