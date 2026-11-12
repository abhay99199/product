create extension if not exists pgcrypto;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug) values
  ('Electronics', 'electronics'),
  ('Home & Kitchen', 'home-kitchen'),
  ('Fashion', 'fashion'),
  ('Beauty & Personal Care', 'beauty-personal-care'),
  ('Automotive', 'automotive'),
  ('Gadgets', 'gadgets'),
  ('Accessories', 'accessories'),
  ('Fitness', 'fitness'),
  ('Trending Finds', 'trending-finds');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 180),
  description text not null check (length(trim(description)) between 1 and 10000),
  image_url text,
  product_url text not null check (product_url ~* '^https?://'),
  price numeric(12, 2) check (price is null or price >= 0),
  category_id uuid references public.categories (id) on delete set null,
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('published', 'draft')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.click_analytics (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  clicked_at timestamptz not null default now()
);

create index products_public_catalog_idx on public.products (status, created_at desc);
create index products_featured_idx on public.products (is_featured, status);
create index products_category_idx on public.products (category_id);
create index click_analytics_product_idx on public.click_analytics (product_id, clicked_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.categories;

alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.click_analytics enable row level security;

create policy "Admins can read their own membership"
on public.admins for select to authenticated
using (user_id = (select auth.uid()));

create policy "Categories are visible to everyone"
on public.categories for select to anon, authenticated using (true);
create policy "Admins manage categories"
on public.categories for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Published products are public; admins can read all"
on public.products for select to anon, authenticated
using (status = 'published' or (select public.is_admin()));
create policy "Admins insert products"
on public.products for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins update products"
on public.products for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "Admins delete products"
on public.products for delete to authenticated
using ((select public.is_admin()));

create policy "Public may record clicks for published products"
on public.click_analytics for insert to anon, authenticated
with check (
  exists (
    select 1 from public.products
    where products.id = product_id and products.status = 'published'
  )
);
create policy "Admins can review click analytics"
on public.click_analytics for select to authenticated
using ((select public.is_admin()));

create or replace function public.get_product_click_counts()
returns table (product_id uuid, click_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, count(c.id)
  from public.products p
  left join public.click_analytics c on c.product_id = p.id
  where p.status = 'published'
  group by p.id;
$$;

revoke all on function public.get_product_click_counts() from public;
grant execute on function public.get_product_click_counts() to anon, authenticated;

grant select on public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, select on public.click_analytics to anon, authenticated;
grant select on public.admins to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Product images are publicly readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');
create policy "Admins upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "Admins update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()))
with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "Admins delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()));