import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, type FormEvent } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  Menu,
  Package,
  Plus,
  Search,
  Settings2,
  ShoppingCart,
  Tag,
  Trash2,
  Pencil,
  X,
  ExternalLink,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { money, useStoreConfig, waLink, type Product, type StoreConfig } from "@/lib/store";
import { useI18n, type I18nKey } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
});
type Category = {
  id: string;
  name: string;
  name_sw: string | null;
  slug: string;
  image_url: string | null;
  description: string | null;
  description_sw: string | null;
  sort_order: number;
  active: boolean;
};
type Order = {
  id: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  location_note: string | null;
  total: number;
  status: "new" | "confirmed" | "delivered" | "cancelled";
  created_at: string;
};
type AdminProduct = Product & {
  categories: { name: string; name_sw: string | null } | null;
  product_images: NonNullable<Product["images"]>;
};
type Tab = "dashboard" | "products" | "categories" | "orders" | "settings";
type Translate = (key: I18nKey) => string;
const tabKeys: Array<{
  id: Tab;
  icon: typeof Package;
  key: "dashboard" | "products" | "categories" | "orders" | "settings";
}> = [
  { id: "dashboard", icon: LayoutDashboard, key: "dashboard" },
  { id: "products", icon: Package, key: "products" },
  { id: "categories", icon: Tag, key: "categories" },
  { id: "orders", icon: ShoppingCart, key: "orders" },
  { id: "settings", icon: Settings2, key: "settings" },
];

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const config = useStoreConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editor, setEditor] = useState<Product | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const productsQuery = useQuery<AdminProduct[]>({
    queryKey: ["products"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "*,categories(name,name_sw),product_images(id,image_url,alt_text,is_primary,sort_order)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: AdminProduct) => ({
        ...p,
        images: p.product_images,
        image:
          p.product_images?.find((x) => x.is_primary)?.image_url ||
          p.product_images?.[0]?.image_url,
      })) as AdminProduct[];
    },
  });
  const categoriesQuery = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
  const ordersQuery = useQuery<Order[]>({
    queryKey: ["orders"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categories = categoriesQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (!categoryFilter || p.category_id === categoryFilter) &&
        (!statusFilter || (statusFilter === "active" ? p.active : !p.active)) &&
        (!q || `${p.name} ${p.slug} ${p.sku || ""}`.toLowerCase().includes(q)),
    );
    if (sort === "price-low") list.sort((a, b) => a.price - b.price);
    if (sort === "price-high") list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, search, categoryFilter, statusFilter, sort]);
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter, statusFilter, sort]);
  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["products"] }),
      qc.invalidateQueries({ queryKey: ["orders"] }),
      qc.invalidateQueries({ queryKey: ["admin-categories"] }),
      qc.invalidateQueries({ queryKey: ["store-config"] }),
    ]);
  }
  async function removeProduct(product: Product) {
    if (!window.confirm(t("confirm_delete_product"))) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("deleted"));
      await refresh();
    }
  }
  async function toggleProduct(product: Product, field: "active" | "featured") {
    const { error } = await supabase
      .from("products")
      .update({ [field]: !product[field] })
      .eq("id", product.id);
    if (error) toast.error(error.message);
    else await qc.invalidateQueries({ queryKey: ["products"] });
  }
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-3 py-5 sm:px-6 sm:py-8">
        {loading ? (
          <div className="m-auto py-20">
            <Loader2 className="animate-spin text-teal-600" />
          </div>
        ) : !user || !isAdmin ? (
          <div className="m-auto w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
            <h1 className="text-2xl font-bold">{t("admin_login")}</h1>
            <p className="mt-2 text-sm text-slate-600">{t("admin_notice")}</p>
            <form onSubmit={signIn} className="mt-6 space-y-4">
              <Field label={t("email")}>
                <input
                  required
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="admin-input"
                />
              </Field>
              <Field label={t("password")}>
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-input"
                />
              </Field>
              <button
                disabled={busy}
                className="w-full rounded-full bg-brand-gradient p-3 font-semibold text-white disabled:opacity-60"
              >
                {busy ? t("loading") : t("sign_in")}
              </button>
            </form>
          </div>
        ) : (
          <>
            <aside
              className={`${sidebarOpen ? "w-56" : "w-14"} hidden shrink-0 flex-col rounded-3xl bg-white p-3 shadow-soft transition-all md:flex`}
            >
              <button
                className="mb-4 grid h-10 place-items-center rounded-xl hover:bg-slate-50"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
              >
                <Menu size={18} />
              </button>
              {tabKeys.map(({ id, icon: Icon, key }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${tab === id ? "bg-brand-gradient-soft text-teal-800" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  <Icon size={18} />
                  {sidebarOpen && t(key)}
                </button>
              ))}
            </aside>
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                    {config.name}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold">{t("store_dashboard")}</h1>
                </div>
                <select
                  value={tab}
                  onChange={(e) => setTab(e.target.value as Tab)}
                  className="admin-input max-w-44 md:hidden"
                  aria-label={t("settings")}
                >
                  {tabKeys.map((x) => (
                    <option key={x.id} value={x.id}>
                      {t(x.key)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="hidden rounded-full border px-4 py-2 text-xs md:inline-flex"
                >
                  {t("nav_signout")}
                </button>
              </div>
              <nav className="mb-5 flex flex-wrap gap-2 md:hidden">
                {tabKeys.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => setTab(x.id)}
                    className={`rounded-full px-3 py-2 text-xs ${tab === x.id ? "bg-brand-gradient text-white" : "border bg-white"}`}
                  >
                    {t(x.key)}
                  </button>
                ))}
              </nav>
              <div className="mb-4 text-xs text-slate-500">
                {t("nav_admin")} / {t(tab)}
              </div>
              {tab === "dashboard" && (
                <Dashboard
                  products={products}
                  orders={orders}
                  config={config}
                  t={t}
                  onOrders={() => setTab("orders")}
                />
              )}
              {tab === "products" && (
                <section>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">{t("products")}</h2>
                    <button
                      onClick={() => setEditor(null)}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <Plus size={16} />
                      {t("add_product")}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-4">
                    <label className="relative sm:col-span-2">
                      <span className="sr-only">{t("search_products")}</span>
                      <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("search_products")}
                        className="admin-input pl-9"
                      />
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="admin-input"
                    >
                      <option value="">{t("all_categories")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === "sw" ? c.name_sw || c.name : c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="admin-input"
                    >
                      <option value="">{t("all_statuses")}</option>
                      <option value="active">{t("active")}</option>
                      <option value="draft">{t("draft")}</option>
                    </select>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="admin-input sm:col-span-4"
                    >
                      <option value="newest">
                        {lang === "sw" ? "Mpya kwanza" : "Newest first"}
                      </option>
                      <option value="price-low">
                        {lang === "sw" ? "Bei: chini hadi juu" : "Price: low to high"}
                      </option>
                      <option value="price-high">
                        {lang === "sw" ? "Bei: juu hadi chini" : "Price: high to low"}
                      </option>
                    </select>
                  </div>
                  {productsQuery.isLoading ? (
                    <Skeleton />
                  ) : filteredProducts.length === 0 ? (
                    <Empty text={t("no_results")} />
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-soft">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead>
                          <tr className="border-b text-xs text-slate-500">
                            <th className="p-3">{t("products")}</th>
                            <th className="p-3">{t("category")}</th>
                            <th className="p-3">{t("price")}</th>
                            <th className="p-3">{t("stock")}</th>
                            <th className="p-3">{t("status")}</th>
                            <th className="p-3">{t("featured")}</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts
                            .slice(page * pageSize, (page + 1) * pageSize)
                            .map((p) => (
                              <tr
                                key={p.id}
                                className={`border-b last:border-0 ${p.stock_quantity < 5 ? "bg-amber-50/50" : ""}`}
                              >
                                <td className="p-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={p.image || "/product-placeholder.svg"}
                                      alt={p.name}
                                      width="48"
                                      height="48"
                                      loading="lazy"
                                      className="h-12 w-12 rounded-lg object-cover"
                                    />
                                    <div className="font-semibold">
                                      {p.name}
                                      <div className="text-xs font-normal text-slate-400">
                                        {p.slug}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  {lang === "sw"
                                    ? p.categories?.name_sw || p.categories?.name
                                    : p.categories?.name || "—"}
                                </td>
                                <td className="p-3">{money(p.price, config.currency)}</td>
                                <td
                                  className={`p-3 ${p.stock_quantity < 5 ? "font-semibold text-amber-800" : ""}`}
                                >
                                  {p.stock_quantity < 1 ? t("out_of_stock") : p.stock_quantity}
                                </td>
                                <td className="p-3">
                                  <Toggle
                                    checked={p.active}
                                    label={p.active ? t("active") : t("draft")}
                                    onChange={() => toggleProduct(p, "active")}
                                  />
                                </td>
                                <td className="p-3">
                                  <Toggle
                                    checked={p.featured}
                                    label={t("featured")}
                                    onChange={() => toggleProduct(p, "featured")}
                                  />
                                </td>
                                <td className="p-3">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setEditor(p)}
                                      aria-label={`${t("edit")} ${p.name}`}
                                      className="rounded-lg p-2 hover:bg-slate-100"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      onClick={() => removeProduct(p)}
                                      aria-label={`${t("delete")} ${p.name}`}
                                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-between border-t p-3 text-xs">
                        <span>
                          {t("page")} {page + 1} / {pageCount}
                        </span>
                        <div className="flex gap-2">
                          <button
                            disabled={page === 0}
                            onClick={() => setPage(Math.max(0, page - 1))}
                            className="rounded-full border p-2 disabled:opacity-40"
                            aria-label={t("previous")}
                          >
                            <ChevronLeft size={15} />
                          </button>
                          <button
                            disabled={page + 1 >= pageCount}
                            onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
                            className="rounded-full border p-2 disabled:opacity-40"
                            aria-label={t("next")}
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}
              {tab === "categories" && (
                <CategoryManager categories={categories} refresh={refresh} t={t} lang={lang} />
              )}
              {tab === "orders" && (
                <OrdersPanel orders={orders} refresh={refresh} config={config} t={t} lang={lang} />
              )}
              {tab === "settings" && <SettingsPanel config={config} refresh={refresh} t={t} />}
            </div>
            {editor !== undefined && (
              <ProductEditor
                product={editor}
                categories={categories}
                onClose={() => setEditor(undefined)}
              />
            )}
          </>
        )}
      </main>
      <Footer />
      <style>{`.admin-input{width:100%;border:1px solid var(--color-border);background:white;border-radius:.75rem;padding:.65rem .85rem;font-size:.875rem;outline:none}.admin-input:focus-visible{border-color:var(--teal);box-shadow:0 0 0 3px color-mix(in oklab,var(--teal) 20%,transparent)}@media print{nav,aside,button,select{display:none!important}body{background:white!important}}`}</style>
    </div>
  );
}

function Dashboard({
  products,
  orders,
  config,
  t,
  onOrders,
}: {
  products: AdminProduct[];
  orders: Order[];
  config: StoreConfig;
  t: (k: I18nKey) => string;
  onOrders: () => void;
}) {
  const { lang } = useI18n();
  const stats = [
    { label: t("total_products"), value: products.length, Icon: Package },
    {
      label: t("low_stock"),
      value: products.filter((p) => p.stock_quantity < 5).length,
      Icon: AlertTriangle,
    },
    { label: t("total_orders"), value: orders.length, Icon: ShoppingCart },
    {
      label: t("new_orders"),
      value: orders.filter((o) => o.status === "new").length,
      Icon: BarChart3,
    },
  ];
  const counts = (["new", "confirmed", "delivered", "cancelled"] as const).map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));
  const max = Math.max(1, ...counts.map((x) => x.count));
  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <article key={label} className="rounded-2xl bg-white p-5 shadow-soft">
            <Icon className="text-teal-600" />
            <p className="mt-3 text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </article>
        ))}
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-soft">
          <h2 className="font-bold">{t("total_sales")}</h2>
          <div className="mt-4 space-y-3">
            {counts.map(({ status, count }) => (
              <div
                key={status}
                className="grid grid-cols-[90px_1fr_30px] items-center gap-3 text-xs"
              >
                <span>{t(status)}</span>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-gradient"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{t("recent_orders")}</h2>
            <button onClick={onOrders} className="text-xs text-teal-700">
              {t("orders")}
            </button>
          </div>
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex justify-between border-b py-3 text-sm last:border-0">
              <span>
                {o.reference} · {o.customer_name}
              </span>
              <span>{money(o.total, config.currency)}</span>
            </div>
          ))}
          {orders.length === 0 && <p className="mt-4 text-sm text-slate-500">{t("no_orders")}</p>}
        </section>
      </div>
    </>
  );
}

