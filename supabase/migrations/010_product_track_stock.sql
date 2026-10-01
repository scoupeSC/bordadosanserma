-- Control de stock opcional por producto

alter table public.products
  add column if not exists track_stock boolean not null default false;

create index if not exists idx_products_track_stock on public.products (track_stock)
  where track_stock = true and is_active = true;

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

  if not v_product.track_stock then
    raise exception 'Este producto no tiene control de stock activado';
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
