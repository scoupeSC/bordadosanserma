"use server";

import { revalidatePath } from "next/cache";
import { toSlug } from "@/lib/slug";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { AttributeGroup } from "@/lib/types";

function revalidateProductTags(productId: string) {
  revalidatePath(`/productos/${productId}/editar`);
  revalidatePath("/productos", "layout");
  revalidatePath("/ventas", "layout");
  revalidatePath("/");
}

function isMissingColumn(message: string, column: string) {
  return message.includes(column) && message.includes("does not exist");
}

const MIGRATION_HINT =
  "Ejecuta npm run db:migrate en HADER (migraciones 016–018) y recarga el schema en Supabase.";

/** Categorías activas en este producto, con todos los valores (rojo, azul…) para marcar/desmarcar. */
export async function getProductTagCatalog(productId: string): Promise<AttributeGroup[]> {
  const supabase = createSupabaseServer();

  const groupsRes = await supabase
    .from("attribute_groups")
    .select("id, name, slug, display_order, product_id")
    .eq("is_active", true)
    .or(`product_id.is.null,product_id.eq.${productId}`)
    .order("display_order", { ascending: true });

  if (groupsRes.error && isMissingColumn(groupsRes.error.message, "product_id")) {
    const legacy = await supabase
      .from("attribute_groups")
      .select("id, name, slug, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (legacy.error) throw new Error(legacy.error.message);
    groupsRes.data = legacy.data;
    groupsRes.error = null;
  }

  if (groupsRes.error) throw new Error(groupsRes.error.message);
  const groups = groupsRes.data;

  const { data: groupLabels } = await supabase
    .from("product_attribute_group_labels")
    .select("group_id, name")
    .eq("product_id", productId);

  const groupNameById = new Map((groupLabels ?? []).map((r) => [r.group_id, r.name]));

  const { data: excludedRows } = await supabase
    .from("product_tag_group_exclusions")
    .select("group_id")
    .eq("product_id", productId);

  const excludedGroupIds = new Set((excludedRows ?? []).map((r) => r.group_id));

  const { data: links, error: lErr } = await supabase
    .from("product_attribute_options")
    .select("option_id, label")
    .eq("product_id", productId);

  if (lErr && isMissingColumn(lErr.message, "label")) throw new Error(MIGRATION_HINT);
  if (lErr) throw new Error(lErr.message);

  const linkLabelByOption = new Map<string, string | null>(
    (links ?? []).map((r) => [r.option_id, r.label as string | null])
  );

  const catalog: AttributeGroup[] = [];

  for (const g of groups ?? []) {
    if (excludedGroupIds.has(g.id)) continue;

    const { data: opts, error: oErr } = await supabase
      .from("attribute_options")
      .select("id, label, slug, display_order, product_id")
      .eq("group_id", g.id)
      .eq("is_active", true)
      .or(`product_id.is.null,product_id.eq.${productId}`)
      .order("display_order", { ascending: true });

    if (oErr) {
      if (isMissingColumn(oErr.message, "product_id")) throw new Error(MIGRATION_HINT);
      throw new Error(oErr.message);
    }

    catalog.push({
      ...g,
      name: groupNameById.get(g.id) ?? g.name,
      options: (opts ?? []).map(({ id, label, slug, display_order }) => ({
        id,
        label: linkLabelByOption.get(id)?.trim() || label,
        slug,
        display_order,
      })),
    });
  }

  return catalog;
}

export async function setProductTagOptionLinked(
  productId: string,
  optionId: string,
  linked: boolean
) {
  const supabase = createSupabaseServer();

  if (!linked) {
    const { error } = await supabase
      .from("product_attribute_options")
      .delete()
      .eq("product_id", productId)
      .eq("option_id", optionId);
    if (error) return { ok: false as const, error: error.message };
    revalidateProductTags(productId);
    return { ok: true as const };
  }

  const { data: opt } = await supabase
    .from("attribute_options")
    .select("id, label, group_id")
    .eq("id", optionId)
    .maybeSingle();

  if (!opt) return { ok: false as const, error: "Valor no encontrado" };

  const { data: existing } = await supabase
    .from("product_attribute_options")
    .select("option_id")
    .eq("product_id", productId)
    .eq("option_id", optionId)
    .maybeSingle();

  if (existing) {
    revalidateProductTags(productId);
    return { ok: true as const };
  }

  const { error: linkErr } = await supabase.from("product_attribute_options").insert({
    product_id: productId,
    option_id: optionId,
    label: opt.label,
  });

  if (linkErr && isMissingColumn(linkErr.message, "label")) {
    const retry = await supabase.from("product_attribute_options").insert({
      product_id: productId,
      option_id: optionId,
    });
    if (retry.error) return { ok: false as const, error: retry.error.message };
  } else if (linkErr) {
    return { ok: false as const, error: linkErr.message };
  }

  if (opt.group_id) {
    await supabase
      .from("product_tag_group_visibility")
      .delete()
      .eq("product_id", productId)
      .eq("group_id", opt.group_id);
  }

  revalidateProductTags(productId);
  return { ok: true as const };
}

export async function getHiddenProductTagGroups(
  productId: string
): Promise<{ id: string; name: string }[]> {
  const supabase = createSupabaseServer();

  const { data: excluded, error: exErr } = await supabase
    .from("product_tag_group_exclusions")
    .select("group_id")
    .eq("product_id", productId);

  if (exErr) {
    if (exErr.message.includes("product_tag_group_exclusions")) return [];
    throw new Error(exErr.message);
  }

  const ids = (excluded ?? []).map((r) => r.group_id);
  if (ids.length === 0) return [];

  const { data: groups, error: gErr } = await supabase
    .from("attribute_groups")
    .select("id, name")
    .in("id", ids)
    .order("name");

  if (gErr) throw new Error(gErr.message);
  return groups ?? [];
}

/** Muestra una categoría global en este producto para poder agregar valores (sin afectar otros). */
export async function openProductTagGroup(productId: string, groupId: string) {
  const supabase = createSupabaseServer();

  await supabase
    .from("product_tag_group_exclusions")
    .delete()
    .eq("product_id", productId)
    .eq("group_id", groupId);

  const { error } = await supabase.from("product_tag_group_visibility").upsert(
    { product_id: productId, group_id: groupId },
    { onConflict: "product_id,group_id" }
  );

  if (error?.message.includes("product_tag_group_visibility")) {
    return { ok: false as const, error: "Ejecuta npm run db:migrate (017)." };
  }
  if (error) return { ok: false as const, error: error.message };

  revalidateProductTags(productId);
  return { ok: true as const };
}

export async function listAddableTagGroups(
  productId: string
): Promise<{ id: string; name: string }[]> {
  const supabase = createSupabaseServer();
  const catalog = await getProductTagCatalog(productId);
  const visibleIds = new Set(catalog.map((g) => g.id));

  const { data: groups, error: gErr } = await supabase
    .from("attribute_groups")
    .select("id, name, display_order")
    .eq("is_active", true)
    .order("display_order");

  if (gErr) throw new Error(gErr.message);

  const { data: excluded } = await supabase
    .from("product_tag_group_exclusions")
    .select("group_id")
    .eq("product_id", productId);

  const excludedIds = new Set((excluded ?? []).map((r) => r.group_id));

  return (groups ?? []).filter((g) => !visibleIds.has(g.id) && !excludedIds.has(g.id));
}

export async function restoreProductTagGroup(productId: string, groupId: string) {
  const supabase = createSupabaseServer();
  const { error } = await supabase
    .from("product_tag_group_exclusions")
    .delete()
    .eq("product_id", productId)
    .eq("group_id", groupId);

  if (error?.message.includes("product_tag_group_exclusions")) {
    return { ok: false as const, error: "Ejecuta npm run db:migrate (017)." };
  }
  if (error) return { ok: false as const, error: error.message };

  revalidateProductTags(productId);
  return { ok: true as const };
}

export async function getProductTagSelection(productId: string): Promise<string[]> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from("product_attribute_options")
    .select("option_id")
    .eq("product_id", productId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.option_id);
}

