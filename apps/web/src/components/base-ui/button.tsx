import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  { variants: {
    variant: { default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90", outline: "border-border bg-background hover:bg-muted hover:text-foreground", secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90", ghost: "hover:bg-muted hover:text-foreground", destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20", link: "text-primary underline-offset-4 hover:underline" },
    size: { default: "h-9 gap-1.5 px-3", xs: "h-6 gap-1 px-2 text-xs", sm: "h-7 gap-1 px-2.5 text-[0.8rem]", lg: "h-10 gap-1.5 px-4", icon: "size-9", "icon-xs": "size-6", "icon-sm": "size-7", "icon-lg": "size-10" },
  }, defaultVariants: { variant: "default", size: "default" } },
);

function Button({ className, variant = "default", size = "default", ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
