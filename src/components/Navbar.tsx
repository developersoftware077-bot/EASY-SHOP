import { Link, useRouterState } from "@tanstack/react-router";
import { Instagram, Menu, X, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart, useStoreConfig } from "@/lib/store";
import { Logo } from "@/components/Logo";
export function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const config = useStoreConfig();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const langToggle = (
    <div className="inline-flex rounded-full border bg-white p-0.5 text-xs font-semibold">
      {(["en", "sw"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 ${lang === l ? "bg-brand-gradient text-white" : "text-slate-600"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
  return (
    <nav className="sticky top-0 z-40 border-b border-border/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <div className="leading-tight">
            <div className="text-base font-bold tracking-tight">{config.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              {t("brand_tagline")}
            </div>
          </div>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" className={path === "/" ? "text-teal-700" : "text-slate-700"}>
            {t("nav_home")}
          </Link>
          <Link to="/admin" className="text-slate-700">
            {t("nav_admin")}
          </Link>
          <a
            href={`https://instagram.com/${config.instagram}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="text-slate-600"
          >
            <Instagram size={18} />
          </a>
          {langToggle}
          {isAdmin && (
            <button onClick={signOut} className="text-xs text-slate-500">
              {t("nav_signout")}
            </button>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-teal-700">
            <ShoppingBag size={17} />
            {count}
          </span>
        </div>
        <button
          className="rounded-lg p-2 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="flex items-center justify-between border-t bg-white px-5 py-4 md:hidden">
          <div className="flex gap-4">
            <Link to="/">{t("nav_home")}</Link>
            <Link to="/admin">{t("nav_admin")}</Link>
            <a href={`https://instagram.com/${config.instagram}`} aria-label="Instagram">
              <Instagram size={18} />
            </a>
          </div>
          {langToggle}
        </div>
      )}
    </nav>
  );
}
