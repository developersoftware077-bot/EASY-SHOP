import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ShoppingBag,
  Truck,
  ShieldCheck,
  MessageCircle,
  ChevronRight,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, useCart, waLink, useStoreConfig, type Product } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";
const CartDrawer = lazy(() => import("@/components/CartDrawer"));

type ProductImage = { image_url: string; is_primary: boolean; sort_order: number };
type ProductResult = Product & { product_images?: ProductImage[] };

export function Storefront() {
  const { lang } = useI18n();
  const { count } = useCart();
  const config = useStoreConfig();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [drawer, setDrawer] = useState(false);
  const [orderReference, setOrderReference] = useState("");
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "*,categories(name,name_sw),product_images(id,image_url,alt_text,is_primary,sort_order)",
        )
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: ProductResult) => ({
        ...p,
        image: p.product_images?.sort(
          (a: ProductImage, b: ProductImage) =>
            Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
        )[0]?.image_url,
      })) as Product[];
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,name_sw,slug,image_url")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const filtered = useMemo(() => {
    const list = products.filter(
      (p) =>
        (!category || p.category_id === category) &&
        (!query || `${p.name} ${p.short_description}`.toLowerCase().includes(query.toLowerCase())),
    );
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, category, query, sort]);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const heroTitle = lang === "sw" ? config.hero_sw : config.hero_en;
  const heroSub = lang === "sw" ? config.sub_sw : config.sub_en;
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: config.name,
              url: __SITE_URL__ || "/",
              sameAs: [`https://instagram.com/${config.instagram}`],
              contactPoint: {
                "@type": "ContactPoint",
                telephone: config.contact_phone,
                contactType: "customer service",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: config.name,
              potentialAction: {
                "@type": "SearchAction",
                target: `${__SITE_URL__ || ""}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
          ]),
        }}
      />
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-16 md:grid-cols-2">
          <div>
            <span className="rounded-full bg-brand-gradient-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-700">
              EASY SHOP
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-600">{heroSub}</p>
            <a
              href="#catalog"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow"
            >
              {lang === "sw" ? "Nunua sasa" : "Shop now"}
              <ChevronRight size={17} />
            </a>
          </div>
          <img
            src="/hero-products.svg"
            width="960"
            height="700"
            fetchPriority="high"
            alt="Fashion, home, beauty and electronics shopping collection"
            className="w-full rounded-[2rem] shadow-glow"
          />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 sm:px-6">
        {(
          [
            { Icon: PackageCheck, label: lang === "sw" ? "Bidhaa bora" : "Quality products" },
            { Icon: Truck, label: lang === "sw" ? "Usafirishaji wa haraka" : "Fast delivery" },
            { Icon: MessageCircle, label: lang === "sw" ? "Oda WhatsApp" : "Order on WhatsApp" },
            { Icon: ShieldCheck, label: lang === "sw" ? "Ununuzi salama" : "Secure shopping" },
          ] satisfies Array<{ Icon: LucideIcon; label: string }>
        ).map(({ Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-2xl bg-white p-3 text-xs font-semibold text-slate-700 shadow-soft sm:text-sm"
          >
            <Icon size={18} className="text-teal-600" />
            {label}
          </div>
        ))}
      </section>
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
          <h2 className="text-2xl font-bold">
            {lang === "sw" ? "Zinazopendwa" : "Featured picks"}
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
      <section id="catalog" className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              {lang === "sw" ? "Gundua" : "Discover"}
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {lang === "sw" ? "Nunua bidhaa" : "Shop products"}
            </h2>
          </div>
          <div className="flex gap-2">
            <label className="relative">
              <span className="sr-only">Search products</span>
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={lang === "sw" ? "Tafuta bidhaa…" : "Search products…"}
                className="w-48 rounded-full border bg-white py-2.5 pl-9 pr-3 text-sm sm:w-60"
              />
            </label>
            <select
              aria-label="Sort products"
              className="rounded-full border bg-white px-3 text-xs"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">{lang === "sw" ? "Mpya" : "Newest"}</option>
              <option value="low">
                {lang === "sw" ? "Bei: chini kwanza" : "Price: low to high"}
              </option>
              <option value="high">
                {lang === "sw" ? "Bei: juu kwanza" : "Price: high to low"}
              </option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${!category ? "bg-brand-gradient text-white" : "border bg-white text-slate-600"}`}
          >
            {lang === "sw" ? "Zote" : "All"}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${category === c.id ? "bg-brand-gradient text-white" : "border bg-white text-slate-600"}`}
            >
              {lang === "sw" ? c.name_sw || c.name : c.name}
            </button>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categories.map((item) => (
            <Link
              key={item.id}
              to="/category/$slug"
              params={{ slug: item.slug }}
              className="flex items-center gap-3 rounded-2xl border bg-white p-3 text-sm font-semibold shadow-soft transition hover:-translate-y-0.5"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  width="48"
                  height="48"
                  loading="lazy"
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient-soft text-teal-700">
                  <PackageCheck size={20} />
                </span>
              )}
              {lang === "sw" ? item.name_sw || item.name : item.name}
            </Link>
          ))}
        </div>
        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-white p-3">
                  <div className="aspect-square rounded-xl bg-slate-200" />
                  <div className="mt-3 h-4 rounded bg-slate-200" />
                </div>
              ))
            : filtered.map((p) => <ProductCard key={p.id} p={p} />)}
          {!isLoading && !filtered.length && (
            <p className="col-span-full py-14 text-center text-sm text-slate-500">
              {lang === "sw"
                ? "Hakuna bidhaa. Jaribu utafutaji mwingine."
                : "No products found. Try another search."}
            </p>
          )}
        </div>
      </section>
      <section className="mx-auto mt-16 max-w-7xl rounded-3xl bg-brand-gradient-soft px-5 py-10 sm:px-10">
        <h2 className="text-center text-2xl font-bold">
          {lang === "sw" ? "Jinsi ya kuagiza" : "How to order"}
        </h2>
        <div className="mx-auto mt-7 grid max-w-4xl gap-4 sm:grid-cols-3">
          {(lang === "sw"
            ? ["Chagua bidhaa unazopenda", "Ongeza kwenye kikapu", "Tuma agizo lako WhatsApp"]
            : ["Browse your favourites", "Add items to your cart", "Send your order on WhatsApp"]
          ).map((s, i) => (
            <div key={s} className="rounded-2xl bg-white p-5 shadow-soft">
              <span className="text-xl font-bold text-teal-600">0{i + 1}</span>
              <p className="mt-2 text-sm font-semibold">{s}</p>
            </div>
          ))}
        </div>
      </section>
      <a
        href={waLink(`Hello ${config.name}, I have a question.`, config.whatsapp)}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-24 left-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-white shadow-glow"
      >
        <MessageCircle size={23} />
      </a>
      {drawer && (
        <Suspense
          fallback={<div className="fixed inset-0 z-50 bg-slate-900/40" aria-busy="true" />}
        >
          <CartDrawer onClose={() => setDrawer(false)} onOrderComplete={setOrderReference} />
        </Suspense>
      )}
      {orderReference && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-confirmed-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-soft">
            <h2 id="order-confirmed-title" className="text-xl font-bold">
              {lang === "sw" ? "Agizo limehifadhiwa" : "Order saved"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {lang === "sw" ? "Nambari ya agizo lako" : "Your order reference"}
            </p>
            <p className="mt-1 font-bold text-teal-700">{orderReference}</p>
            <button
              onClick={() => setOrderReference("")}
              className="mt-5 rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white"
            >
              {lang === "sw" ? "Funga" : "Close"}
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setDrawer(true)}
        aria-label={`Open cart, ${count} items`}
        className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full border bg-white text-teal-700 shadow-soft"
      >
        <ShoppingBag />
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-gradient px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      </button>
    </main>
  );
}
export function ProductCard({ p }: { p: Product }) {
  const { add } = useCart();
  const { lang } = useI18n();
  const config = useStoreConfig();
  const image = p.image || "/product-placeholder.svg";
  return (
    <article className="group overflow-hidden rounded-2xl bg-white shadow-soft transition hover:-translate-y-0.5">
      <Link to="/product/$slug" params={{ slug: p.slug }}>
        <div className="relative aspect-square bg-slate-100">
          <img
            src={image}
            alt={p.name}
            loading="lazy"
            width="480"
            height="480"
            className="h-full w-full object-cover"
          />
          {p.compare_at_price && p.compare_at_price > p.price && (
            <span className="absolute left-2 top-2 rounded-full bg-brand-gradient px-2 py-1 text-[10px] font-bold text-white">
              -{Math.round((1 - p.price / p.compare_at_price) * 100)}%
            </span>
          )}
          {p.stock_quantity < 1 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-white">
              {lang === "sw" ? "Imeisha" : "Out of stock"}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="text-[10px] uppercase tracking-wide text-teal-700">
            {lang === "sw" ? p.categories?.name_sw || p.categories?.name : p.categories?.name}
          </p>
          <h3 className="mt-1 line-clamp-1 text-sm font-semibold">{p.name}</h3>
          <p className="mt-1 text-sm font-bold text-teal-700">
            {money(p.price, config.currency)}{" "}
            {p.compare_at_price && (
              <del className="ml-1 text-xs font-normal text-slate-400">
                {money(p.compare_at_price, config.currency)}
              </del>
            )}
          </p>
        </div>
      </Link>
      <div className="flex gap-2 px-3 pb-3">
        <button
          disabled={p.stock_quantity < 1}
          onClick={() => {
            add(p);
            toast.success(lang === "sw" ? "Imeongezwa kikapuni" : "Added to cart");
          }}
          className="flex-1 rounded-full bg-brand-gradient py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {lang === "sw" ? "Ongeza" : "Add to cart"}
        </button>
        <a
          href={waLink(`Hello ${config.name}, I would like to order ${p.name}.`, config.whatsapp)}
          target="_blank"
          rel="noreferrer"
          aria-label="Ask about product on WhatsApp"
          className="grid w-9 place-items-center rounded-full border text-teal-700"
        >
          <MessageCircle size={15} />
        </a>
      </div>
    </article>
  );
}
