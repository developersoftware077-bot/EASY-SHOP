import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard as StorefrontProductCard } from "@/components/Storefront";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/store";

type Category = {
  id: string;
  name: string;
  name_sw: string | null;
  slug: string;
  description?: string;
  description_sw?: string | null;
};
type CategoryProduct = Product & {
  product_images?: Array<{
    id: string;
    image_url: string;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number;
  }>;
};
async function loadCategoryPage(slug: string) {
  const { data: category, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!category) return { category: null, products: [] as Product[] };
  const { data, error: productError } = await supabase
    .from("products")
    .select(
      "*,categories(name,name_sw),product_images(id,image_url,alt_text,is_primary,sort_order)",
    )
    .eq("category_id", category.id)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (productError) throw productError;
  const products = (data ?? []).map((row: CategoryProduct) => {
    const images = (row.product_images ?? []).sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    );
    return { ...row, images, image: images[0]?.image_url };
  }) as Product[];
  return { category: category as Category, products };
}
export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  loader: ({ params }) => loadCategoryPage(params.slug),
  head: ({ loaderData, params }) => {
    const item = loaderData?.category;
    return {
      meta: [
        { title: item ? `${item.name} | EASY SHOP` : "Category | EASY SHOP" },
        {
          name: "description",
          content: item?.description || `Shop ${item?.name || "category"} products at EASY SHOP.`,
        },
        { property: "og:title", content: item ? `${item.name} | EASY SHOP` : "EASY SHOP" },
        { property: "og:url", content: `${__SITE_URL__}/category/${params.slug}` },
      ],
      links: [
        { rel: "canonical", href: `${__SITE_URL__}/category/${params.slug}` },
        {
          rel: "alternate",
          hrefLang: "en",
          href: `${__SITE_URL__}/category/${params.slug}?lang=en`,
        },
        {
          rel: "alternate",
          hrefLang: "sw",
          href: `${__SITE_URL__}/category/${params.slug}?lang=sw`,
        },
      ],
    };
  },
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { lang } = useI18n();
  const loaderData = Route.useLoaderData();
  const { data: category, isLoading } = useQuery<Category | null>({
    queryKey: ["category", slug],
    queryFn: () => loadCategoryPage(slug).then((x) => x.category),
    initialData: loaderData.category,
  });
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["category-products", category?.id],
    enabled: Boolean(category?.id),
    queryFn: () => loadCategoryPage(slug).then((x) => x.products),
    initialData: loaderData.products,
  });
  useEffect(() => {
    if (!category) return;
    const name = lang === "sw" ? category.name_sw || category.name : category.name;
    document.title = `${name} | EASY SHOP`;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", category.description || `${name} products at EASY SHOP.`);
  }, [category, lang]);
  const title = category ? (lang === "sw" ? category.name_sw || category.name : category.name) : "";
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${__SITE_URL__}/product/${product.slug}`,
      name: product.name,
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "EASY SHOP", item: `${__SITE_URL__}/` },
      { "@type": "ListItem", position: 2, name: title, item: `${__SITE_URL__}/category/${slug}` },
    ],
  };
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumb]) }}
        />
        <nav
          aria-label={lang === "sw" ? "Breadcrumb" : "Breadcrumb"}
          className="mb-5 text-sm text-slate-500"
        >
          <Link to="/">EASY SHOP</Link> / {title}
        </nav>
        {isLoading ? (
          <div className="h-10 w-48 animate-pulse rounded bg-slate-200" />
        ) : category ? (
          <>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-slate-600">{category.description}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">
              {lang === "sw" ? "Kategoria haipatikani" : "Category not found"}
            </h1>
            <Link to="/" className="mt-3 inline-block text-teal-700">
              {lang === "sw" ? "Rudi dukani" : "Back to shop"}
            </Link>
          </>
        )}
        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {loadingProducts
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />
              ))
            : products.map((p) => <StorefrontProductCard key={p.id} p={p} />)}
          {!loadingProducts && category && products.length === 0 && (
            <p className="col-span-full py-12 text-center text-slate-500">
              {lang === "sw"
                ? "Hakuna bidhaa katika kategoria hii."
                : "No products in this category yet."}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
