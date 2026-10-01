-- Abonos a ventas fiadas o con saldo pendiente

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sale_payments_sale on public.sale_payments (sale_id, created_at desc);

alter table public.sale_payments enable row level security;

drop policy if exists "sale_payments_all" on public.sale_payments;
create policy "sale_payments_all" on public.sale_payments for all using (true) with check (true);

grant all on public.sale_payments to anon, authenticated, service_role;

create or replace function public.register_sale_payment(
  p_sale_id uuid,
  p_amount numeric,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_new_paid numeric(12, 2);
  v_balance numeric(12, 2);
  v_payment_id uuid;
  v_status text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'El abono debe ser mayor a cero';
  end if;

  select * into v_sale from public.sales where id = p_sale_id and status = 'completed' for update;
  if not found then
    raise exception 'Venta no encontrada';
  end if;

  v_balance := v_sale.total - v_sale.amount_paid;
  if v_balance <= 0 then
    raise exception 'Este pedido ya está pagado por completo';
  end if;

  if p_amount > v_balance then
    raise exception 'El abono no puede ser mayor al saldo pendiente';
  end if;

  v_new_paid := v_sale.amount_paid + p_amount;

  if v_new_paid >= v_sale.total then
    v_status := 'paid';
    v_new_paid := v_sale.total;
  else
    v_status := 'partial';
  end if;

  insert into public.sale_payments (sale_id, amount, note)
  values (p_sale_id, p_amount, nullif(trim(p_note), ''))
  returning id into v_payment_id;

  update public.sales
  set amount_paid = v_new_paid, payment_status = v_status
  where id = p_sale_id;

  return v_payment_id;
end;
$$;

grant execute on function public.register_sale_payment(uuid, numeric, text)
  to anon, authenticated, service_role;
