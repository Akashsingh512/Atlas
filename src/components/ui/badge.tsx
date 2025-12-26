import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        // Lead status variants
        open: "border bg-status-open/10 text-status-open border-status-open/30",
        "follow-up": "border bg-status-follow-up/10 text-status-follow-up border-status-follow-up/30",
        closed: "border bg-status-closed/10 text-status-closed border-status-closed/30",
        junk: "border bg-status-junk/10 text-status-junk border-status-junk/30",
        future: "border bg-status-future/10 text-status-future border-status-future/30",
        others: "border bg-status-others/10 text-status-others border-status-others/30",
        // Role badges
        admin: "border-transparent gradient-primary text-primary-foreground",
        user: "border-transparent bg-accent text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
