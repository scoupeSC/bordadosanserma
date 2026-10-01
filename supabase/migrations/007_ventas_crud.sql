-- Editar y anular ventas (reemplazo completo de ítems)

create or replace function public.cancel_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sales
  set status = 'cancelled'
  where id = p_sale_id and status = 'completed';

  if not found then
    raise exception 'Venta no encontrada o ya anulada';
  end if;
end;
$$;

grant execute on function public.cancel_sale(uuid) to anon, authenticated, service_role;

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
  opt_id uuid;
  v_product public.products%rowtype;
  v_line_total numeric(12, 2);
  v_sale_item_id uuid;
  v_required_groups integer;
  v_selected_groups integer;
  v_product_has_tags boolean;
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

    select exists (
      select 1 from public.product_attribute_options where product_id = item.product_id
    ) into v_product_has_tags;

    if v_product_has_tags then
      select count(distinct ao.group_id) into v_required_groups
      from public.product_attribute_options pao
      join public.attribute_options ao on ao.id = pao.option_id
      where pao.product_id = item.product_id;

      select count(distinct ao.group_id) into v_selected_groups
      from jsonb_array_elements_text(item.option_ids) as oid(opt)
      join public.attribute_options ao on ao.id = oid.opt::uuid
      join public.product_attribute_options pao
        on pao.option_id = ao.id and pao.product_id = item.product_id;

      if v_selected_groups is null or v_selected_groups < v_required_groups then
        raise exception 'Selecciona todas las categorías del producto (ej. color y talla)';
      end if;

      for opt_id in select jsonb_array_elements_text(item.option_ids)::uuid
      loop
        if not exists (
          select 1 from public.product_attribute_options
          where product_id = item.product_id and option_id = opt_id
        ) then
          raise exception 'Variante inválida para el producto';
        end if;
      end loop;
    else
      select count(*)::integer into v_required_groups
      from public.attribute_groups g
      where exists (
        select 1 from public.attribute_options ao where ao.group_id = g.id
      );

      if v_required_groups > 0 then
        select count(distinct ao.group_id) into v_selected_groups
        from jsonb_array_elements_text(item.option_ids) as oid(opt)
        join public.attribute_options ao on ao.id = oid.opt::uuid;

        if v_selected_groups is null or v_selected_groups < v_required_groups then
          raise exception 'Selecciona todas las categorías (ej. color y talla)';
        end if;
      end if;

      for opt_id in select jsonb_array_elements_text(item.option_ids)::uuid
      loop
        if not exists (select 1 from public.attribute_options where id = opt_id) then
          raise exception 'Opción de variante inválida';
        end if;
      end loop;
    end if;

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
