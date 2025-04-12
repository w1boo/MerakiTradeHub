import { ReactNode } from "react";

// Icons from Remix Icon CDN
export const remixIcon = "https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css";

// Primary icon colors based on theme
export const iconColors = {
  primary: "ri-exchange-box-fill mr-2 text-accent",
  secondary: "ri-wallet-3-line text-xl text-primary",
  accent: "ri-exchange-dollar-line text-xl text-secondary",
  listingItem: "ri-shopping-bag-line text-xl text-accent",
  history: "ri-history-line text-xl text-primary",
  success: "ri-check-line text-3xl",
  warning: "ri-alert-line text-3xl",
  error: "ri-close-line text-3xl"
};

// Status colors
export const statusColors = {
  completed: "bg-status-success/10 text-status-success",
  inProgress: "bg-status-warning/10 text-status-warning",
  pending: "bg-status-warning/10 text-status-warning",
  cancelled: "bg-status-error/10 text-status-error",
  disputed: "bg-status-error/10 text-status-error",
  refunded: "bg-status-error/10 text-status-error"
};

// Categories with their icons
export const categoryIcons = {
  "Electronics": "ri-computer-line text-xl text-primary",
  "Fashion": "ri-t-shirt-line text-xl text-secondary",
  "Home & Garden": "ri-home-line text-xl text-accent",
  "Sports": "ri-basketball-line text-xl text-primary",
  "Collectibles": "ri-gallery-line text-xl text-secondary",
  "Books & Media": "ri-book-open-line text-xl text-accent",
  "Toys & Games": "ri-gamepad-line text-xl text-primary"
}

// Product type badges
export const productTypeBadges = {
  "tradeOrBuy": "bg-primary text-white text-xs font-bold uppercase rounded-full py-1 px-2",
  "tradeOnly": "bg-accent text-white text-xs font-bold uppercase rounded-full py-1 px-2",
  "buyOnly": "bg-secondary text-white text-xs font-bold uppercase rounded-full py-1 px-2"
}

// Wrapper for Remix icons
export const Icon = ({ icon, className = "" }: { icon: string, className?: string }) => {
  return <i className={`${icon} ${className}`}></i>
}

// Helper to load Remix Icon CSS
export const loadRemixIcons = () => {
  if (typeof document !== 'undefined') {
    // Only run in browser environment
    const linkExists = document.querySelector(`link[href="${remixIcon}"]`);
    if (!linkExists) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = remixIcon;
      document.head.appendChild(link);
    }
  }
}

// Theme provider that loads icons
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  loadRemixIcons();
  return <>{children}</>;
}
