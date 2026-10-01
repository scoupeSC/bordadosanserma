-- Ventas: pago, estado del pedido y checkout sin descontar stock (por ahora)

alter table public.sales
  add column if not exists payment_status text not null default 'paid'
    check (payment_status in ('paid', 'credit')),
  add column if not exists order_status text not null default 'pending'
    check (order_status in ('pending', 'ready', 'delivered'));

create index if not exists idx_customers_name on public.customers (name);
create index if not exists idx_products_name on public.products (name);

create or replace function public.register_checkout(
  p_items jsonb,
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_payment_status text default 'paid',
  p_order_status text default 'pending',
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
    raise exception 'Agrega al menos un producto';
  end if;

  if p_payment_status not in ('paid', 'credit') then
    raise exception 'Estado de pago inválido';
  end if;

  if p_order_status not in ('pending', 'ready', 'delivered') then
    raise exception 'Estado de pedido inválido';
  end if;

  if coalesce(p_discount, 0) < 0 then
    raise exception 'El descuento no puede ser negativo';
  end if;

  insert into public.sales (
    customer_id,
    customer_name,
    status,
    payment_status,
    order_status,
    notes
  )
  values (
    p_customer_id,
    p_customer_name,
    'completed',
    p_payment_status,
    p_order_status,
    p_notes
  )
  returning id into v_sale_id;

  for item in
    select
      (elem->>'product_id')::uuid as product_id,
      (elem->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as elem
  loop
    if item.quantity is null or item.quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_product
    from public.products
    where id = item.product_id and is_active = true;

    if not found then
      raise exception 'Producto no encontrado: %', item.product_id;
    end if;

    v_line_total := round(v_product.unit_price * item.quantity, 2);

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
    values (v_sale_id, v_product.id, item.quantity, v_product.unit_price, v_line_total);

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0);

  update public.sales
  set subtotal = v_subtotal, discount = coalesce(p_discount, 0), total = v_total
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.register_checkout(jsonb, uuid, text, text, text, numeric, text)
  to anon, authenticated, service_role;
