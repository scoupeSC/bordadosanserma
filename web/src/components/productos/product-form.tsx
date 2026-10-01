"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Boxes, FlaskConical, Tag } from "lucide-react";
import {
  ProductSuppliesEditor,
  parseSupplyDrafts,
  suppliesFromInitial,
  type SupplyDraft,
} from "@/components/productos/product-supplies-editor";
import {
  createProduct,
  removeProductImage,
  updateProduct,
  uploadProductImage,
} from "@/app/actions/products";
import { ProductImageField } from "@/components/productos/product-image-field";
import { TagCatalogManager } from "@/components/productos/tag-catalog-manager";
import { DeleteProductButton } from "@/components/productos/delete-product-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { ToggleRow } from "@/components/ui/toggle-row";
import { formatMoney } from "@/lib/format";
import { formatPriceForInput } from "@/lib/product-utils";
import type { AttributeGroup } from "@/lib/types";
import type { ProductSupplyPayload } from "@/lib/product-supplies";

export type ProductFormInitial = {
  name: string;
  price: number;
  imageUrl?: string | null;
  optionIds: string[];
  trackStock?: boolean;
  stock?: number;
  minStock?: number;
  useSupplies?: boolean;
  supplies?: { name: string; quantity: number; unit_price: number | null }[];
};

type ProductFormProps = {
  catalog: AttributeGroup[];
  mode: "create" | "edit";
  productId?: string;
  initial?: ProductFormInitial;
};

function applyInitial(initial: ProductFormInitial) {
  return {
    name: initial.name,
    price: formatPriceForInput(initial.price),
    selected: new Set(initial.optionIds),
    trackStock: Boolean(initial.trackStock),
    stockUnits: initial.stock != null ? String(initial.stock) : "",
    minStock: initial.minStock != null ? String(initial.minStock) : "0",
    useSupplies: Boolean(initial.useSupplies),
    supplyRows: suppliesFromInitial(initial.supplies ?? []),
  };
}

