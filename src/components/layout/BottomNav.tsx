"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/i18n/LocaleProvider";
import { NAV_ITEMS, isNavItemActive, type NavItem } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <nav
      className="relative flex h-21 shrink-0 items-stretch justify-between border-t-2 border-dashed border-stitch bg-nav px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label={t.nav.home}
    >
      {NAV_ITEMS.slice(0, 2).map((item) => (
        <NavLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} />
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

      {NAV_ITEMS.slice(2).map((item) => (
        <NavLink key={item.href} item={item} active={isNavItemActive(pathname, item.href)} />
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
