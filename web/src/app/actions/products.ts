"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/types";
import type { ProductSupplyPayload } from "@/lib/product-supplies";
import {
  productImageStoragePath,
  storagePathFromPublicUrl,
  validateProductImageFile,
} from "@/lib/product-image";

const productSelectBase = `
  id,
  name,
  image_url,
  unit_price,
  stock,
  min_stock,
  track_stock,
  created_at,
  product_attribute_options (
    option_id,
    attribute_options (
      id,
      label,
      attribute_groups ( id, name, slug )
    )
  )
`;

const productSelectWithSupplies = `
  id,
  name,
  image_url,
  unit_price,
  stock,
  min_stock,
  track_stock,
  use_supplies,
  created_at,
  product_supplies (
    id,
    name,
    quantity,
    unit_price,
    sort_order
  ),
  product_attribute_options (
    option_id,
    attribute_options (
      id,
      label,
      attribute_groups ( id, name, slug )
    )
  )
`;

function missingSuppliesSchema(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("product_supplies") ||
    m.includes("use_supplies") ||
    m.includes("schema cache")
  );
}

const SUPPLIES_MIGRATION_HINT =
  "Faltan tablas de insumos en la base de datos. En la carpeta HADER ejecuta: npm run db:migrate. Si ya lo hiciste, en Supabase abre Settings → API → Reload schema cache.";

function suppliesSchemaUserMessage(raw: string) {
  if (missingSuppliesSchema(raw)) return SUPPLIES_MIGRATION_HINT;
  return raw;
}

function normalizeProductRow(row: ProductRow): ProductRow {
  return {
    ...row,
    image_url: row.image_url ?? null,
    use_supplies: row.use_supplies ?? false,
    product_supplies: row.product_supplies ?? [],
  };
}

function missingImageColumn(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes("image_url") &&
    (m.includes("schema cache") || m.includes("does not exist") || m.includes("could not find"))
  );
}

const productSelectBaseNoImage = `
  id,
  name,
  unit_price,
  stock,
  min_stock,
  track_stock,
  created_at,
  product_attribute_options (
    option_id,
    attribute_options (
      id,
      label,
      attribute_groups ( id, name, slug )
    )
  )
`;

const productSelectWithSuppliesNoImage = `
  id,
  name,
  unit_price,
  stock,
  min_stock,
  track_stock,
  use_supplies,
  created_at,
  product_supplies (
    id,
    name,
    quantity,
    unit_price,
    sort_order
  ),
  product_attribute_options (
    option_id,
    attribute_options (
      id,
      label,
      attribute_groups ( id, name, slug )
    )
  )
`;

const IMAGE_MIGRATION_HINT =
  "Falta la columna de imagen. En la carpeta HADER ejecuta: npm run db:migrate (migración 013).";

async function removeProductImageObjects(productId: string) {
  const supabase = createSupabaseServer();
  const { data: listed } = await supabase.storage.from("product-images").list(productId, {
    limit: 20,
  });
  if (listed?.length) {
    const paths = listed.map((f) => `${productId}/${f.name}`);
    await supabase.storage.from("product-images").remove(paths);
  }
}

function revalidateProductPaths(productId?: string) {
  revalidatePath("/productos");
  revalidatePath("/");
  revalidatePath("/ventas/nueva");
  if (productId) revalidatePath(`/productos/${productId}/editar`);
}

export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No se recibió ninguna imagen" };
  }
  const check = validateProductImageFile(file);
  if (!check.ok) return check;

  const supabase = createSupabaseServer();
  const mime = file.type.toLowerCase();
  const path = productImageStoragePath(productId, mime);
  const bytes = Buffer.from(await file.arrayBuffer());

  await removeProductImageObjects(productId);

  const { error: upErr } = await supabase.storage.from("product-images").upload(path, bytes, {
    contentType: mime,
    upsert: true,
    cacheControl: "3600",
  });

  if (upErr) {
    const msg = upErr.message.toLowerCase();
    if (msg.includes("bucket") || msg.includes("not found")) {
      return {
        ok: false,
        error:
          "No existe el bucket product-images. Ejecuta npm run db:migrate (013) o créalo en Supabase Storage.",
      };
    }
    return { ok: false, error: upErr.message };
  }

  const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  const { error: dbErr } = await supabase
    .from("products")
    .update({ image_url: imageUrl })
    .eq("id", productId)
    .eq("is_active", true);

  if (dbErr) {
    if (missingImageColumn(dbErr.message)) {
      return { ok: false, error: IMAGE_MIGRATION_HINT };
    }
    return { ok: false, error: dbErr.message };
  }

  revalidateProductPaths(productId);
  return { ok: true, imageUrl };
}

export async function removeProductImage(
  productId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseServer();

  const { data: row } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return { ok: false, error: "Producto no encontrado" };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const storedPath =
    row.image_url && url ? storagePathFromPublicUrl(row.image_url, url) : null;

  if (storedPath) {
    await supabase.storage.from("product-images").remove([storedPath]);
  } else {
    await removeProductImageObjects(productId);
  }

  const { error: dbErr } = await supabase
    .from("products")
    .update({ image_url: null })
    .eq("id", productId);

  if (dbErr) {
    if (missingImageColumn(dbErr.message)) {
      return { ok: false, error: IMAGE_MIGRATION_HINT };
    }
    return { ok: false, error: dbErr.message };
  }

  revalidateProductPaths(productId);
  return { ok: true };
}

