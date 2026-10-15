-- Etiquetas por producto: nombres de categoría/valor propios de cada artículo

alter table public.product_attribute_options
  add column if not exists label text null;

create table if not exists public.product_attribute_group_labels (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.attribute_groups (id) on delete cascade,
  name text not null,
  primary key (product_id, group_id)
);

alter table public.attribute_options
  add column if not exists product_id uuid references public.products (id) on delete cascade;

create index if not exists idx_attribute_options_product
  on public.attribute_options (product_id)
  where product_id is not null;

-- Copiar etiqueta actual al vínculo (cada producto conserva su texto)
update public.product_attribute_options pao
set label = ao.label
from public.attribute_options ao
where pao.option_id = ao.id
  and pao.label is null;

alter table public.product_attribute_group_labels enable row level security;
drop policy if exists "product_attribute_group_labels_all" on public.product_attribute_group_labels;
create policy "product_attribute_group_labels_all" on public.product_attribute_group_labels
  for all using (true) with check (true);
grant all on public.product_attribute_group_labels to anon, authenticated, service_role;
