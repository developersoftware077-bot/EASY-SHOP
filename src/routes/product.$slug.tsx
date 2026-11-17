import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MessageCircle, ShoppingBag, Share2, ChevronLeft, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { money, waLink, useCart, useStoreConfig, type Product } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
type ProductImage = { image_url: string; is_primary: boolean; sort_order: number };
type ProductResult = Product & {
  product_images?: Array<ProductImage & { id: string; alt_text: string | null }>;
};
async function loadProduct(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*,categories(name,name_sw),product_images(id,image_url,alt_text,is_primary,sort_order)",
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const images = ((data as ProductResult).product_images || []).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  return { ...data, images, image: images[0]?.image_url } as Product;
}
export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
  loader: ({ params }) => loadProduct(params.slug),
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.seo_title || loaderData.name} | EASY SHOP` },
            {
              name: "description",
              content:
                loaderData.seo_description ||
                loaderData.short_description ||
                loaderData.description,
            },
            { property: "og:title", content: `${loaderData.name} | EASY SHOP` },
            {
              property: "og:description",
              content: loaderData.seo_description || loaderData.short_description,
            },
            { property: "og:image", content: loaderData.image || "/product-placeholder.svg" },
            { property: "og:url", content: `${__SITE_URL__}/product/${loaderData.slug}` },
            { name: "twitter:card", content: "summary_large_image" },
          ],
          links: [
            { rel: "canonical", href: `${__SITE_URL__}/product/${loaderData.slug}` },
            {
              rel: "alternate",
              hrefLang: "en",
              href: `${__SITE_URL__}/product/${loaderData.slug}?lang=en`,
            },
            {
              rel: "alternate",
              hrefLang: "sw",
              href: `${__SITE_URL__}/product/${loaderData.slug}?lang=sw`,
            },
          ],
        }
      : { meta: [{ title: "Product | EASY SHOP" }] },
});
function ProductPage() {
  const { slug } = Route.useParams();
  const { lang } = useI18n();
  const config = useStoreConfig();
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const loaderProduct = Route.useLoaderData();
  const { data: p, isLoading } = useQuery<Product | null>({
    queryKey: ["product", slug],
    queryFn: () => loadProduct(slug),
    initialData: loaderProduct,
  });
  const { data: related = [] } = useQuery<Product[]>({
    queryKey: ["related-products", p?.category_id, p?.id],
    enabled: Boolean(p?.category_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "*,categories(name,name_sw),product_images(id,image_url,alt_text,is_primary,sort_order)",
        )
        .eq("active", true)
        .eq("category_id", p!.category_id)
        .neq("id", p!.id)
        .limit(4);
      if (error) throw error;
      return (data ?? []).map((item: ProductResult) => ({
        ...item,
        image: item.product_images?.sort(
          (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
        )[0]?.image_url,
      })) as Product[];
    },
  });
  useEffect(() => {
    if (!p) return;
    document.title = `${p.seo_title || p.name} | EASY SHOP`;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement("meta");
      description.setAttribute("name", "description");
      document.head.append(description);
    }
    description.setAttribute("content", p.seo_description || p.short_description || p.description);
  }, [p]);
  if (isLoading)
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-5 py-24">
          <div className="grid animate-pulse gap-8 md:grid-cols-2">
            <div className="aspect-square rounded-3xl bg-slate-200" />
            <div className="space-y-4 py-10">
              <div className="h-8 w-2/3 rounded bg-slate-200" />
              <div className="h-5 w-1/3 rounded bg-slate-200" />
              <div className="h-24 rounded bg-slate-200" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  if (!p)
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-5 py-24 text-center">
          <h1 className="text-2xl font-bold">
            {lang === "sw" ? "Bidhaa haipatikani" : "Product unavailable"}
          </h1>
          <Link to="/" className="mt-5 inline-block text-teal-700">
            {lang === "sw" ? "Rudi dukani" : "Back to shop"}
          </Link>
        </main>
        <Footer />
      </>
    );
  const images = p.images?.length
    ? p.images.map((x) => x.image_url)
    : [p.image || "/product-placeholder.svg"];
  const image = images[Math.min(selectedImage, images.length - 1)];
  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: [image.startsWith("http") ? image : `${__SITE_URL__}${image}`],
    description: p.description || p.short_description,
    sku: p.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: config.currency,
      price: p.price,
      availability:
        p.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${__SITE_URL__}/product/${p.slug}`,
    },
  };
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EASY SHOP", item: `${__SITE_URL__}/` },
      { "@type": "ListItem", position: 2, name: p.name, item: `${__SITE_URL__}/product/${p.slug}` },
    ],
  };
  const message = `Hello ${config.name}, I'd like ${qty} × ${p.name} (${money(qty * p.price, config.currency)}).`;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500">
          <ChevronLeft size={16} />
          {lang === "sw" ? "Endelea kununua" : "Continue shopping"}
        </Link>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <button
              type="button"
              onClick={() => setZoom(true)}
              onTouchStart={(e) => setTouchStart(e.touches[0]?.clientX ?? null)}
              onTouchEnd={(e) => {
                const end = e.changedTouches[0]?.clientX ?? 0;
                if (touchStart !== null && Math.abs(end - touchStart) > 45)
                  setSelectedImage(
                    (current) =>
                      (current + (end < touchStart ? 1 : -1) + images.length) % images.length,
                  );
              }}
              className="block w-full overflow-hidden rounded-3xl bg-white shadow-soft"
              aria-label={lang === "sw" ? "Panua picha" : "Zoom product image"}
            >
              <img
                src={image}
                alt={p.name}
                width="800"
                height="800"
                fetchPriority="high"
                className="aspect-square w-full object-cover"
              />
            </button>
            {images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto">
                {images.map((src, index) => (
                  <button
                    key={src}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`${lang === "sw" ? "Picha" : "Image"} ${index + 1}`}
                    aria-pressed={selectedImage === index}
                    className={`shrink-0 overflow-hidden rounded-xl border-2 ${selectedImage === index ? "border-teal-500" : "border-transparent"}`}
                  >
                    <img
                      src={src}
                      alt={p.images?.[index]?.alt_text || `${p.name} ${index + 1}`}
                      width="72"
                      height="72"
                      loading="lazy"
                      className="h-16 w-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              {p.categories?.name}
            </p>
            <h1 className="mt-2 text-3xl font-bold">{p.name}</h1>
            <p className="mt-4 text-2xl font-bold text-teal-700">
              {money(p.price, config.currency)}{" "}
              {p.compare_at_price && (
                <del className="ml-2 text-lg font-normal text-slate-400">
                  {money(p.compare_at_price, config.currency)}
                </del>
              )}
            </p>
            <p className="mt-2 text-sm">
              {p.stock_quantity > 0
                ? lang === "sw"
                  ? `Inapatikana · ${p.stock_quantity} zimesalia`
                  : `In stock · ${p.stock_quantity} available`
                : lang === "sw"
                  ? "Imeisha"
                  : "Out of stock"}
            </p>
            <p className="mt-6 leading-relaxed text-slate-600">
              {p.description || p.short_description}
            </p>
            <div className="mt-7 flex items-center gap-3">
              <label htmlFor="quantity" className="text-sm">
                {lang === "sw" ? "Idadi" : "Quantity"}
              </label>
              <input
                id="quantity"
                aria-label="Quantity"
                type="number"
                min={1}
                max={p.stock_quantity}
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(1, Math.min(p.stock_quantity, Number(e.target.value))))
                }
                className="w-20 rounded-xl border p-2"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                disabled={!p.stock_quantity}
                onClick={() => {
                  add(p, qty);
                  toast.success(lang === "sw" ? "Imeongezwa kikapuni" : "Added to cart");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <ShoppingBag size={16} />
                {lang === "sw" ? "Ongeza kikapuni" : "Add to cart"}
              </button>
              <a
                href={waLink(message, config.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
              <button
                aria-label="Share product"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success(lang === "sw" ? "Kiungo kimenakiliwa" : "Link copied");
                }}
                className="rounded-full border p-3"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold">
              {lang === "sw" ? "Bidhaa zinazofanana" : "You may also like"}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((product) => (
                <div key={product.id}>
                  <Link
                    to="/product/$slug"
                    params={{ slug: product.slug }}
                    className="block overflow-hidden rounded-2xl bg-white shadow-soft"
                  >
                    <img
                      src={product.image || "/product-placeholder.svg"}
                      alt={product.name}
                      width="360"
                      height="360"
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-3">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-teal-700">
                        {money(product.price, config.currency)}
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      {zoom && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={p.name}
          onClick={() => setZoom(false)}
        >
          <button
            className="absolute right-5 top-5 rounded-full bg-white p-2"
            aria-label="Close image"
            onClick={() => setZoom(false)}
          >
            <X />
          </button>
          <img
            src={image}
            alt={p.name}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      <Footer />
    </>
  );
}