export function ProductForm({ catalog, mode, productId, initial }: ProductFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const seeded = initial ? applyInitial(initial) : null;
  const [name, setName] = useState(seeded?.name ?? "");
  const [price, setPrice] = useState(seeded?.price ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    () => seeded?.selected ?? new Set<string>()
  );
  const [trackStock, setTrackStock] = useState(seeded?.trackStock ?? false);
  const [stockUnits, setStockUnits] = useState(seeded?.stockUnits ?? "");
  const [minStock, setMinStock] = useState(seeded?.minStock ?? "0");
  const [useSupplies, setUseSupplies] = useState(seeded?.useSupplies ?? false);
  const [supplyRows, setSupplyRows] = useState<SupplyDraft[]>(seeded?.supplyRows ?? []);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOption = (optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const selectedCount = selected.size;

  const pricePreview = useMemo(() => {
    const n = Number(String(price).replace(/,/g, "."));
    return Number.isFinite(n) && n > 0 ? formatMoney(n) : null;
  }, [price]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedPrice = Number(String(price).replace(/,/g, "."));
    startTransition(async () => {
      const parsedMin = Math.max(0, Math.floor(Number(String(minStock).replace(/,/g, "")) || 0));

      let parsedStock: number | undefined;
      if (trackStock) {
        const raw = String(stockUnits).replace(/\s/g, "").replace(/,/g, "");
        const n = raw === "" ? 0 : Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          setError("El stock debe ser un número entero de 0 en adelante");
          return;
        }
        parsedStock = Math.floor(n);
      }

      let supplies: ProductSupplyPayload[] = [];
      if (useSupplies) {
        const parsed = parseSupplyDrafts(supplyRows);
        if (!parsed.ok) {
          setError(parsed.error);
          return;
        }
        supplies = parsed.supplies;
      }

      const payload = {
        name,
        price: parsedPrice,
        optionIds: [...selected],
        trackStock,
        initialStock: mode === "create" ? parsedStock : undefined,
        stock: mode === "edit" ? parsedStock : undefined,
        minStock: parsedMin,
        useSupplies,
        supplies: useSupplies ? supplies : [],
      };

      const result =
        mode === "edit" && productId
          ? await updateProduct(productId, payload)
          : await createProduct(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const createdId =
        result.ok && "id" in result && typeof result.id === "string" ? result.id : null;
      const targetId = mode === "edit" && productId ? productId : createdId;
      if (targetId) {
        if (imageFile) {
          const fd = new FormData();
          fd.append("file", imageFile);
          const up = await uploadProductImage(targetId, fd);
          if (!up.ok) {
            setError(up.error);
            return;
          }
        } else if (clearImage && mode === "edit") {
          const rm = await removeProductImage(targetId);
          if (!rm.ok) {
            setError(rm.error);
            return;
          }
        }
      }

      router.push("/productos");
      router.refresh();
    });
  };

  const removeOptionFromSelection = (optionId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(optionId);
      return next;
    });
  };

  const removeGroupFromSelection = (_groupId: string, optionIds: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of optionIds) next.delete(id);
      return next;
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-4">
      <Panel
        step={1}
        title="Nombre y precio"
        description={
          mode === "edit"
            ? "Datos actuales del producto. Al terminar, guarda los cambios."
            : "Lo mínimo para publicar en el catálogo."
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              label="Nombre del producto"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Camiseta algodón · cuello redondo"
            />
          </div>
          <Input
            label="Precio de venta (COP)"
            required
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="89000"
            className="tabular-nums"
            hint={
              pricePreview
                ? `En pantalla se verá: ${pricePreview}`
                : "Sin puntos ni símbolos, solo el valor."
            }
          />
          <ProductImageField
            existingUrl={initial?.imageUrl}
            disabled={pending}
            clearExisting={clearImage}
            onChange={(file) => {
              setImageFile(file);
              if (file) setClearImage(false);
            }}
            onClearExisting={() => setClearImage(true)}
          />
        </div>
      </Panel>

      <Panel
        step={2}
        title="Inventario"
        description={
          trackStock
            ? "Las ventas descontarán unidades cuando haya stock suficiente."
            : "Opcional · desactivado por defecto"
        }
        icon={Boxes}
      >
        <ToggleRow
          checked={trackStock}
          onChange={setTrackStock}
          icon={Boxes}
          title="Controlar stock"
          description="Si está activo, el producto aparece en Inventario y puedes registrar entradas y salidas."
        />

        {trackStock && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Unidades en stock"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={stockUnits}
              onChange={(e) => setStockUnits(e.target.value)}
              placeholder="Ej. 0, 15, 200…"
              hint={
                mode === "create"
                  ? "Cantidad actual en bodega. Puedes poner el número que necesites."
                  : "Cambia el total disponible. También puedes usar Inventario para entradas y salidas."
              }
            />
            <Input
              label="Stock mínimo (alerta)"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="0"
              hint="Si el stock baja a este valor, se marca como bajo en Inventario."
            />
          </div>
        )}
      </Panel>

      <Panel
        step={3}
        title="Insumos"
        description={
          useSupplies
            ? "Lista de materiales por cada unidad que vendes."
            : "Opcional · costos de materia prima"
        }
        icon={FlaskConical}
      >
        <ProductSuppliesEditor
          enabled={useSupplies}
          onEnabledChange={setUseSupplies}
          rows={supplyRows}
          onRowsChange={setSupplyRows}
          disabled={pending}
        />
      </Panel>

      <Panel
        step={4}
        title="Etiquetas"
        description={
          selectedCount > 0
            ? `${selectedCount} seleccionada${selectedCount === 1 ? "" : "s"} · opcional`
            : "Opcional · clic en un valor para marcarlo"
        }
        icon={Tag}
      >
        <TagCatalogManager
          catalog={catalog}
          selected={selected}
          onToggleOption={toggleOption}
          onOptionRemoved={removeOptionFromSelection}
          onGroupRemoved={removeGroupFromSelection}
          disabled={pending}
        />
      </Panel>

      {error && <Notice>{error}</Notice>}

      <div className="sticky bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+0.75rem)] z-20 lg:static">
        <div className="card flex flex-col gap-2 p-3 shadow-[var(--shadow-hover)] sm:flex-row sm:items-center sm:justify-between lg:shadow-none">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Crear producto"}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => router.push("/productos")}>
              Cancelar
            </Button>
          </div>
          {mode === "edit" && productId && initial && (
            <DeleteProductButton id={productId} name={name || initial.name} />
          )}
        </div>
      </div>
    </form>
  );
}
