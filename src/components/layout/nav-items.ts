import type { IconName } from "@/components/ui/Icon";

export type NavLabelKey = "home" | "library" | "notes" | "stats";

export type NavItem = {
  href: string;
  icon: IconName;
  labelKey: NavLabelKey;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: "home", labelKey: "home" },
  { href: "/library", icon: "library", labelKey: "library" },
  { href: "/notes", icon: "notes", labelKey: "notes" },
  { href: "/stats", icon: "stats", labelKey: "stats" },
];
