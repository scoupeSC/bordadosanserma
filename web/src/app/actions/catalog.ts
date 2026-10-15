"use server";

import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/slug";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { AttributeGroup } from "@/lib/types";

function revalidateCatalog() {
  revalidatePath("/productos/nuevo");
  revalidatePath("/productos", "layout");
  revalidatePath("/");
}

const ARCHIVE_MIGRATION_HINT =
  "Ejecuta npm run db:migrate en la carpeta HADER (migración 014) para poder ocultar etiquetas usadas en ventas.";

function isMissingArchiveColumn(message: string) {
  return message.includes("is_active") && message.includes("does not exist");
}

async function countSaleOptionReferences(
  supabase: ReturnType<typeof createSupabaseServer>,
  optionIds: string[]
): Promise<number> {
  if (optionIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("sale_item_options")
    .select("*", { count: "exact", head: true })
    .in("option_id", optionIds);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function archiveAttributeOptions(
  supabase: ReturnType<typeof createSupabaseServer>,
  optionIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  // No tocar product_attribute_options: cada producto se edita por separado al guardar.
  const { error } = await supabase
    .from("attribute_options")
    .update({ is_active: false })
    .in("id", optionIds);
  if (error) {
    if (isMissingArchiveColumn(error.message)) {
      return { ok: false, error: ARCHIVE_MIGRATION_HINT };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

type CatalogRow = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
};

type OptionRow = {
  id: string;
  group_id: string;
  label: string;
  slug: string;
  display_order: number;
};

function isMissingProductScopeColumn(message: string) {
  return message.includes("product_id") && message.includes("does not exist");
}

async function loadActiveCatalogRows(supabase: ReturnType<typeof createSupabaseServer>) {
  let groupsRes = await supabase
    .from("attribute_groups")
    .select("id, name, slug, display_order")
    .eq("is_active", true)
    .is("product_id", null)
    .order("display_order", { ascending: true });

  let optionsRes = await supabase
    .from("attribute_options")
    .select("id, group_id, label, slug, display_order")
    .eq("is_active", true)
    .is("product_id", null)
    .order("display_order", { ascending: true });

  if (
    (groupsRes.error && isMissingProductScopeColumn(groupsRes.error.message)) ||
    (optionsRes.error && isMissingProductScopeColumn(optionsRes.error.message))
  ) {
    groupsRes = await supabase
      .from("attribute_groups")
      .select("id, name, slug, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    optionsRes = await supabase
      .from("attribute_options")
      .select("id, group_id, label, slug, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
  }

  const missingArchive =
    (groupsRes.error && isMissingArchiveColumn(groupsRes.error.message)) ||
    (optionsRes.error && isMissingArchiveColumn(optionsRes.error.message));

  if (missingArchive) {
    const [groupsLegacy, optionsLegacy] = await Promise.all([
      supabase
        .from("attribute_groups")
        .select("id, name, slug, display_order")
        .order("display_order", { ascending: true }),
      supabase
        .from("attribute_options")
        .select("id, group_id, label, slug, display_order")
        .order("display_order", { ascending: true }),
    ]);
    if (groupsLegacy.error) throw new Error(groupsLegacy.error.message);
    if (optionsLegacy.error) throw new Error(optionsLegacy.error.message);
    return {
      groups: (groupsLegacy.data ?? []) as CatalogRow[],
      options: (optionsLegacy.data ?? []) as OptionRow[],
    };
  }

  if (groupsRes.error) throw new Error(groupsRes.error.message);
  if (optionsRes.error) throw new Error(optionsRes.error.message);

  return {
    groups: (groupsRes.data ?? []) as CatalogRow[],
    options: (optionsRes.data ?? []) as OptionRow[],
  };
}

export async function getAttributeCatalog(): Promise<AttributeGroup[]> {
  const supabase = createSupabaseServer();
  const { groups, options } = await loadActiveCatalogRows(supabase);

  return groups.map((g) => ({
    ...g,
    options: options
      .filter((o) => o.group_id === g.id)
      .map(({ id, label, slug, display_order }) => ({
        id,
        label,
        slug,
        display_order,
      })),
  }));
}

export async function createAttributeGroup(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Escribe un nombre para la categoría" };

  const supabase = createSupabaseServer();
  const slug = toSlug(trimmed) || `grupo-${Date.now()}`;

  const { data: last } = await supabase
    .from("attribute_groups")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("attribute_groups").insert({
    name: trimmed,
    slug,
    display_order: (last?.display_order ?? 0) + 1,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Ya existe una categoría con ese nombre" };
    }
    return { ok: false as const, error: error.message };
  }

  revalidateCatalog();
  return { ok: true as const };
}

export async function updateAttributeGroup(groupId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "El nombre no puede estar vacío" };

  const supabase = createSupabaseServer();
  let slug = toSlug(trimmed) || `grupo-${Date.now()}`;

  const { error } = await supabase
    .from("attribute_groups")
    .update({ name: trimmed, slug })
    .eq("id", groupId);

  if (error?.code === "23505") {
    slug = `${slug}-${Date.now()}`;
    const retry = await supabase
      .from("attribute_groups")
      .update({ name: trimmed, slug })
      .eq("id", groupId);
    if (retry.error) return { ok: false as const, error: retry.error.message };
  } else if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidateCatalog();
  return { ok: true as const };
}

export async function deleteAttributeGroup(groupId: string) {
  const supabase = createSupabaseServer();

  const { data: options, error: optErr } = await supabase
    .from("attribute_options")
    .select("id")
    .eq("group_id", groupId);
  if (optErr) return { ok: false as const, error: optErr.message };

  const optionIds = (options ?? []).map((o) => o.id);

  try {
    const saleRefs = await countSaleOptionReferences(supabase, optionIds);
    if (saleRefs > 0) {
      const archived = await archiveAttributeOptions(supabase, optionIds);
      if (!archived.ok) return { ok: false as const, error: archived.error };

      const { error: groupErr } = await supabase
        .from("attribute_groups")
        .update({ is_active: false })
        .eq("id", groupId);
      if (groupErr) {
        if (isMissingArchiveColumn(groupErr.message)) {
          return { ok: false as const, error: ARCHIVE_MIGRATION_HINT };
        }
        return { ok: false as const, error: groupErr.message };
      }

      revalidateCatalog();
      return {
        ok: true as const,
        info: "Categoría oculta del catálogo. Los productos que ya la usan no cambian hasta que los edites.",
      };
    }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Error al validar ventas" };
  }

  const { error } = await supabase.from("attribute_groups").delete().eq("id", groupId);
  if (error) {
    if (error.message.includes("sale_item_options_option_id_fkey")) {
      return { ok: false as const, error: ARCHIVE_MIGRATION_HINT };
    }
    return { ok: false as const, error: error.message };
  }

  revalidateCatalog();
  return { ok: true as const };
}

export async function createAttributeOption(groupId: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false as const, error: "Escribe el valor de la etiqueta" };

  const supabase = createSupabaseServer();
  const slug = toSlug(trimmed) || `opt-${Date.now()}`;

  const { data: last } = await supabase
    .from("attribute_options")
    .select("display_order")
    .eq("group_id", groupId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("attribute_options").insert({
    group_id: groupId,
    label: trimmed,
    slug,
    display_order: (last?.display_order ?? 0) + 1,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Ese valor ya existe en esta categoría" };
    }
    return { ok: false as const, error: error.message };
  }

  revalidateCatalog();
  return { ok: true as const };
}

export async function updateAttributeOption(optionId: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false as const, error: "El valor no puede estar vacío" };

  const supabase = createSupabaseServer();
  let slug = toSlug(trimmed) || `opt-${Date.now()}`;

  const { data: row } = await supabase
    .from("attribute_options")
    .select("group_id")
    .eq("id", optionId)
    .maybeSingle();

  if (!row) return { ok: false as const, error: "Valor no encontrado" };

  const { error } = await supabase
    .from("attribute_options")
    .update({ label: trimmed, slug })
    .eq("id", optionId);

  if (error?.code === "23505") {
    slug = `${slug}-${Date.now()}`;
    const retry = await supabase
      .from("attribute_options")
      .update({ label: trimmed, slug })
      .eq("id", optionId);
    if (retry.error) return { ok: false as const, error: retry.error.message };
  } else if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidateCatalog();
  return { ok: true as const };
}

export async function deleteAttributeOption(optionId: string) {
  const supabase = createSupabaseServer();

  try {
    const saleRefs = await countSaleOptionReferences(supabase, [optionId]);
    if (saleRefs > 0) {
      const archived = await archiveAttributeOptions(supabase, [optionId]);
      if (!archived.ok) return { ok: false as const, error: archived.error };
      revalidateCatalog();
      return {
        ok: true as const,
        info: "Etiqueta oculta del catálogo. Los demás productos que la usan no se modifican.",
      };
    }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Error al validar ventas" };
  }

  const { error } = await supabase.from("attribute_options").delete().eq("id", optionId);
  if (error) {
    if (error.message.includes("sale_item_options_option_id_fkey")) {
      const archived = await archiveAttributeOptions(supabase, [optionId]);
      if (!archived.ok) return { ok: false as const, error: archived.error };
      revalidateCatalog();
      return {
        ok: true as const,
        info: "Etiqueta oculta del catálogo. Los demás productos que la usan no se modifican.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  revalidateCatalog();
  return { ok: true as const };
}
