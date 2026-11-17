/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
export type Lang = "en" | "sw";
const dict = {
  brand_tagline: { en: "Online shop", sw: "Duka la mtandaoni" },
  nav_home: { en: "Home", sw: "Nyumbani" },
  nav_admin: { en: "Admin", sw: "Msimamizi" },
  nav_signout: { en: "Sign out", sw: "Toka" },
  footer_about: {
    en: "Everyday essentials, thoughtfully selected.",
    sw: "Bidhaa za kila siku zilizochaguliwa kwa umakini.",
  },
  footer_links: { en: "Quick links", sw: "Viungo" },
  footer_contact: { en: "Contact", sw: "Wasiliana" },
  dashboard: { en: "Dashboard", sw: "Dashibodi" },
  products: { en: "Products", sw: "Bidhaa" },
  categories: { en: "Categories", sw: "Kategoria" },
  orders: { en: "Orders", sw: "Maagizo" },
  settings: { en: "Settings", sw: "Mipangilio" },
  sign_in: { en: "Sign in", sw: "Ingia" },
  admin_login: { en: "Admin sign in", sw: "Ingia kama msimamizi" },
  admin_notice: {
    en: "Admin access is assigned securely by the database owner.",
    sw: "Ruhusa ya usimamizi hutolewa kwa usalama na mmiliki wa hifadhidata.",
  },
  email: { en: "Email", sw: "Barua pepe" },
  password: { en: "Password", sw: "Nenosiri" },
  store_dashboard: { en: "Store dashboard", sw: "Dashibodi ya duka" },
  total_products: { en: "Total products", sw: "Jumla ya bidhaa" },
  low_stock: { en: "Low stock", sw: "Bidhaa chache" },
  total_orders: { en: "Total orders", sw: "Jumla ya maagizo" },
  new_orders: { en: "New orders", sw: "Maagizo mapya" },
  search_products: { en: "Search products…", sw: "Tafuta bidhaa…" },
  all_categories: { en: "All categories", sw: "Kategoria zote" },
  all_statuses: { en: "All statuses", sw: "Hali zote" },
  active: { en: "Active", sw: "Hai" },
  draft: { en: "Draft", sw: "Rasimu" },
  featured: { en: "Featured", sw: "Zinazopendwa" },
  edit: { en: "Edit", sw: "Hariri" },
  delete: { en: "Delete", sw: "Futa" },
  add_product: { en: "Add product", sw: "Ongeza bidhaa" },
  save: { en: "Save", sw: "Hifadhi" },
  cancel: { en: "Cancel", sw: "Ghairi" },
  product_name: { en: "Product name", sw: "Jina la bidhaa" },
  slug: { en: "URL slug", sw: "Jina la kiungo" },
  category: { en: "Category", sw: "Kategoria" },
  choose_category: { en: "Choose a category", sw: "Chagua kategoria" },
  price: { en: "Price", sw: "Bei" },
  old_price: { en: "Compare-at price", sw: "Bei ya awali" },
  stock: { en: "Stock quantity", sw: "Kiasi kilichopo" },
  sku: { en: "SKU", sw: "SKU" },
  short_description: { en: "Short description", sw: "Maelezo mafupi" },
  description: { en: "Description (Markdown)", sw: "Maelezo (Markdown)" },
  preview: { en: "Preview", sw: "Mwonekano" },
  seo_title: { en: "SEO title", sw: "Kichwa cha SEO" },
  seo_description: { en: "SEO description", sw: "Maelezo ya SEO" },
  images: { en: "Product images", sw: "Picha za bidhaa" },
  main_image: { en: "Main image", sw: "Picha kuu" },
  drop_images: {
    en: "Drop images here or choose files",
    sw: "Dondosha picha hapa au chagua faili",
  },
  upload: { en: "Upload", sw: "Pakia" },
  out_of_stock: { en: "Out of stock", sw: "Imeisha" },
  no_results: { en: "No results found.", sw: "Hakuna matokeo." },
  confirm_delete_product: { en: "Delete this product?", sw: "Futa bidhaa hii?" },
  total_sales: { en: "Orders by status", sw: "Maagizo kwa hali" },
  recent_orders: { en: "Recent orders", sw: "Maagizo ya hivi karibuni" },
  customer: { en: "Customer", sw: "Mteja" },
  status: { en: "Status", sw: "Hali" },
  contact_whatsapp: { en: "Contact on WhatsApp", sw: "Wasiliana kupitia WhatsApp" },
  order_details: { en: "Order details", sw: "Maelezo ya agizo" },
  print: { en: "Print", sw: "Chapisha" },
  category_name: { en: "Category name", sw: "Jina la kategoria" },
  name_swahili: { en: "Swahili name", sw: "Jina la Kiswahili" },
  category_description_en: {
    en: "Category description (English)",
    sw: "Maelezo ya kategoria (Kiingereza)",
  },
  category_description_sw: {
    en: "Category description (Swahili)",
    sw: "Maelezo ya kategoria (Kiswahili)",
  },
  image_url: { en: "Image URL", sw: "Kiungo cha picha" },
  sort_order: { en: "Sort order", sw: "Mpangilio" },
  add_category: { en: "Add category", sw: "Ongeza kategoria" },
  store_name: { en: "Store name", sw: "Jina la duka" },
  whatsapp_number: { en: "WhatsApp number", sw: "Namba ya WhatsApp" },
  instagram_handle: { en: "Instagram handle", sw: "Jina la Instagram" },
  hero_headline_en: { en: "Hero headline (English)", sw: "Kichwa kikuu (Kiingereza)" },
  hero_headline_sw: { en: "Hero headline (Swahili)", sw: "Kichwa kikuu (Kiswahili)" },
  hero_sub_en: { en: "Hero subtext (English)", sw: "Maelezo ya mwanzo (Kiingereza)" },
  hero_sub_sw: { en: "Hero subtext (Swahili)", sw: "Maelezo ya mwanzo (Kiswahili)" },
  currency: { en: "Currency", sw: "Sarafu" },
  contact_phone: { en: "Contact phone", sw: "Simu ya mawasiliano" },
  contact_email: { en: "Contact email", sw: "Barua pepe ya mawasiliano" },
  footer_en: { en: "Footer text (English)", sw: "Maandishi ya chini (Kiingereza)" },
  footer_sw: { en: "Footer text (Swahili)", sw: "Maandishi ya chini (Kiswahili)" },
  save_settings: { en: "Save settings", sw: "Hifadhi mipangilio" },
  product_saved: { en: "Product saved", sw: "Bidhaa imehifadhiwa" },
  category_saved: { en: "Category saved", sw: "Kategoria imehifadhiwa" },
  deleted: { en: "Deleted", sw: "Imefutwa" },
  order_saved: { en: "Order status updated", sw: "Hali ya agizo imesasishwa" },
  no_categories: {
    en: "Add a category to organize products.",
    sw: "Ongeza kategoria kupanga bidhaa.",
  },
  no_orders: { en: "No orders yet.", sw: "Bado hakuna maagizo." },
  page: { en: "Page", sw: "Ukurasa" },
  previous: { en: "Previous", sw: "Iliyotangulia" },
  next: { en: "Next", sw: "Ifuatayo" },
  new: { en: "New", sw: "Mpya" },
  confirmed: { en: "Confirmed", sw: "Imethibitishwa" },
  delivered: { en: "Delivered", sw: "Imewasilishwa" },
  cancelled: { en: "Cancelled", sw: "Imeghairiwa" },
  loading: { en: "Loading…", sw: "Inapakia…" },
} as const;
export type I18nKey = keyof typeof dict;
type Key = I18nKey;
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string };
const I18nContext = createContext<Ctx | null>(null);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const queryLanguage = new URLSearchParams(window.location.search).get("lang");
    const saved = queryLanguage || sessionStorage.getItem("easy-shop-lang");
    if (saved === "en" || saved === "sw") setLangState(saved);
    document.documentElement.lang = saved === "sw" ? "sw" : "en";
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    sessionStorage.setItem("easy-shop-lang", l);
    document.documentElement.lang = l;
  };
  const t = (k: Key) => dict[k][lang];
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