/** Categoría nueva solo para este producto (no aparece en otros artículos). */
export async function createProductTagGroup(productId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Escribe un nombre para la categoría" };

  const supabase = createSupabaseServer();
  const slug = `${toSlug(trimmed) || "grupo"}-${productId.slice(0, 8)}-${Date.now()}`;

  const { data: last } = await supabase
    .from("attribute_groups")
    .select("display_order")
    .or(`product_id.is.null,product_id.eq.${productId}`)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("attribute_groups").insert({
    name: trimmed,
    slug,
    display_order: (last?.display_order ?? 0) + 1,
    product_id: productId,
  });

  if (error) {
    if (isMissingColumn(error.message, "product_id")) {
      return { ok: false as const, error: MIGRATION_HINT };
    }
    if (error.code === "23505") {
      return { ok: false as const, error: "Ya existe una categoría con ese nombre" };
    }
    return { ok: false as const, error: error.message };
  }

  revalidateProductTags(productId);
  return { ok: true as const };
}

export async function createProductTagOption(productId: string, groupId: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false as const, error: "Escribe el valor" };

  const supabase = createSupabaseServer();

  const { data: grp } = await supabase
    .from("attribute_groups")
    .select("product_id")
    .eq("id", groupId)
    .maybeSingle();

  if (grp?.product_id && grp.product_id !== productId) {
    return { ok: false as const, error: "Esta categoría pertenece a otro producto" };
  }

  const slug = `${toSlug(trimmed) || "val"}-${Date.now()}`;

  const { data: last } = await supabase
    .from("attribute_options")
    .select("display_order")
    .eq("group_id", groupId)
    .eq("product_id", productId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("product_tag_group_exclusions")
    .delete()
    .eq("product_id", productId)
    .eq("group_id", groupId);

  await supabase
    .from("product_tag_group_visibility")
    .delete()
    .eq("product_id", productId)
    .eq("group_id", groupId);

  const { data: opt, error: insErr } = await supabase
    .from("attribute_options")
    .insert({
      group_id: groupId,
      label: trimmed,
      slug,
      display_order: (last?.display_order ?? 0) + 1,
      product_id: productId,
    })
    .select("id")
    .single();

  if (insErr) {
    if (isMissingColumn(insErr.message, "product_id")) {
      return { ok: false as const, error: MIGRATION_HINT };
    }
    return { ok: false as const, error: insErr.message };
  }

  const { error: linkErr } = await supabase.from("product_attribute_options").insert({
    product_id: productId,
    option_id: opt.id,
    label: trimmed,
  });

  if (linkErr && isMissingColumn(linkErr.message, "label")) {
    const retry = await supabase.from("product_attribute_options").insert({
      product_id: productId,
      option_id: opt.id,
    });
    if (retry.error) return { ok: false as const, error: retry.error.message };
  } else if (linkErr) {
    return { ok: false as const, error: linkErr.message };
  }

  revalidateProductTags(productId);
  return { ok: true as const, optionId: opt.id };
}

