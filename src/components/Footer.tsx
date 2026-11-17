import { Instagram, Phone, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { waLink, useStoreConfig } from "@/lib/store";
import { Logo } from "@/components/Logo";
export function Footer() {
  const { t } = useI18n();
  const { name, whatsapp, instagram, contact_phone, contact_email, footer_en, footer_sw } =
    useStoreConfig();
  const { lang } = useI18n();
  return (
    <footer className="mt-20 border-t border-border bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-lg font-bold">{name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-600">
            {lang === "sw" ? footer_sw : footer_en}
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("footer_links")}</h2>
          <Link to="/" className="text-sm text-slate-600">
            {t("nav_home")}
          </Link>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">{t("footer_contact")}</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <a className="flex items-center gap-2" href={waLink(`Hello ${name}`, whatsapp)}>
              <MessageCircle size={14} />
              {contact_phone}
            </a>
            <a
              className="flex items-center gap-2"
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noreferrer"
            >
              <Instagram size={14} />@{instagram}
            </a>
            {contact_email && <a href={`mailto:${contact_email}`}>{contact_email}</a>}
            <span className="flex items-center gap-2">
              <Phone size={14} />
              Tanzania
            </span>
          </div>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} EASY SHOP · by SUFIAN technologies
      </div>
    </footer>
  );
}
