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

export async function getAttributeCatalog(): Promise<AttributeGroup[]> {
  const supabase = createSupabaseServer();
  const { data: groups, error: gErr } = await supabase
    .from("attribute_groups")
    .select("id, name, slug, display_order")
    .order("display_order", { ascending: true });

  if (gErr) throw new Error(gErr.message);

  const { data: options, error: oErr } = await supabase
    .from("attribute_options")
    .select("id, group_id, label, slug, display_order")
    .order("display_order", { ascending: true });

  if (oErr) throw new Error(oErr.message);

  return (groups ?? []).map((g) => ({
    ...g,
    options: (options ?? [])
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
  const { error } = await supabase.from("attribute_groups").delete().eq("id", groupId);

  if (error) return { ok: false as const, error: error.message };

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
  const { error } = await supabase.from("attribute_options").delete().eq("id", optionId);

  if (error) return { ok: false as const, error: error.message };

  revalidateCatalog();
  return { ok: true as const };
}
