import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  buy: "bg-up text-ink hover:bg-up/90",
  sell: "bg-down text-ink hover:bg-down/90",
  outline: "border border-input bg-transparent hover:bg-secondary",
  secondary: "bg-secondary text-foreground hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
} as const;
const SIZES = {
  default: "h-9 px-3.5",
  sm: "h-7 gap-1 rounded-md px-2.5 text-xs",
  lg: "h-11 px-5 text-base",
  icon: "size-9",
  "icon-sm": "size-7 rounded-md",
} as const;

export type ButtonStyle = { variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES; className?: string };

/** Classes for a button, so links can look like one too. */
export const buttonClass = ({ variant = "default", size = "default", className }: ButtonStyle = {}) =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

export function Button({ variant, size, className, ...props }: React.ComponentProps<"button"> & ButtonStyle) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}