export async function listProducts(): Promise<ProductRow[]> {
  const supabase = createSupabaseServer();
  const full = await supabase
    .from("products")
    .select(productSelectWithSupplies)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (!full.error) {
    return ((full.data ?? []) as unknown as ProductRow[]).map(normalizeProductRow);
  }

  const msg = full.error.message;
  if (missingSuppliesSchema(msg)) {
    const base = await supabase
      .from("products")
      .select(missingImageColumn(msg) ? productSelectBaseNoImage : productSelectBase)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (base.error) throw new Error(base.error.message);
    return ((base.data ?? []) as unknown as ProductRow[]).map(normalizeProductRow);
  }

  if (missingImageColumn(msg)) {
    const noImg = await supabase
      .from("products")
      .select(productSelectWithSuppliesNoImage)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (noImg.error) throw new Error(noImg.error.message);
    return ((noImg.data ?? []) as unknown as ProductRow[]).map(normalizeProductRow);
  }

  throw new Error(msg);
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const supabase = createSupabaseServer();
  const full = await supabase
    .from("products")
    .select(productSelectWithSupplies)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!full.error) {
    if (!full.data) return null;
    return normalizeProductRow(full.data as unknown as ProductRow);
  }

  const msg = full.error.message;
  if (missingSuppliesSchema(msg) || missingImageColumn(msg)) {
    const select = missingSuppliesSchema(msg)
      ? missingImageColumn(msg)
        ? productSelectBaseNoImage
        : productSelectBase
      : productSelectWithSuppliesNoImage;
    const base = await supabase
      .from("products")
      .select(select)
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (base.error) throw new Error(base.error.message);
    if (!base.data) return null;
    return normalizeProductRow(base.data as unknown as ProductRow);
  }

  throw new Error(msg);
}

async function syncProductOptions(productId: string, optionIds: string[]) {
  const supabase = createSupabaseServer();
  const uniqueOptionIds = [...new Set(optionIds)];

  const { error: delErr } = await supabase
    .from("product_attribute_options")
    .delete()
    .eq("product_id", productId);

  if (delErr) return delErr.message;

  if (uniqueOptionIds.length === 0) return null;

  const { error: linkErr } = await supabase.from("product_attribute_options").insert(
    uniqueOptionIds.map((option_id) => ({
      product_id: productId,
      option_id,
    }))
  );

  return linkErr?.message ?? null;
}

async function syncProductSupplies(
  productId: string,
  useSupplies: boolean,
  supplies: ProductSupplyPayload[]
) {
  const supabase = createSupabaseServer();

  const { error: flagErr } = await supabase
    .from("products")
    .update({ use_supplies: useSupplies })
    .eq("id", productId);

  if (flagErr) {
    if (missingSuppliesSchema(flagErr.message)) {
      return useSupplies ? SUPPLIES_MIGRATION_HINT : null;
    }
    return flagErr.message;
  }

  const { error: delErr } = await supabase
    .from("product_supplies")
    .delete()
    .eq("product_id", productId);

  if (delErr) {
    if (missingSuppliesSchema(delErr.message)) {
      return useSupplies ? SUPPLIES_MIGRATION_HINT : null;
    }
    return delErr.message;
  }

  if (!useSupplies || supplies.length === 0) return null;

  const { error: insErr } = await supabase.from("product_supplies").insert(
    supplies.map((s, index) => ({
      product_id: productId,
      name: s.name.trim(),
      quantity: s.quantity,
      unit_price: s.unitPrice ?? null,
      sort_order: index,
    }))
  );

  if (insErr) {
    return suppliesSchemaUserMessage(insErr.message);
  }
  return null;
}

