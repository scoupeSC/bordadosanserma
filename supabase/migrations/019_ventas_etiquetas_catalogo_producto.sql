-- Ventas: variantes según catálogo del producto (no solo valores pre-marcados)

create or replace function public.product_sellable_group_count(p_product_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  select count(distinct g.id)::integer
  from public.attribute_groups g
  where coalesce(g.is_active, true)
    and (g.product_id is null or g.product_id = p_product_id)
    and not exists (
      select 1
      from public.product_tag_group_exclusions ex
      where ex.product_id = p_product_id and ex.group_id = g.id
    )
    and exists (
      select 1
      from public.attribute_options ao
      where ao.group_id = g.id
        and coalesce(ao.is_active, true)
        and (ao.product_id is null or ao.product_id = p_product_id)
    );
$$;

create or replace function public.product_requires_variant_pick(p_product_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.product_sellable_group_count(p_product_id) > 0;
$$;

create or replace function public.product_option_is_sellable(p_product_id uuid, p_option_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.attribute_options ao
    join public.attribute_groups g on g.id = ao.group_id
    where ao.id = p_option_id
      and coalesce(ao.is_active, true)
      and coalesce(g.is_active, true)
      and (ao.product_id is null or ao.product_id = p_product_id)
      and (g.product_id is null or g.product_id = p_product_id)
      and not exists (
        select 1
        from public.product_tag_group_exclusions ex
        where ex.product_id = p_product_id and ex.group_id = g.id
      )
  );
$$;

drop function if exists public.register_checkout(jsonb, uuid, text, text, text, numeric, date, numeric, text);

create or replace function public.register_checkout(
  p_items jsonb,
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_payment_status text default 'paid',
  p_order_status text default 'pending',
  p_amount_paid numeric default null,
  p_delivery_date date default null,
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
  v_amount_paid numeric(12, 2);
  item record;
  opt_id uuid;
  v_product public.products%rowtype;
  v_line_total numeric(12, 2);
  v_sale_item_id uuid;
  v_required_groups integer;
  v_selected_groups integer;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;

  if p_payment_status not in ('paid', 'credit', 'partial') then
    raise exception 'Estado de pago inválido';
  end if;

  if p_order_status not in ('pending', 'ready', 'delivered') then
    raise exception 'Estado de pedido inválido';
  end if;

  insert into public.sales (
    customer_id, customer_name, status, payment_status, order_status, delivery_date, notes
  )
  values (
    p_customer_id, p_customer_name, 'completed', p_payment_status, p_order_status, p_delivery_date, p_notes
  )
  returning id into v_sale_id;

  for item in
    select
      (elem->>'product_id')::uuid as product_id,
      (elem->>'quantity')::integer as quantity,
      coalesce(elem->'option_ids', '[]'::jsonb) as option_ids
    from jsonb_array_elements(p_items) as elem
  loop
    if item.quantity is null or item.quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_product from public.products where id = item.product_id and is_active = true;
    if not found then
      raise exception 'Producto no encontrado';
    end if;

    if public.product_requires_variant_pick(item.product_id) then
      v_required_groups := public.product_sellable_group_count(item.product_id);

      select count(distinct ao.group_id) into v_selected_groups
      from jsonb_array_elements_text(item.option_ids) as oid(opt)
      join public.attribute_options ao on ao.id = oid.opt::uuid
      where public.product_option_is_sellable(item.product_id, ao.id);

      if v_selected_groups is null or v_selected_groups < v_required_groups then
        raise exception 'Selecciona todas las categorías del producto (ej. color y talla)';
      end if;

      for opt_id in select jsonb_array_elements_text(item.option_ids)::uuid
      loop
        if not public.product_option_is_sellable(item.product_id, opt_id) then
          raise exception 'Variante inválida para el producto';
        end if;
      end loop;
    else
      if jsonb_array_length(item.option_ids) > 0 then
        raise exception 'Este producto no tiene etiquetas; no selecciones variantes';
      end if;
    end if;

    perform public.apply_sale_stock_out(v_product.id, item.quantity, v_sale_id, 'Venta');

    v_line_total := round(v_product.unit_price * item.quantity, 2);

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
    values (v_sale_id, v_product.id, item.quantity, v_product.unit_price, v_line_total)
    returning id into v_sale_item_id;

    for opt_id in select jsonb_array_elements_text(item.option_ids)::uuid
    loop
      insert into public.sale_item_options (sale_item_id, option_id)
      values (v_sale_item_id, opt_id)
      on conflict do nothing;
    end loop;

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0);

  if p_payment_status = 'paid' then
    v_amount_paid := v_total;
  elsif p_payment_status = 'credit' then
    v_amount_paid := 0;
  else
    v_amount_paid := coalesce(p_amount_paid, 0);
    if v_amount_paid <= 0 or v_amount_paid >= v_total then
      raise exception 'El abono debe ser mayor a 0 y menor al total';
    end if;
  end if;

  update public.sales
  set subtotal = v_subtotal, discount = coalesce(p_discount, 0), total = v_total, amount_paid = v_amount_paid
  where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.register_checkout(jsonb, uuid, text, text, text, numeric, date, numeric, text)
  to anon, authenticated, service_role;

grant execute on function public.product_sellable_group_count(uuid) to anon, authenticated, service_role;
grant execute on function public.product_requires_variant_pick(uuid) to anon, authenticated, service_role;
grant execute on function public.product_option_is_sellable(uuid, uuid) to anon, authenticated, service_role;

create or replace function public.update_sale(
  p_sale_id uuid,
  p_items jsonb,
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_payment_status text default 'paid',
  p_order_status text default 'pending',
  p_amount_paid numeric default null,
  p_delivery_date date default null,
  p_discount numeric default 0,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12, 2) := 0;
  v_total numeric(12, 2);
  v_amount_paid numeric(12, 2);
  item record;
  old_item record;
  opt_id uuid;
  v_product public.products%rowtype;
  v_line_total numeric(12, 2);
  v_sale_item_id uuid;
  v_required_groups integer;
  v_selected_groups integer;
begin
  if not exists (
    select 1 from public.sales where id = p_sale_id and status = 'completed'
  ) then
    raise exception 'Venta no encontrada';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto';
  end if;

  if p_payment_status not in ('paid', 'credit', 'partial') then
    raise exception 'Estado de pago inválido';
  end if;

  if p_order_status not in ('pending', 'ready', 'delivered') then
    raise exception 'Estado de pedido inválido';
  end if;

  for old_item in
    select si.product_id, si.quantity
    from public.sale_items si
    where si.sale_id = p_sale_id
  loop
    perform public.apply_sale_stock_in(
      old_item.product_id,
      old_item.quantity,
      p_sale_id,
      'Edición de venta (devolución)'
    );
  end loop;

  delete from public.sale_items where sale_id = p_sale_id;

  for item in
    select
      (elem->>'product_id')::uuid as product_id,
      (elem->>'quantity')::integer as quantity,
      coalesce(elem->'option_ids', '[]'::jsonb) as option_ids
    from jsonb_array_elements(p_items) as elem
  loop
    if item.quantity is null or item.quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select * into v_product from public.products where id = item.product_id;
    if not found then
      raise exception 'Producto no encontrado';
    end if;

    if public.product_requires_variant_pick(item.product_id) then
      v_required_groups := public.product_sellable_group_count(item.product_id);

      select count(distinct ao.group_id) into v_selected_groups
      from jsonb_array_elements_text(item.option_ids) as oid(opt)
      join public.attribute_options ao on ao.id = oid.opt::uuid
      where public.product_option_is_sellable(item.product_id, ao.id);

      if v_selected_groups is null or v_selected_groups < v_required_groups then
        raise exception 'Selecciona todas las categorías del producto (ej. color y talla)';
      end if;

      for opt_id in select jsonb_array_elements_text(item.option_ids)::uuid
      loop
        if not public.product_option_is_sellable(item.product_id, opt_id) then
          raise exception 'Variante inválida para el producto';
        end if;
      end loop;
    else
      if jsonb_array_length(item.option_ids) > 0 then
        raise exception 'Este producto no tiene etiquetas; no selecciones variantes';
      end if;
    end if;

    perform public.apply_sale_stock_out(v_product.id, item.quantity, p_sale_id, 'Edición de venta');

    v_line_total := round(v_product.unit_price * item.quantity, 2);

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, line_total)
    values (p_sale_id, v_product.id, item.quantity, v_product.unit_price, v_line_total)
    returning id into v_sale_item_id;

    for opt_id in select jsonb_array_elements_text(item.option_ids)::uuid
    loop
      insert into public.sale_item_options (sale_item_id, option_id)
      values (v_sale_item_id, opt_id)
      on conflict do nothing;
    end loop;

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0);

  if p_payment_status = 'paid' then
    v_amount_paid := v_total;
  elsif p_payment_status = 'credit' then
    v_amount_paid := 0;
  else
    v_amount_paid := coalesce(p_amount_paid, 0);
    if v_amount_paid <= 0 or v_amount_paid >= v_total then
      raise exception 'El abono debe ser mayor a 0 y menor al total';
    end if;
  end if;

  update public.sales
  set
    customer_id = p_customer_id,
    customer_name = p_customer_name,
    payment_status = p_payment_status,
    order_status = p_order_status,
    delivery_date = p_delivery_date,
    notes = p_notes,
    subtotal = v_subtotal,
    discount = coalesce(p_discount, 0),
    total = v_total,
    amount_paid = v_amount_paid
  where id = p_sale_id;

  return p_sale_id;
end;
$$;

grant execute on function public.update_sale(
  uuid, jsonb, uuid, text, text, text, numeric, date, numeric, text
) to anon, authenticated, service_role;
