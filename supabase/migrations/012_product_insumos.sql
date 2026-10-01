-- Insumos / materia prima por unidad de producto

alter table public.products
  add column if not exists use_supplies boolean not null default false;

create table if not exists public.product_supplies (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  quantity numeric(12, 4) not null check (quantity > 0),
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_supplies_product on public.product_supplies (product_id, sort_order);

alter table public.product_supplies enable row level security;

create policy "product_supplies_all" on public.product_supplies for all using (true) with check (true);