export async function updateProductTagGroupName(productId: string, groupId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "El nombre no puede estar vacío" };

  const supabase = createSupabaseServer();

  const { data: grp } = await supabase
    .from("attribute_groups")
    .select("product_id")
    .eq("id", groupId)
    .maybeSingle();

  if (grp?.product_id === productId) {
    const slug = `${toSlug(trimmed) || "grupo"}-${productId.slice(0, 8)}-${Date.now()}`;
    const { error } = await supabase
      .from("attribute_groups")
      .update({ name: trimmed, slug })
      .eq("id", groupId)
      .eq("product_id", productId);
    if (error) return { ok: false as const, error: error.message };
    revalidateProductTags(productId);
    return { ok: true as const };
  }

  const { error } = await supabase.from("product_attribute_group_labels").upsert(
    { product_id: productId, group_id: groupId, name: trimmed },
    { onConflict: "product_id,group_id" }
  );

  if (error) {
    if (error.message.includes("product_attribute_group_labels")) {
      return { ok: false as const, error: MIGRATION_HINT };
    }
    return { ok: false as const, error: error.message };
  }

  revalidateProductTags(productId);
  return { ok: true as const };
}

export async function updateProductTagOptionLabel(
  productId: string,
  optionId: string,
  label: string
) {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false as const, error: "El valor no puede estar vacío" };

  const supabase = createSupabaseServer();

  const { data: opt } = await supabase
    .from("attribute_options")
    .select("id, product_id")
    .eq("id", optionId)
    .maybeSingle();

  if (!opt) return { ok: false as const, error: "Valor no encontrado" };

  if (opt.product_id === productId) {
    const { error } = await supabase
      .from("attribute_options")
      .update({ label: trimmed, slug: `${toSlug(trimmed) || "val"}-${Date.now()}` })
      .eq("id", optionId)
      .eq("product_id", productId);
    if (error) return { ok: false as const, error: error.message };
  }

  const { error: linkErr } = await supabase
    .from("product_attribute_options")
    .update({ label: trimmed })
    .eq("product_id", productId)
    .eq("option_id", optionId);

  if (linkErr && isMissingColumn(linkErr.message, "label")) {
    return { ok: false as const, error: MIGRATION_HINT };
  }
  if (linkErr) return { ok: false as const, error: linkErr.message };

  revalidateProductTags(productId);
  return { ok: true as const };
}

