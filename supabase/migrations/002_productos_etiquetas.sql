-- Productos con etiquetas dinámicas (grupos + opciones)

alter table public.products
  alter column sku drop not null,
  alter column stock set default 0;

-- Precio de venta principal (alias claro para la app)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'price'
  ) then
    alter table public.products add column price numeric(12, 2)
      generated always as (unit_price) stored;
  end if;
end $$;

create table if not exists public.attribute_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.attribute_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.attribute_groups (id) on delete cascade,
  label text not null,
  slug text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, slug)
);

create table if not exists public.product_attribute_options (
  product_id uuid not null references public.products (id) on delete cascade,
  option_id uuid not null references public.attribute_options (id) on delete cascade,
  primary key (product_id, option_id)
);

create index if not exists idx_attribute_options_group on public.attribute_options (group_id, display_order);
create index if not exists idx_product_attribute_product on public.product_attribute_options (product_id);

alter table public.attribute_groups enable row level security;
alter table public.attribute_options enable row level security;
alter table public.product_attribute_options enable row level security;

drop policy if exists "attribute_groups_all" on public.attribute_groups;
create policy "attribute_groups_all" on public.attribute_groups for all using (true) with check (true);

drop policy if exists "attribute_options_all" on public.attribute_options;
create policy "attribute_options_all" on public.attribute_options for all using (true) with check (true);

drop policy if exists "product_attribute_options_all" on public.product_attribute_options;
create policy "product_attribute_options_all" on public.product_attribute_options for all using (true) with check (true);

grant all on public.attribute_groups to anon, authenticated, service_role;
grant all on public.attribute_options to anon, authenticated, service_role;
grant all on public.product_attribute_options to anon, authenticated, service_role;

insert into public.attribute_groups (name, slug, display_order)
values
  ('Color', 'color', 1),
  ('Talla', 'talla', 2),
  ('Género', 'genero', 3)
on conflict (slug) do nothing;

insert into public.attribute_options (group_id, label, slug, display_order)
select g.id, v.label, v.slug, v.ord
from public.attribute_groups g
cross join (
  values
    ('color', 'Negro', 'negro', 1),
    ('color', 'Blanco', 'blanco', 2),
    ('color', 'Azul', 'azul', 3),
    ('talla', 'S', 's', 1),
    ('talla', 'M', 'm', 2),
    ('talla', 'L', 'l', 3),
    ('talla', 'XL', 'xl', 4),
    ('genero', 'Hombre', 'hombre', 1),
    ('genero', 'Mujer', 'mujer', 2),
    ('genero', 'Unisex', 'unisex', 3)
) as v(group_slug, label, slug, ord)
where g.slug = v.group_slug
on conflict (group_id, slug) do nothing;
