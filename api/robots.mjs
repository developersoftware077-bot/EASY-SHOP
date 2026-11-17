export default function robots(_request, response) {
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  if (!site) return response.status(500).send("SITE_URL is required");
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return response
    .status(200)
    .send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${site}/sitemap.xml\n`);
}
