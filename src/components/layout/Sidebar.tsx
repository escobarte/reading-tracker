"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonBaseClass, buttonVariantClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StitchBar } from "@/components/ui/StitchBar";
import { useLocale } from "@/i18n/LocaleProvider";
import { NAV_ITEMS, type NavItem } from "./nav-items";

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [logoLabel, ...logoTitleParts] = t.common.appName.split(" ");
  const logoTitle = logoTitleParts.join(" ");

  return (
    <aside
      className={`hidden w-62 shrink-0 flex-col border-r-2 border-dashed border-stitch bg-nav px-4 pb-6 pt-7 lg:flex ${className}`}
    >
      <Link href="/" className="mb-6 block">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{logoLabel}</p>
        <p className="font-serif text-[28px] font-bold leading-[1.15] text-text">{logoTitle}</p>
      </Link>

      <Link
        href="/session"
        className={`mb-6 w-full ${buttonBaseClass} ${buttonVariantClasses.primary}`}
      >
        <Icon name="start" width={20} height={20} />
        {t.sidebar.startSession}
      </Link>

      <nav className="flex flex-col gap-1" aria-label={t.nav.home}>
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} active={pathname === item.href} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="font-mono text-xs text-muted">{t.sidebar.today}</p>
          <p className="font-mono text-2xl text-text">
            0 <span className="text-sm text-muted">{t.sidebar.pagesOf} 30 {t.sidebar.pagesUnit}</span>
          </p>
          <div className="mt-2">
            <StitchBar percent={0} />
          </div>
        </div>

        <Link
          href="/settings"
          className="flex h-12 items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-stitch font-serif text-sm text-text lg:hover:bg-surface-2"
        >
          <Icon name="settings" width={20} height={20} />
          {t.home.settings}
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const { t } = useLocale();
  const label = t.nav[item.labelKey];

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-12 items-center gap-3 rounded-md px-3 font-serif text-[17px] ${
        active
          ? "border-[1.5px] border-line bg-surface font-bold text-accent"
          : "border-[1.5px] border-transparent text-muted lg:hover:bg-surface-2"
      }`}
    >
      <Icon name={item.icon} />
      {label}
    </Link>
  );
}
