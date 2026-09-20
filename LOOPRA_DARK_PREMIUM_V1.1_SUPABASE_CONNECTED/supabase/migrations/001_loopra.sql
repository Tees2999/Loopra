create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin','manager','agent')),
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  variant text,
  color text,
  purchase_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock integer not null default 0,
  low_stock_threshold integer not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  city text,
  address text,
  whatsapp text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  client_id uuid references clients(id),
  order_date timestamptz not null default now(),
  channel text default 'Instagram',
  status text not null default 'Confirmée',
  payment_method text default 'COD',
  subtotal numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  comment text,
  ozon_id text,
  ozon_tracking text,
  ozon_status text,
  ozon_sync text,
  ozon_delivery_cost numeric(12,2) default 0,
  ozon_return_cost numeric(12,2) default 0,
  ozon_refusal_cost numeric(12,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  purchase_price numeric(12,2) not null default 0,
  variant text,
  color text
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text,
  amount numeric(12,2) not null,
  expense_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  action text not null,
  entity text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_ozon_tracking_idx on orders(ozon_tracking);
create index if not exists products_sku_idx on products(sku);
create index if not exists clients_phone_idx on clients(phone);

alter table profiles enable row level security;
alter table products enable row level security;
alter table clients enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table expenses enable row level security;
alter table audit_logs enable row level security;

create policy "authenticated users access products" on products for all to authenticated using (true) with check (true);
create policy "authenticated users access clients" on clients for all to authenticated using (true) with check (true);
create policy "authenticated users access orders" on orders for all to authenticated using (true) with check (true);
create policy "authenticated users access order items" on order_items for all to authenticated using (true) with check (true);
create policy "authenticated users access expenses" on expenses for all to authenticated using (true) with check (true);
create policy "authenticated users read own profile" on profiles for select to authenticated using (id = auth.uid());
create policy "authenticated users access audit" on audit_logs for select to authenticated using (true);
