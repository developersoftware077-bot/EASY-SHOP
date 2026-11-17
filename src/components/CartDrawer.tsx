import { useState, type FormEvent } from "react";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, useCart, useStoreConfig, waLink } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

export default function CartDrawer({
  onClose,
  onOrderComplete,
}: {
  onClose: () => void;
  onOrderComplete: (reference: string) => void;
}) {
  const { items, change, remove, clear } = useCart();
  const config = useStoreConfig();
  const { lang } = useI18n();
  const [checkout, setCheckout] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", note: "" });
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !items.length || honeypot) return;
    setSubmitting(true);
    const popup = window.open("about:blank", "_blank");
    const reference = `ES-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      const { data, error } = await supabase.rpc("place_public_order", {
        p_customer_name: customer.name.trim(),
        p_customer_phone: customer.phone.trim(),
        p_location_note: customer.note.trim(),
        p_reference: reference,
        p_items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result) throw new Error("Order was not saved");
      const snapshot = result.item_snapshot as Array<{
        name: string;
        quantity: number;
        unit_price: number;
      }>;
      const lines = snapshot.map(
        (item) =>
          `• ${item.name} × ${item.quantity} — ${money(item.unit_price * item.quantity, config.currency)}`,
      );
      const message = `Hello ${config.name}, I'd like to place order ${result.order_reference}.\n\n${lines.join("\n")}\n\nTotal: ${money(result.order_total, config.currency)}\nName: ${customer.name}\nPhone: ${customer.phone}\nLocation/note: ${customer.note || "—"}\n\nThank you!`;
      if (popup) popup.location.href = waLink(message, config.whatsapp);
      else window.location.assign(waLink(message, config.whatsapp));
      clear();
      onClose();
      onOrderComplete(result.order_reference);
    } catch (error) {
      popup?.close();
      toast.error(error instanceof Error ? error.message : "Could not save your order");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={lang === "sw" ? "Kikapu cha ununuzi" : "Shopping cart"}
        className="ml-auto flex h-full w-full max-w-md flex-col bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{lang === "sw" ? "Kikapu" : "Your cart"}</h2>
          <button onClick={onClose} aria-label={lang === "sw" ? "Funga kikapu" : "Close cart"}>
            <X />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="m-auto text-sm text-slate-500">
            {lang === "sw" ? "Kikapu chako ni tupu" : "Your cart is empty"}
          </p>
        ) : (
          <>
            <div className="mt-5 flex-1 space-y-4 overflow-auto">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 rounded-2xl border p-3">
                  <img
                    src={item.product.image || "/product-placeholder.svg"}
                    alt={item.product.name}
                    width="80"
                    height="80"
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{item.product.name}</p>
                    <p className="text-sm text-teal-700">
                      {money(item.product.price, config.currency)}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        aria-label={lang === "sw" ? "Punguza kiasi" : "Decrease quantity"}
                        onClick={() => change(item.product.id, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={lang === "sw" ? "Ongeza kiasi" : "Increase quantity"}
                        onClick={() => change(item.product.id, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        className="ml-auto text-xs text-red-600"
                        onClick={() => remove(item.product.id)}
                      >
                        {lang === "sw" ? "Ondoa" : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-4">
              <div className="mb-4 flex justify-between font-bold">
                <span>{lang === "sw" ? "Jumla ndogo" : "Estimated subtotal"}</span>
                <span>{money(subtotal, config.currency)}</span>
              </div>
              {checkout ? (
                <form onSubmit={submit} className="space-y-3">
                  <label className="sr-only" aria-hidden="true">
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    {lang === "sw" ? "Jina kamili" : "Full name"}
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      className="mt-1 w-full rounded-xl border p-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    {lang === "sw" ? "Namba ya simu" : "Phone number"}
                    <input
                      required
                      minLength={7}
                      maxLength={25}
                      type="tel"
                      autoComplete="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      className="mt-1 w-full rounded-xl border p-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    {lang === "sw" ? "Mahali au maelezo (hiari)" : "Location or note (optional)"}
                    <textarea
                      maxLength={500}
                      value={customer.note}
                      onChange={(e) => setCustomer({ ...customer, note: e.target.value })}
                      className="mt-1 w-full rounded-xl border p-3 text-sm"
                    />
                  </label>
                  <button
                    disabled={submitting}
                    className="w-full rounded-full bg-brand-gradient p-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {submitting
                      ? lang === "sw"
                        ? "Inahifadhi…"
                        : "Saving order…"
                      : lang === "sw"
                        ? "Agiza kupitia WhatsApp"
                        : "Order via WhatsApp"}
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setCheckout(true)}
                  className="w-full rounded-full bg-brand-gradient p-3 text-sm font-bold text-white"
                >
                  {lang === "sw" ? "Endelea" : "Checkout"}
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