export async function removeProductTagGroupFromProduct(productId: string, groupId: string) {
  const supabase = createSupabaseServer();

  const { data: grpRow } = await supabase
    .from("attribute_groups")
    .select("product_id")
    .eq("id", groupId)
    .maybeSingle();

  if (grpRow?.product_id === productId) {
    const { data: ownedOpts } = await supabase
      .from("attribute_options")
      .select("id")
      .eq("group_id", groupId)
      .eq("product_id", productId);

    const ownedIds = (ownedOpts ?? []).map((o) => o.id);

    if (ownedIds.length > 0) {
      await supabase
        .from("product_attribute_options")
        .delete()
        .eq("product_id", productId)
        .in("option_id", ownedIds);

      for (const id of ownedIds) {
        const { count } = await supabase
          .from("sale_item_options")
          .select("*", { count: "exact", head: true })
          .eq("option_id", id);

        if ((count ?? 0) > 0) {
          await supabase.from("attribute_options").update({ is_active: false }).eq("id", id);
        } else {
          await supabase.from("attribute_options").delete().eq("id", id).eq("product_id", productId);
        }
      }
    }

    await supabase.from("product_attribute_group_labels").delete().eq("product_id", productId).eq("group_id", groupId);

    const { error: delGrpErr } = await supabase
      .from("attribute_groups")
      .delete()
      .eq("id", groupId)
      .eq("product_id", productId);

    if (delGrpErr) return { ok: false as const, error: delGrpErr.message };

    revalidateProductTags(productId);
    return { ok: true as const };
  }

  const { data: owned } = await supabase
    .from("attribute_options")
    .select("id")
    .eq("product_id", productId)
    .eq("group_id", groupId);

  const { data: linked } = await supabase
    .from("product_attribute_options")
    .select("option_id, attribute_options ( group_id )")
    .eq("product_id", productId);

  const idsInGroup: string[] = [];
  for (const row of linked ?? []) {
    const ao = row.attribute_options as { group_id?: string } | { group_id?: string }[] | null;
    const g = Array.isArray(ao) ? ao[0]?.group_id : ao?.group_id;
    if (g === groupId) idsInGroup.push(row.option_id);
  }

  const allIds = [...new Set([...idsInGroup, ...(owned ?? []).map((o) => o.id)])];

  if (allIds.length > 0) {
    await supabase
      .from("product_attribute_options")
      .delete()
      .eq("product_id", productId)
      .in("option_id", allIds);

    for (const id of allIds) {
      const { data: opt } = await supabase
        .from("attribute_options")
        .select("product_id")
        .eq("id", id)
        .maybeSingle();
      if (opt?.product_id !== productId) continue;

      const { count } = await supabase
        .from("sale_item_options")
        .select("*", { count: "exact", head: true })
        .eq("option_id", id);

      if ((count ?? 0) > 0) {
        await supabase.from("attribute_options").update({ is_active: false }).eq("id", id);
      } else {
        await supabase.from("attribute_options").delete().eq("id", id).eq("product_id", productId);
      }
    }
  }

  await supabase
    .from("product_attribute_group_labels")
    .delete()
    .eq("product_id", productId)
    .eq("group_id", groupId);

  await supabase
    .from("product_tag_group_visibility")
    .delete()
    .eq("product_id", productId)
    .eq("group_id", groupId);

  const { error: exErr } = await supabase.from("product_tag_group_exclusions").upsert(
    { product_id: productId, group_id: groupId },
    { onConflict: "product_id,group_id" }
  );

  if (exErr && !exErr.message.includes("product_tag_group_exclusions")) {
    return { ok: false as const, error: exErr.message };
  }
  if (exErr?.message.includes("product_tag_group_exclusions")) {
    return { ok: false as const, error: "Ejecuta npm run db:migrate (017)." };
  }

  revalidateProductTags(productId);
  return { ok: true as const };
}

export async function removeProductTagOptionFromProduct(productId: string, optionId: string) {
  const supabase = createSupabaseServer();

  await supabase
    .from("product_attribute_options")
    .delete()
    .eq("product_id", productId)
    .eq("option_id", optionId);

  const { data: opt } = await supabase
    .from("attribute_options")
    .select("product_id")
    .eq("id", optionId)
    .maybeSingle();

  if (opt?.product_id === productId) {
    const { count } = await supabase
      .from("sale_item_options")
      .select("*", { count: "exact", head: true })
      .eq("option_id", optionId);

    if ((count ?? 0) > 0) {
      await supabase.from("attribute_options").update({ is_active: false }).eq("id", optionId);
    } else {
      await supabase.from("attribute_options").delete().eq("id", optionId).eq("product_id", productId);
    }
  }

  revalidateProductTags(productId);
  return { ok: true as const };
}

/** Tras crear producto: valores creados sin product_id pasan a ser de este artículo. */
/** Valor nuevo en formulario “crear producto” (aún sin product_id). */
export async function createPendingProductTagOption(groupId: string, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false as const, error: "Escribe el valor" };

  const supabase = createSupabaseServer();
  const slug = `${toSlug(trimmed) || "val"}-${Date.now()}`;

  const { data: opt, error } = await supabase
    .from("attribute_options")
    .insert({
      group_id: groupId,
      label: trimmed,
      slug,
      display_order: 1,
      product_id: null,
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingColumn(error.message, "product_id")) {
      return { ok: false as const, error: MIGRATION_HINT };
    }
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, optionId: opt.id };
}

export async function claimOrphanTagOptionsForProduct(productId: string, optionIds: string[]) {
  if (optionIds.length === 0) return;
  const supabase = createSupabaseServer();
  await supabase
    .from("attribute_options")
    .update({ product_id: productId })
    .in("id", optionIds)
    .is("product_id", null);
}
