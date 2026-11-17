import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Storefront } from "@/components/Storefront";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ property: "og:url", content: `${__SITE_URL__}/` }],
    links: [
      { rel: "canonical", href: `${__SITE_URL__}/` },
      { rel: "alternate", hrefLang: "en", href: `${__SITE_URL__}/?lang=en` },
      { rel: "alternate", hrefLang: "sw", href: `${__SITE_URL__}/?lang=sw` },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex-1">
        <Storefront />
      </div>
      <Footer />
    </div>
  );
}
