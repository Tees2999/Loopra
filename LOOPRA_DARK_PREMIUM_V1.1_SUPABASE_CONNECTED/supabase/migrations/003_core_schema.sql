
-- LOOPRA v0.3 — Core database
-- Run after 001_* and 002_auth_profile.sql.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  company_name text not null default '',
  phone text not null default '',
  role text not null default 'owner' check (role in ('owner','admin','manager','agent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,
  name text not null,
  variant text not null default '',
  color text not null default '',
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, sku)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null default '',
  city text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null,
  client_id uuid references public.clients(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','confirmed','processing','shipped','delivered','refused','returned','cancelled')),
  channel text not null default 'instagram',
  city text not null default '',
  address text not null default '',
  phone text not null default '',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  comment text not null default '',
  ozon_id text not null default '',
  ozon_tracking text not null default '',
  ozon_status text not null default '',
  ozon_sync_status text not null default 'pending',
  ozon_delivery_cost numeric(12,2) not null default 0,
  ozon_return_cost numeric(12,2) not null default 0,
  ozon_refusal_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, reference)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null default '',
  product_name text not null,
  variant text not null default '',
  color text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  category text not null default 'other',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  expense_date date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ozon_cities (
  id text primary key,
  name text not null,
  raw_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists products_user_idx on public.products(user_id);
create index if not exists clients_user_idx on public.clients(user_id);
create index if not exists orders_user_status_idx on public.orders(user_id, status);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists expenses_user_date_idx on public.expenses(user_id, expense_date desc);
create index if not exists audit_user_created_idx on public.audit_logs(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;
alter table public.ozon_cities enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles own" on public.profiles;
create policy "profiles own" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "products own" on public.products;
create policy "products own" on public.products for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "clients own" on public.clients;
create policy "clients own" on public.clients for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "orders own" on public.orders;
create policy "orders own" on public.orders for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "order items through orders" on public.order_items;
create policy "order items through orders" on public.order_items
for all
using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()))
with check (exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()));

drop policy if exists "expenses own" on public.expenses;
create policy "expenses own" on public.expenses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ozon cities read" on public.ozon_cities;
create policy "ozon cities read" on public.ozon_cities for select using (auth.role() = 'authenticated');

drop policy if exists "audit own" on public.audit_logs;
create policy "audit own" on public.audit_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Keep updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute procedure public.set_updated_at();

drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients for each row execute procedure public.set_updated_at();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();