function CategoryManager({
  categories,
  refresh,
  t,
  lang,
}: {
  categories: Category[];
  refresh: () => Promise<void>;
  t: (k: I18nKey) => string;
  lang: string;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    name_sw: "",
    slug: "",
    description: "",
    description_sw: "",
    image_url: "",
    sort_order: "0",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (editing)
      setForm({
        name: editing.name,
        name_sw: editing.name_sw || "",
        slug: editing.slug,
        description: editing.description || "",
        description_sw: editing.description_sw || "",
        image_url: editing.image_url || "",
        sort_order: String(editing.sort_order),
        active: editing.active,
      });
    else
      setForm({
        name: "",
        name_sw: "",
        slug: "",
        description: "",
        description_sw: "",
        image_url: "",
        sort_order: "0",
        active: true,
      });
  }, [editing]);
  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        name_sw: form.name_sw.trim() || null,
        slug: form.slug || slugify(form.name),
        description: form.description.trim() || null,
        description_sw: form.description_sw.trim() || null,
        image_url: form.image_url || null,
        sort_order: Number(form.sort_order),
        active: form.active,
      };
      const { error } = editing
        ? await supabase.from("categories").update(payload).eq("id", editing.id)
        : await supabase.from("categories").insert(payload);
      if (error) throw error;
      toast.success(t("category_saved"));
      setEditing(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save category");
    } finally {
      setSaving(false);
    }
  }
  async function remove(c: Category) {
    const { count, error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (count) {
      toast.error(
        lang === "sw"
          ? "Hamisha bidhaa kwanza kabla ya kufuta kategoria"
          : "Reassign products before deleting this category",
      );
      return;
    }
    if (!window.confirm(`${t("delete")} ${c.name}?`)) return;
    const { error: del } = await supabase.from("categories").delete().eq("id", c.id);
    if (del) toast.error(del.message);
    else {
      toast.success(t("deleted"));
      await refresh();
    }
  }
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("categories")}</h2>
        <button
          onClick={() =>
            setEditing({
              id: "",
              name: "",
              name_sw: "",
              slug: "",
              description: "",
              description_sw: "",
              image_url: null,
              sort_order: 0,
              active: true,
            })
          }
          className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2 text-sm text-white"
        >
          <Plus size={15} />
          {t("add_category")}
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <article
            key={c.id}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft"
          >
            <img
              src={c.image_url || "/product-placeholder.svg"}
              alt=""
              width="56"
              height="56"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{lang === "sw" ? c.name_sw || c.name : c.name}</p>
              <p className="text-xs text-slate-500">
                /{c.slug} · {c.active ? t("active") : t("draft")}
              </p>
            </div>
            <button onClick={() => setEditing(c)} aria-label={t("edit")}>
              <Pencil size={16} />
            </button>
            <button onClick={() => remove(c)} aria-label={t("delete")} className="text-red-600">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
        {categories.length === 0 && <Empty text={t("no_categories")} />}
      </div>
      {editing && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4">
          <form
            onSubmit={save}
            className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-soft"
          >
            <div className="flex justify-between">
              <h3 className="text-lg font-bold">{editing.id ? t("edit") : t("add_category")}</h3>
              <button type="button" onClick={() => setEditing(null)} aria-label={t("cancel")}>
                <X />
              </button>
            </div>
            <Field label={t("category_name")}>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                    slug: editing?.id ? form.slug : slugify(e.target.value),
                  })
                }
                className="admin-input"
              />
            </Field>
            <Field label={t("name_swahili")}>
              <input
                value={form.name_sw}
                onChange={(e) => setForm({ ...form, name_sw: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label={t("category_description_en")}>
              <textarea
                maxLength={300}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label={t("category_description_sw")}>
              <textarea
                maxLength={300}
                value={form.description_sw}
                onChange={(e) => setForm({ ...form, description_sw: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label={t("slug")}>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                className="admin-input"
              />
            </Field>
            <Field label={t("image_url")}>
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="admin-input"
              />
            </Field>
            <label className="block text-sm font-medium text-slate-700">
              {t("upload")}
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full rounded-xl border bg-white p-2 text-sm"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSaving(true);
                  try {
                    const ext = file.type.split("/")[1] || "png";
                    const path = `categories/${crypto.randomUUID()}.${ext}`;
                    const { error } = await supabase.storage
                      .from("product-images")
                      .upload(path, file, { contentType: file.type });
                    if (error) throw error;
                    const url = supabase.storage.from("product-images").getPublicUrl(path)
                      .data.publicUrl;
                    setForm((current) => ({ ...current, image_url: url }));
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not upload image");
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("sort_order")}>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  className="admin-input"
                />
              </Field>
              <Toggle
                label={t("active")}
                checked={form.active}
                onChange={() => setForm({ ...form, active: !form.active })}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border px-4 py-2"
              >
                {t("cancel")}
              </button>
              <button
                disabled={saving}
                className="rounded-full bg-brand-gradient px-5 py-2 text-white"
              >
                {t("save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function OrdersPanel({
  orders,
  refresh,
  config,
  t,
  lang,
}: {
  orders: Order[];
  refresh: () => Promise<void>;
  config: StoreConfig;
  t: (k: I18nKey) => string;
  lang: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [itemRows, setItemRows] = useState<
    Array<{ product_name: string; quantity: number; unit_price: number }>
  >([]);
  const filtered = orders.filter(
    (o) =>
      (!status || o.status === status) &&
      (!query ||
        `${o.reference} ${o.customer_name} ${o.customer_phone}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  async function open(o: Order) {
    setSelected(o);
    const { data, error } = await supabase
      .from("order_items")
      .select("product_name,quantity,unit_price")
      .eq("order_id", o.id);
    if (error) toast.error(error.message);
    setItemRows(data ?? []);
  }
  async function setOrderStatus(o: Order, value: string) {
    const { error } = await supabase.from("orders").update({ status: value }).eq("id", o.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("order_saved"));
      await refresh();
    }
  }
  const message = selected ? `Hello ${config.name}, regarding order ${selected.reference}.` : "";
  return (
    <section>
      <h2 className="text-xl font-bold">{t("orders")}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="relative">
          <span className="sr-only">{t("search_products")}</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "sw" ? "Tafuta maagizo…" : "Search orders…"}
            className="admin-input pl-9"
          />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-input">
          <option value="">{t("all_statuses")}</option>
          {["new", "confirmed", "delivered", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {t(s as Order["status"])}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 space-y-3">
        {filtered.map((o) => (
          <article
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft"
          >
            <button onClick={() => open(o)} className="text-left">
              <p className="font-semibold">
                {o.reference} · {o.customer_name}
              </p>
              <p className="text-xs text-slate-500">
                {o.customer_phone} · {money(o.total, config.currency)}
              </p>
            </button>
            <div className="flex items-center gap-2">
              <select
                aria-label={t("status")}
                value={o.status}
                onChange={(e) => setOrderStatus(o, e.target.value)}
                className="rounded-full border px-3 py-2 text-sm"
              >
                {["new", "confirmed", "delivered", "cancelled"].map((s) => (
                  <option key={s} value={s}>
                    {t(s as Order["status"])}
                  </option>
                ))}
              </select>
              <button
                onClick={() => open(o)}
                aria-label={t("order_details")}
                className="rounded-full border p-2"
              >
                <ExternalLink size={15} />
              </button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <Empty text={t("no_orders")} />}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <article className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex justify-between">
              <h3 className="text-xl font-bold">
                {t("order_details")} · {selected.reference}
              </h3>
              <button onClick={() => setSelected(null)} aria-label={t("cancel")}>
                <X />
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">{t("customer")}</dt>
              <dd>{selected.customer_name}</dd>
              <dt className="text-slate-500">{t("contact_phone")}</dt>
              <dd>{selected.customer_phone}</dd>
              <dt className="text-slate-500">{t("status")}</dt>
              <dd>{t(selected.status)}</dd>
              <dt className="text-slate-500">{t("description")}</dt>
              <dd>{selected.location_note || "—"}</dd>
            </dl>
            <ul className="my-5 divide-y border-y">
              {itemRows.map((item, i) => (
                <li key={i} className="flex justify-between py-3 text-sm">
                  <span>
                    {item.product_name} × {item.quantity}
                  </span>
                  <span>{money(item.unit_price * item.quantity, config.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="flex justify-between font-bold">
              <span>{t("price")}</span>
              <span>{money(selected.total, config.currency)}</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={waLink(message, config.whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-brand-gradient px-4 py-2 text-sm font-semibold text-white"
              >
                {t("contact_whatsapp")}
              </a>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
              >
                <Printer size={15} />
                {t("print")}
              </button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

function SettingsPanel({
  config,
  refresh,
  t,
}: {
  config: StoreConfig;
  refresh: () => Promise<void>;
  t: (k: I18nKey) => string;
}) {
  const [form, setForm] = useState<StoreConfig>(config);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(config), [config]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("settings").upsert({ key: "store", value: form });
      if (error) throw error;
      toast.success(t("save_settings"));
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update settings");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold">{t("settings")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("store_name")}>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="admin-input"
          />
        </Field>
        <Field label={t("whatsapp_number")}>
          <input
            required
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "") })}
            className="admin-input"
          />
        </Field>
        <Field label={t("instagram_handle")}>
          <input
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value.replace(/^@/, "") })}
            className="admin-input"
          />
        </Field>
        <Field label={t("currency")}>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="admin-input"
          >
            {["TZS", "USD", "KES"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label={t("hero_headline_en")}>
          <input
            value={form.hero_en}
            onChange={(e) => setForm({ ...form, hero_en: e.target.value })}
            className="admin-input"
          />
        </Field>
        <Field label={t("hero_headline_sw")}>
          <input
            value={form.hero_sw}
            onChange={(e) => setForm({ ...form, hero_sw: e.target.value })}
            className="admin-input"
          />
        </Field>
        <Field label={t("hero_sub_en")}>
          <textarea
            value={form.sub_en}
            onChange={(e) => setForm({ ...form, sub_en: e.target.value })}
            className="admin-input"
          />
        </Field>
        <Field label={t("hero_sub_sw")}>
          <textarea
            value={form.sub_sw}
            onChange={(e) => setForm({ ...form, sub_sw: e.target.value })}
            className="admin-input"
          />
        </Field>
        <Field label={t("contact_phone")}>
          <input
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            className="admin-input"
          />
        </Field>
        <Field label={t("contact_email")}>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            className="admin-input"
          />
        </Field>
        <Field label={t("footer_en")}>
          <textarea
            value={form.footer_en}
            onChange={(e) => setForm({ ...form, footer_en: e.target.value })}
            className="admin-input"
          />
        </Field>
        <Field label={t("footer_sw")}>
          <textarea
            value={form.footer_sw}
            onChange={(e) => setForm({ ...form, footer_sw: e.target.value })}
            className="admin-input"
          />
        </Field>
      </div>
      <button
        disabled={saving}
        className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? t("loading") : t("save_settings")}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-teal-600"
      />
      {label}
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white/60 py-12 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
function Skeleton() {
  return (
    <div className="mt-4 grid gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
      ))}
    </div>
  );
}