export async function createProduct(input: {
  name: string;
  price: number;
  optionIds: string[];
  trackStock?: boolean;
  initialStock?: number;
  minStock?: number;
  useSupplies?: boolean;
  supplies?: ProductSupplyPayload[];
}) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "El nombre es obligatorio" };
  if (!Number.isFinite(input.price) || input.price < 0) {
    return { ok: false as const, error: "Precio inválido" };
  }

  const trackStock = Boolean(input.trackStock);
  let initialStock = 0;
  let minStock = 0;
  if (trackStock) {
    const parsedStock = parseStockUnits(input.initialStock);
    if (!parsedStock.ok) return parsedStock;
    initialStock = parsedStock.stock;
    minStock = Math.max(0, Math.floor(Number(input.minStock ?? 0)));
  }

  const supabase = createSupabaseServer();

  const useSuppliesFlag = Boolean(input.useSupplies);

  const insertBase = {
    name,
    unit_price: input.price,
    is_active: true,
    track_stock: trackStock,
    stock: initialStock,
    min_stock: minStock,
  };

  let product: { id: string } | null = null;
  let pErr: { message: string } | null = null;

  const insertFull = await supabase
    .from("products")
    .insert({ ...insertBase, use_supplies: useSuppliesFlag })
    .select("id")
    .single();

  product = insertFull.data;
  pErr = insertFull.error;

  if (pErr && missingSuppliesSchema(pErr.message)) {
    if (useSuppliesFlag) {
      return { ok: false as const, error: SUPPLIES_MIGRATION_HINT };
    }
    const insertLegacy = await supabase.from("products").insert(insertBase).select("id").single();
    product = insertLegacy.data;
    pErr = insertLegacy.error;
  }

  if (pErr || !product) {
    return {
      ok: false as const,
      error: suppliesSchemaUserMessage(pErr?.message ?? "No se pudo crear el producto"),
    };
  }

  const linkError = await syncProductOptions(product.id, input.optionIds);
  if (linkError) {
    await supabase.from("products").delete().eq("id", product.id);
    return { ok: false as const, error: linkError };
  }

  if (useSuppliesFlag) {
    const list = input.supplies ?? [];
    if (list.length === 0) {
      await supabase.from("products").delete().eq("id", product.id);
      return { ok: false as const, error: "Agrega al menos un insumo o desactiva la opción" };
    }
    const supplyError = await syncProductSupplies(product.id, true, list);
    if (supplyError) {
      await supabase.from("products").delete().eq("id", product.id);
      return { ok: false as const, error: supplyError };
    }
  }

  if (trackStock && initialStock > 0) {
    await supabase.from("inventory_movements").insert({
      product_id: product.id,
      movement_type: "in",
      quantity: initialStock,
      notes: "Stock inicial",
    });
  }

  revalidateProductPaths(product.id);
  revalidatePath("/inventario");
  return { ok: true as const, id: product.id };
}

function parseStockUnits(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return { ok: false as const, error: "Indica un stock válido (0 o más unidades)" };
  }
  return { ok: true as const, stock: Math.floor(value) };
}

export async function updateProduct(
  id: string,
  input: {
    name: string;
    price: number;
    optionIds: string[];
    trackStock?: boolean;
    stock?: number;
    minStock?: number;
    useSupplies?: boolean;
    supplies?: ProductSupplyPayload[];
  }
) {
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: "El nombre es obligatorio" };
  if (!Number.isFinite(input.price) || input.price < 0) {
    return { ok: false as const, error: "Precio inválido" };
  }

  const supabase = createSupabaseServer();

  const trackStock = Boolean(input.trackStock);
  const minStock = trackStock ? Math.max(0, Math.floor(Number(input.minStock ?? 0))) : 0;

  let desiredStock: number | undefined;
  if (trackStock) {
    const parsed = parseStockUnits(input.stock);
    if (!parsed.ok) return parsed;
    desiredStock = parsed.stock;
  }

  const { data: existing } = await supabase
    .from("products")
    .select("id, track_stock, stock")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!existing) {
    return { ok: false as const, error: "Producto no encontrado" };
  }

  const prevTrack = Boolean(existing.track_stock);
  const prevStock = Number(existing.stock ?? 0);

  const { error: uErr } = await supabase
    .from("products")
    .update({
      name,
      unit_price: input.price,
      track_stock: trackStock,
      min_stock: minStock,
      ...(trackStock && desiredStock !== undefined && !prevTrack
        ? { stock: desiredStock }
        : {}),
    })
    .eq("id", id);

  if (uErr) return { ok: false as const, error: uErr.message };

  if (trackStock && desiredStock !== undefined) {
    if (!prevTrack) {
      if (desiredStock > 0) {
        await supabase.from("inventory_movements").insert({
          product_id: id,
          movement_type: "in",
          quantity: desiredStock,
          notes: "Stock al activar control",
        });
      }
    } else if (desiredStock !== prevStock) {
      const { error: adjErr } = await supabase.rpc("adjust_stock", {
        p_product_id: id,
        p_movement_type: "adjustment",
        p_quantity: desiredStock,
        p_notes: "Ajuste desde ficha de producto",
      });
      if (adjErr) return { ok: false as const, error: adjErr.message };
    }
  }

  const linkError = await syncProductOptions(id, input.optionIds);
  if (linkError) return { ok: false as const, error: linkError };

  const useSupplies = Boolean(input.useSupplies);
  if (useSupplies && (input.supplies ?? []).length === 0) {
    return { ok: false as const, error: "Agrega al menos un insumo o desactiva la opción" };
  }
  const supplyError = await syncProductSupplies(
    id,
    useSupplies,
    useSupplies ? (input.supplies ?? []) : []
  );
  if (supplyError) return { ok: false as const, error: supplyError };

  revalidateProductPaths(id);
  revalidatePath("/inventario");
  return { ok: true as const };
}

export async function deleteProduct(id: string) {
  const supabase = createSupabaseServer();

  const { data: existing } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!existing) {
    return { ok: false as const, error: "Producto no encontrado" };
  }

  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidateProductPaths(id);
  return { ok: true as const };
}
