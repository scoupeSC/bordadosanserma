-- Categorías de etiquetas propias de un producto (no compartidas con el catálogo global)

alter table public.attribute_groups
  add column if not exists product_id uuid references public.products (id) on delete cascade;

create index if not exists idx_attribute_groups_product
  on public.attribute_groups (product_id)
  where product_id is not null;
