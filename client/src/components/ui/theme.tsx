import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type IconProps = {
  icon: string;
  className?: string;
  onClick?: () => void;
};

export function Icon({ icon, className, onClick }: IconProps) {
  // Split the icon string to get class names
  const classNames = icon.split(' ');
  
  return (
    <i 
      className={cn(classNames, className)} 
      onClick={onClick}
    />
  );
}

// Simple theme provider to wrap the application
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <div className="theme-root">{children}</div>
  );
}

export const productTypeBadges = {
  buyOnly: "text-xs bg-blue-100 text-blue-700 py-1 px-2 rounded-full font-medium",
  tradeOnly: "text-xs bg-green-100 text-green-700 py-1 px-2 rounded-full font-medium",
  tradeOrBuy: "text-xs bg-purple-100 text-purple-700 py-1 px-2 rounded-full font-medium",
};

export const iconColors = {
  primary: "ri-compasses-2-fill text-primary text-2xl",
  secondary: "ri-compasses-2-fill text-secondary text-2xl",
  accent: "ri-compasses-2-fill text-accent text-2xl",
};

export const statusColors = {
  completed: "text-green-600 bg-green-50 border-green-200",
  pending: "text-amber-600 bg-amber-50 border-amber-200",
  disputed: "text-red-600 bg-red-50 border-red-200",
  cancelled: "text-neutral-600 bg-neutral-100 border-neutral-200",
  refunded: "text-blue-600 bg-blue-50 border-blue-200",
};