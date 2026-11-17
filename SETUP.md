# EASY SHOP setup

## 1. Create the Supabase project

1. Create a Supabase project and open its SQL Editor.
2. Run `supabase/schema.sql`. This creates the tables, Auth role trigger, RLS policies, public order RPC, indexes, and the public `product-images` bucket.
3. Optionally run `supabase/seed.sql` to add sample categories and products.
4. In Supabase Auth, turn off public signups before launch. Create the initial admin account through the dashboard or briefly enable signup, create the first account, then disable signup. The first account receives the `admin` role; later accounts receive `user`.
5. Copy `.env.example` to `.env` and fill the Supabase project URL, publishable/anon key, and canonical public site URL. Never put a service-role key in browser or Vite variables.

The schema is also provided as `supabase/migrations/20261117000000_easy_shop.sql` for migration workflows. Apply one schema source, not both, to a fresh database.

## 2. Database access and security

| Table / object | Policy | Anonymous | Signed-in user | Admin |
| --- | --- | --- | --- | --- |
| `profiles` | Users read own profile or admins | None | Own row | Read/write |
| `profiles` | Admins manage profiles | None | None | Read/write |
| `user_roles` | Users read own role or admins | None | Own row | Read/write |
| `user_roles` | Admins manage roles | None | None | Read/write |
| `categories` | Public reads active categories | Active rows | Active rows | All rows |
| `categories` | Admins manage categories | None | None | Read/write |
| `products` | Public reads active products | Active rows | Active rows | All rows |
| `products` | Admins manage products | None | None | Read/write |
| `product_images` | Public reads images of active products | Active product images | Active product images | All rows |
| `product_images` | Admins manage product images | None | None | Read/write |
| `orders` | Admins manage orders | None | None | Read/write |
| `order_items` | Admins manage order items | None | None | Read/write |
| `settings` | Public reads settings | `store` key | `store` key | All rows |
| `settings` | Admins manage settings | None | None | Read/write |
| `storage.objects` in `product-images` | Public reads product images | Read | Read | Read |
| `storage.objects` in `product-images` | Admins upload/update/delete product images | None | None | Insert/update/delete |

RLS is enabled on every application table. Anonymous and authenticated clients have no direct order/order-item table access; public checkout uses the `place_public_order` RPC. This is stricter than direct anonymous inserts and prevents forged item prices/totals. The function validates inputs, limits repeated unconfirmed orders per phone, locks products, checks current stock, calculates prices in Postgres, decrements stock, and returns a trusted order snapshot. The RPC is public by design to support guest checkout; keep its validation and rate limit in place. The public bucket exposes product image URLs, so only upload storefront-safe images.

`has_role` is a security-definer helper constrained to the caller's own user ID. Admin policies use it rather than trusting a client-supplied role. Keep Supabase Auth signup disabled after provisioning the administrator and do not expose the service-role key.

## 3. Local development

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`), and `SITE_URL` in `.env`. `SITE_URL` must be the canonical HTTPS origin, without a trailing slash, such as your own domain. It is used to build canonical metadata and by the sitemap and robots endpoints. Do not leave it blank in production.

Open `/admin` and sign in with the provisioned admin account. Use the admin screens to manage products, categories, order status, and store settings. Product and category images upload to the `product-images` bucket.

## 4. Vercel deployment and custom domain

1. Import the repository into Vercel and deploy with the TanStack Start framework preset.
2. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`), and `SITE_URL` to the Vercel Production environment. Set `SITE_URL` to the final custom HTTPS origin, without a trailing slash, and redeploy after changing it, because canonical metadata is embedded at build time.
3. Add the custom domain in Vercel, configure the DNS records Vercel provides, and wait for TLS provisioning.
4. Add the final domain to Supabase Auth's allowed redirect URLs if email authentication redirects are used.
5. Check `/robots.txt` and `/sitemap.xml` on the deployed domain. The Vercel rewrites route those paths to `api/robots.mjs` and `api/sitemap.mjs`; the sitemap includes the homepage and active product/category URLs read from Supabase.

The sitemap API needs `SITE_URL`, `SUPABASE_URL` (or `VITE_SUPABASE_URL`), and `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`) in the Vercel function environment. The anon key is public and access remains limited by RLS. These endpoints depend on Vercel serverless functions; configure equivalent function routes if deploying elsewhere.

## 5. Storefront content and branding

Store name, WhatsApp number, Instagram handle, currency, bilingual hero copy, contact details, and footer copy are editable in Admin → Settings. Product SEO title/description and category descriptions are editable in their admin forms. `public/hero-products.svg` is a local vector fallback; replace it with an optimized storefront image when one is available. Product images are resized and converted to WebP on upload.

## 6. Commands

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
