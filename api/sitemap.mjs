const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export default async function sitemap(_request, response) {
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!site || !supabaseUrl || !anonKey)
    return response
      .status(500)
      .send("SITE_URL and Supabase public environment variables are required");
  try {
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/products?select=slug,updated_at&active=eq.true`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/categories?select=slug,updated_at&active=eq.true`, { headers }),
    ]);
    if (!productsRes.ok || !categoriesRes.ok) throw new Error("Could not load public URLs");
    const products = await productsRes.json();
    const categories = await categoriesRes.json();
    const urls = [
      { loc: `${site}/`, changefreq: "daily", priority: "1.0" },
      ...categories.map((row) => ({
        loc: `${site}/category/${encodeURIComponent(row.slug)}`,
        lastmod: row.updated_at,
        changefreq: "weekly",
        priority: "0.7",
      })),
      ...products.map((row) => ({
        loc: `${site}/product/${encodeURIComponent(row.slug)}`,
        lastmod: row.updated_at,
        changefreq: "weekly",
        priority: "0.8",
      })),
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${xml(u.loc)}</loc>${u.lastmod ? `<lastmod>${xml(u.lastmod)}</lastmod>` : ""}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("")}</urlset>`;
    response.setHeader("Content-Type", "application/xml; charset=utf-8");
    response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return response.status(200).send(body);
  } catch {
    return response.status(502).send("Could not generate sitemap");
  }
}
