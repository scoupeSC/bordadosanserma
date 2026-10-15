-- Archivar etiquetas usadas en ventas (no borrar filas referenciadas por sale_item_options)

alter table public.attribute_groups
  add column if not exists is_active boolean not null default true;

alter table public.attribute_options
  add column if not exists is_active boolean not null default true;

create index if not exists idx_attribute_groups_active
  on public.attribute_groups (display_order)
  where is_active = true;

create index if not exists idx_attribute_options_active
  on public.attribute_options (group_id, display_order)
  where is_active = true;
