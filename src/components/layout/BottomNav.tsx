"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";

type NavItem = {
  href: string;
  icon: IconName;
  labelKey: "home" | "library" | "notes" | "stats";
};

const items: NavItem[] = [
  { href: "/", icon: "home", labelKey: "home" },
  { href: "/library", icon: "library", labelKey: "library" },
  { href: "/notes", icon: "notes", labelKey: "notes" },
  { href: "/stats", icon: "stats", labelKey: "stats" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav
      className="relative flex h-21 shrink-0 items-stretch justify-between border-t-2 border-dashed border-stitch bg-nav px-2 pb-[env(safe-area-inset-bottom)]"
      aria-label={t.nav.home}
    >
      {items.slice(0, 2).map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}

      <Link
        href="/session"
        aria-label={t.nav.start}
        className="relative -mt-[30px] flex w-16 flex-col items-center justify-end gap-1"
      >
        <span
          className="flex h-15 w-15 items-center justify-center rounded-full bg-accent text-accent-on"
          style={{
            boxShadow: "0 0 0 4px var(--nav), 0 0 0 6px var(--accent), var(--shadow-cta)",
          }}
        >
          <Icon name="start" width={26} height={26} />
        </span>
        <span className="text-xs font-bold text-accent">{t.nav.start}</span>
      </Link>

      {items.slice(2).map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}
    </nav>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useLocale();
  const label = t.nav[item.labelKey];

  return (
    <Link
      href={item.href}
      className={`flex w-16 flex-col items-center justify-center gap-1 ${
        active ? "text-accent" : "text-muted"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon name={item.icon} />
      <span className={`text-xs ${active ? "font-bold" : ""}`}>{label}</span>
    </Link>
  );
}
