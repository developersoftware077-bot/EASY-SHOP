/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const STORE = { whatsapp: "255634283550", instagram: "sufian_tech", currency: "TZS" };
export type StoreConfig = typeof STORE & {
  name: string;
  hero_en: string;
  hero_sw: string;
  sub_en: string;
  sub_sw: string;
  contact_email: string;
  contact_phone: string;
  footer_en: string;
  footer_sw: string;
};
export const DEFAULT_STORE: StoreConfig = {
  ...STORE,
  name: "EASY SHOP",
  hero_en: "Good finds. Better everyday.",
  hero_sw: "Chagua vizuri. Furahia zaidi.",
  sub_en: "Quality picks across everyday essentials. Order on WhatsApp and get fast delivery.",
  sub_sw: "Bidhaa bora, oda rahisi kupitia WhatsApp na usafirishaji wa haraka.",
  contact_email: "",
  contact_phone: "+255 634 283 550",
  footer_en: "Everyday essentials, thoughtfully selected.",
  footer_sw: "Bidhaa za kila siku zilizochaguliwa kwa umakini.",
};
export function useStoreConfig() {
  const query = useQuery({
    queryKey: ["store-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "store")
        .maybeSingle();
      if (error) throw error;
      return { ...DEFAULT_STORE, ...(data?.value as Partial<StoreConfig> | undefined) };
    },
  });
  return query.data ?? DEFAULT_STORE;
}
export type Product = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  sku: string | null;
  short_description: string;
  description: string;
  featured: boolean;
  active: boolean;
  created_at: string;
  image?: string;
  images?: Array<{
    id: string;
    image_url: string;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number;
  }>;
  seo_title?: string | null;
  seo_description?: string | null;
  categories?: { name: string; name_sw?: string | null } | null;
};
export type CartItem = { product: Product; quantity: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  add: (p: Product, quantity?: number) => void;
  change: (id: string, n: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("easy-shop-cart") ?? "[]"));
    } catch {
      setItems([]);
    }
  }, []);
  const update = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem("easy-shop-cart", JSON.stringify(next));
  };
  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      add: (p, quantity = 1) => {
        if (p.stock_quantity < 1) return;
        const old = items.find((i) => i.product.id === p.id);
        update(
          old
            ? items.map((i) =>
                i.product.id === p.id
                  ? {
                      ...i,
                      product: p,
                      quantity: Math.min(i.quantity + quantity, p.stock_quantity),
                    }
                  : i,
              )
            : [...items, { product: p, quantity: Math.min(quantity, p.stock_quantity) }],
        );
      },
      change: (id, n) =>
        update(
          items.map((i) =>
            i.product.id === id
              ? { ...i, quantity: Math.max(1, Math.min(n, i.product.stock_quantity)) }
              : i,
          ),
        ),
      remove: (id) => update(items.filter((i) => i.product.id !== id)),
      clear: () => update([]),
    }),
    [items],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("CartProvider missing");
  return value;
}
export const money = (amount: number, currency = STORE.currency) =>
  new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
export const waLink = (message: string, phone = STORE.whatsapp) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
