-- Ocultar categorías globales (ej. Gramaje) en un producto concreto sin borrar el catálogo

create table if not exists public.product_tag_group_exclusions (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.attribute_groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, group_id)
);

alter table public.product_tag_group_exclusions enable row level security;
drop policy if exists "product_tag_group_exclusions_all" on public.product_tag_group_exclusions;
create policy "product_tag_group_exclusions_all" on public.product_tag_group_exclusions
  for all using (true) with check (true);
grant all on public.product_tag_group_exclusions to anon, authenticated, service_role;

create table if not exists public.product_tag_group_visibility (
  product_id uuid not null references public.products (id) on delete cascade,
  group_id uuid not null references public.attribute_groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, group_id)
);

alter table public.product_tag_group_visibility enable row level security;
drop policy if exists "product_tag_group_visibility_all" on public.product_tag_group_visibility;
create policy "product_tag_group_visibility_all" on public.product_tag_group_visibility
  for all using (true) with check (true);
grant all on public.product_tag_group_visibility to anon, authenticated, service_role;
