import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { z } from "zod";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/store";

type Category = { id: string; name: string; name_sw?: string | null };
type ImageDraft = {
  id?: string;
  image_url: string;
  alt_text: string;
  is_primary: boolean;
  file?: File;
  remove?: boolean;
};
type ProductForm = {
  name: string;
  slug: string;
  category_id: string;
  price: string;
  compare_at_price: string;
  stock_quantity: string;
  sku: string;
  short_description: string;
  description: string;
  seo_title: string;
  seo_description: string;
  featured: boolean;
  active: boolean;
};
const validation = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category_id: z.string(),
  price: z.coerce.number().min(0),
  compare_at_price: z.string().optional(),
  stock_quantity: z.coerce.number().int().min(0),
  sku: z.string().max(80),
  short_description: z.string().max(240),
  description: z.string().max(10000),
  seo_title: z.string().max(70),
  seo_description: z.string().max(170),
  featured: z.boolean(),
  active: z.boolean(),
});
const empty: ProductForm = {
  name: "",
  slug: "",
  category_id: "",
  price: "",
  compare_at_price: "",
  stock_quantity: "0",
  sku: "",
  short_description: "",
  description: "",
  seo_title: "",
  seo_description: "",
  featured: false,
  active: false,
};
function makeSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Select an image file");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image compression is unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.84),
  );
  if (!blob) throw new Error("Could not prepare this image");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
}
function markdownLines(text: string) {
  return text.split("\n").map((line, index) => (
    <p key={index} className="min-h-5">
      {line
        .replace(/^#{1,3}\s/, "")
        .split(/(\*\*[^*]+\*\*)/g)
        .map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
    </p>
  ));
}

export function ProductEditor({
  product,
  categories,
  onClose,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductForm>(() =>
    product
      ? {
          name: product.name,
          slug: product.slug,
          category_id: product.category_id || "",
          price: String(product.price),
          compare_at_price:
            product.compare_at_price == null ? "" : String(product.compare_at_price),
          stock_quantity: String(product.stock_quantity),
          sku: product.sku || "",
          short_description: product.short_description,
          description: product.description,
          seo_title: product.seo_title || "",
          seo_description: product.seo_description || "",
          featured: product.featured,
          active: product.active,
        }
      : empty,
  );
  const [images, setImages] = useState<ImageDraft[]>(
    (product?.images || []).map((x) => ({
      id: x.id,
      image_url: x.image_url,
      alt_text: x.alt_text || product?.name || form.name,
      is_primary: x.is_primary,
    })),
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const initial = useRef(JSON.stringify({ form, images })).current;
  const dirty = JSON.stringify({ form, images }) !== initial;
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = [...images];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(lang === "sw" ? "Chagua faili la picha" : "Choose an image file");
        continue;
      }
      next.push({
        image_url: URL.createObjectURL(file),
        alt_text: form.name,
        is_primary: next.length === 0,
        file,
      });
    }
    setImages(next);
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }
  function moveImage(index: number, direction: -1 | 1) {
    const next = [...images];
    const to = index + direction;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setImages(next);
  }
  function setMain(index: number) {
    setImages(images.map((image, i) => ({ ...image, is_primary: i === index })));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = validation.safeParse({
      ...form,
      price: form.price,
      compare_at_price: form.compare_at_price,
      stock_quantity: form.stock_quantity,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Check the product details");
      return;
    }
    setSaving(true);
    setProgress(0);
    try {
      const { data: duplicate, error: slugError } = await supabase
        .from("products")
        .select("id")
        .eq("slug", form.slug)
        .maybeSingle();
      if (slugError) throw slugError;
      if (duplicate && duplicate.id !== product?.id)
        throw new Error(
          lang === "sw" ? "Kiungo hiki kinatumika tayari" : "This URL slug is already in use",
        );
      const payload = {
        name: form.name.trim(),
        slug: form.slug,
        category_id: form.category_id || null,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        stock_quantity: Number(form.stock_quantity),
        sku: form.sku.trim() || null,
        short_description: form.short_description.trim(),
        description: form.description,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        featured: form.featured,
        active: form.active,
      };
      let productId = product?.id;
      if (productId) {
        const { error } = await supabase.from("products").update(payload).eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
      }
      const retained: ImageDraft[] = [];
      const removeImages = images.filter((x) => x.remove && x.id);
      for (const image of removeImages) {
        const { error } = await supabase.from("product_images").delete().eq("id", image.id!);
        if (error) throw error;
        const marker = "/product-images/";
        const path = image.image_url.split(marker)[1]?.split("?")[0];
        if (path) await supabase.storage.from("product-images").remove([decodeURIComponent(path)]);
      }
      const remaining = images.filter((x) => !x.remove);
      for (let index = 0; index < remaining.length; index++) {
        const image = remaining[index]!;
        let imageUrl = image.image_url;
        if (image.file) {
          const compressed = await compress(image.file);
          const path = `${productId}/${crypto.randomUUID()}.webp`;
          const { error } = await supabase.storage
            .from("product-images")
            .upload(path, compressed, { contentType: "image/webp", upsert: false });
          if (error) throw error;
          imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        }
        if (image.id) {
          const { error } = await supabase
            .from("product_images")
            .update({ sort_order: index, is_primary: image.is_primary, alt_text: image.alt_text })
            .eq("id", image.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("product_images").insert({
            product_id: productId,
            image_url: imageUrl,
            alt_text: image.alt_text || form.name,
            sort_order: index,
            is_primary: image.is_primary,
          });
          if (error) throw error;
        }
        retained.push({
          ...image,
          image_url: imageUrl,
          file: undefined,
          id: image.id || crypto.randomUUID(),
        });
        setProgress(Math.round(((index + 1) / Math.max(remaining.length, 1)) * 100));
      }
      if (retained.length && !retained.some((x) => x.is_primary)) {
        const first = retained[0]!;
        const { error } = await supabase
          .from("product_images")
          .update({ is_primary: true })
          .eq("image_url", first.image_url);
        if (error) throw error;
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["products"] }),
        qc.invalidateQueries({ queryKey: ["category-products"] }),
      ]);
      toast.success(t("product_saved"));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  }
  function close() {
    if (
      dirty &&
      !window.confirm(
        lang === "sw" ? "Tupa mabadiliko ambayo hayajahifadhiwa?" : "Discard unsaved changes?",
      )
    )
      return;
    onClose();
  }
  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/40 p-0 backdrop-blur-sm sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
        className="ml-auto h-full w-full max-w-4xl overflow-y-auto rounded-none bg-background p-5 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <header className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-center justify-between border-b bg-background/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:-mt-7 sm:px-7">
          <div>
            <h2 id="product-editor-title" className="text-xl font-bold">
              {product ? t("edit") : t("add_product")}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === "sw"
                ? "Maelezo, picha na utafutaji"
                : "Details, photos and search appearance"}
            </p>
          </div>
          <button
            onClick={close}
            aria-label={t("cancel")}
            className="rounded-full p-2 hover:bg-white"
          >
            <X />
          </button>
        </header>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("product_name")}>
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                    ...(!slugTouched ? { slug: makeSlug(e.target.value) } : {}),
                  })
                }
                className="admin-input"
              />
            </Field>
            <Field label={t("slug")}>
              <input
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: makeSlug(e.target.value) });
                }}
                className="admin-input"
              />
            </Field>
            <Field label={t("category")}>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="admin-input"
              >
                <option value="">{t("choose_category")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === "sw" ? c.name_sw || c.name : c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("price")}>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label={t("old_price")}>
              <input
                type="number"
                min="0"
                step="1"
                value={form.compare_at_price}
                onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label={t("stock")}>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label={t("sku")}>
              <input
                maxLength={80}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label={t("short_description")}>
              <input
                maxLength={240}
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                className="admin-input"
              />
            </Field>
          </div>
          <Field label={t("description")}>
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPreview(false)}
                className="rounded-full border px-3 py-1 text-xs"
              >
                {t("description")}
              </button>
              <button
                type="button"
                onClick={() => setPreview(true)}
                className="rounded-full border px-3 py-1 text-xs"
              >
                {t("preview")}
              </button>
            </div>
            {preview ? (
              <div className="min-h-32 rounded-xl border bg-white p-3 text-sm">
                {markdownLines(form.description)}
              </div>
            ) : (
              <textarea
                maxLength={10000}
                rows={8}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="admin-input font-mono"
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("seo_title")}>
              <input
                maxLength={70}
                value={form.seo_title}
                onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                className="admin-input"
              />
            </Field>
            <Field label={t("seo_description")}>
              <textarea
                maxLength={170}
                rows={2}
                value={form.seo_description}
                onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                className="admin-input"
              />
            </Field>
          </div>
          <fieldset className="flex flex-wrap gap-5 rounded-2xl border bg-white p-4">
            <Toggle
              label={t("featured")}
              checked={form.featured}
              onChange={(v) => setForm({ ...form, featured: v })}
            />
            <Toggle
              label={t("active")}
              checked={form.active}
              onChange={(v) => setForm({ ...form, active: v })}
            />
          </fieldset>
          <Field label={t("images")}>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="rounded-2xl border-2 border-dashed bg-white p-4 text-center"
            >
              <ImagePlus className="mx-auto text-teal-700" />
              <p className="mt-2 text-sm">{t("drop_images")}</p>
              <input
                id="product-files"
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <label
                htmlFor="product-files"
                className="mt-3 inline-block cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold"
              >
                {lang === "sw" ? "Chagua picha" : "Choose images"}
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((image, index) => (
                <div
                  key={image.id || image.image_url}
                  className={`relative rounded-xl border bg-white p-2 ${image.remove ? "opacity-40" : ""}`}
                >
                  <img
                    src={image.image_url}
                    alt={image.alt_text}
                    width="240"
                    height="240"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                  <input
                    aria-label="Image alt text"
                    value={image.alt_text}
                    onChange={(e) =>
                      setImages(
                        images.map((x, i) =>
                          i === index ? { ...x, alt_text: e.target.value } : x,
                        ),
                      )
                    }
                    className="mt-2 w-full rounded-lg border px-2 py-1 text-xs"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => moveImage(index, -1)}
                      disabled={!index}
                      aria-label="Move image earlier"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(index, 1)}
                      disabled={index === images.length - 1}
                      aria-label="Move image later"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMain(index)}
                      aria-label={t("main_image")}
                      className={image.is_primary ? "text-teal-600" : "text-slate-400"}
                    >
                      <Star size={15} fill={image.is_primary ? "currentColor" : "none"} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImages(images.map((x, i) => (i === index ? { ...x, remove: true } : x)))
                      }
                      aria-label={t("delete")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {image.is_primary && (
                    <span className="absolute left-3 top-3 rounded-full bg-brand-gradient px-2 py-1 text-[10px] text-white">
                      {t("main_image")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Field>
          {saving && (
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand-gradient transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={close}
              className="rounded-full border px-5 py-2.5 text-sm"
            >
              {t("cancel")}
            </button>
            <button
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="animate-spin" size={15} />} {t("save")}
            </button>
          </div>
        </form>
      </section>
      <style>{`.admin-input{width:100%;border:1px solid var(--color-border);background:white;border-radius:.75rem;padding:.65rem .85rem;font-size:.875rem;outline:none}.admin-input:focus{border-color:var(--teal);box-shadow:0 0 0 3px color-mix(in oklab,var(--teal) 20%,transparent)}`}</style>
    </div>
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
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-teal-600"
      />
      {label}
    </label>
  );
}
