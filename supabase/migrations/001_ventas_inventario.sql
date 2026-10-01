-- HADER: ventas e inventario (esquema inicial)

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id) on delete set null,
  customer_name text,
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity integer not null check (quantity > 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_active on public.products (is_active);
create index if not exists idx_sales_created_at on public.sales (created_at desc);
create index if not exists idx_sale_items_sale on public.sale_items (sale_id);
create index if not exists idx_inventory_product on public.inventory_movements (product_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- Registrar venta y descontar stock (transacción atómica)
create or replace function public.register_sale(
  p_items jsonb,
  p_customer_name text default null,
  p_customer_id uuid default null,
  p_discount numeric default 0,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_subtotal numeric(12, 2) := 0;
  v_total numeric(12, 2);
  item record;
  v_product public.products%rowtype;
  v_line_total numeric(12, 2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe incluir al menos un producto';
  end if;

  if coalesce(p_discount, 0) < 0 then
    raise exception 'El descuento no puede ser negativo';
  end if;

  insert into public.sales (customer_id, customer_name, status, notes)
  values (p_customer_id, p_customer_name, 'completed', p_notes)
  returning id into v_sale_id;

  for item in
    select
      (elem->>'product_id')::uuid as product_id,
      (elem->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as elem
  loop
    if item.quantity is null or item.quantity <= 0 then
      raise exception 'Cantidad inválida para producto %', item.product_id;
    end if;

    select * into v_product
    from public.products
    where id = item.product_id and is_active = true
    for update;

    if not found then
      raise exception 'Producto no encontrado o inactivo: %', item.product_id;
    end if;

    if v_product.stock < item.quantity then
      raise exception 'Stock insuficiente para % (disponible: %)', v_product.name, v_product.stock;
    end if;

    v_line_total := round(v_product.unit_price * item.quantity, 2);

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
    values (v_sale_id, v_product.id, item.quantity, v_product.unit_price, v_line_total);

    update public.products
    set stock = stock - item.quantity
    where id = v_product.id;

    insert into public.inventory_movements (
      product_id, movement_type, quantity, reference_type, reference_id, notes
    )
    values (
      v_product.id, 'out', item.quantity, 'sale', v_sale_id, 'Salida por venta'
    );

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0);

  update public.sales
  set subtotal = v_subtotal, discount = coalesce(p_discount, 0), total = v_total
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_notes text default null
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  if p_movement_type not in ('in', 'out', 'adjustment') then
    raise exception 'Tipo de movimiento inválido';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  if p_movement_type = 'in' then
    update public.products set stock = stock + p_quantity where id = p_product_id;
  elsif p_movement_type = 'out' then
    if v_product.stock < p_quantity then
      raise exception 'Stock insuficiente';
    end if;
    update public.products set stock = stock - p_quantity where id = p_product_id;
  else
    update public.products set stock = p_quantity where id = p_product_id;
  end if;

  insert into public.inventory_movements (product_id, movement_type, quantity, notes)
  values (p_product_id, p_movement_type, p_quantity, p_notes);

  select * into v_product from public.products where id = p_product_id;
  return v_product;
end;
$$;

grant execute on function public.register_sale(jsonb, text, uuid, numeric, text) to anon, authenticated, service_role;
grant execute on function public.adjust_stock(uuid, text, integer, text) to anon, authenticated, service_role;

alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.inventory_movements enable row level security;

create policy "products_all" on public.products for all using (true) with check (true);
create policy "customers_all" on public.customers for all using (true) with check (true);
create policy "sales_all" on public.sales for all using (true) with check (true);
create policy "sale_items_all" on public.sale_items for all using (true) with check (true);
create policy "inventory_all" on public.inventory_movements for all using (true) with check (true);

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

insert into public.products (sku, name, description, unit_price, stock, min_stock)
values
  ('SKU-001', 'Camiseta básica', 'Algodón talla M', 25000, 50, 5),
  ('SKU-002', 'Jean clásico', 'Talla 32', 89000, 20, 3),
  ('SKU-003', 'Gorra deportiva', 'Ajustable', 35000, 15, 2)
on conflict (sku) do nothing;
