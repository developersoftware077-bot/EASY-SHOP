create extension if not exists pgcrypto;
create type public.app_role as enum ('admin','user');
create type public.order_status as enum ('new','confirmed','delivered','cancelled');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, created_at timestamptz not null default now());
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role public.app_role not null default 'user', unique(user_id,role));
create function public.has_role(_user_id uuid,_role public.app_role) returns boolean language sql stable security definer set search_path=public as $$ select _user_id=auth.uid() and exists(select 1 from public.user_roles where user_id=_user_id and role=_role); $$;
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, name_sw text, slug text not null unique, description text, description_sw text, image_url text, sort_order int not null default 0, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.products (id uuid primary key default gen_random_uuid(), category_id uuid references public.categories(id) on delete set null, name text not null, slug text not null unique, price numeric(12,2) not null check(price>=0), compare_at_price numeric(12,2) check(compare_at_price is null or compare_at_price>=0), stock_quantity int not null default 0 check(stock_quantity>=0), sku text unique, short_description text not null default '', description text not null default '', featured boolean not null default false, active boolean not null default false, seo_title text, seo_description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, image_url text not null, alt_text text, sort_order int not null default 0, is_primary boolean not null default false, created_at timestamptz not null default now());
create table public.orders (id uuid primary key default gen_random_uuid(), reference text not null unique, customer_name text not null, customer_phone text not null, location_note text, total numeric(12,2) not null check(total>=0), status public.order_status not null default 'new', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, product_id uuid references public.products(id) on delete set null, product_name text not null, quantity int not null check(quantity>0), unit_price numeric(12,2) not null check(unit_price>=0));
create table public.settings (key text primary key, value jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
insert into public.settings(key,value) values ('store', '{"name":"EASY SHOP","whatsapp":"255634283550","instagram":"sufian_tech","currency":"TZS","hero_en":"Good finds. Better everyday.","hero_sw":"Chagua vizuri. Furahia zaidi.","sub_en":"Quality picks across everyday essentials. Order on WhatsApp and get fast delivery.","sub_sw":"Bidhaa bora, oda rahisi kupitia WhatsApp na usafirishaji wa haraka.","contact_phone":"+255 634 283 550","contact_email":"","footer_en":"Everyday essentials, thoughtfully selected.","footer_sw":"Bidhaa za kila siku zilizochaguliwa kwa umakini."}') on conflict do nothing;
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
do $$ declare t text; begin foreach t in array array['categories','products','orders','settings'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t); end loop; end $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin perform pg_advisory_xact_lock(48290117); insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')); insert into public.user_roles(user_id,role) values(new.id,case when not exists(select 1 from public.user_roles where role='admin') then 'admin'::public.app_role else 'user'::public.app_role end); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create index products_category_idx on public.products(category_id); create index products_active_created_idx on public.products(active,created_at desc); create index orders_status_created_idx on public.orders(status,created_at desc); create index order_items_order_idx on public.order_items(order_id);
alter table public.profiles enable row level security; alter table public.user_roles enable row level security; alter table public.categories enable row level security; alter table public.products enable row level security; alter table public.product_images enable row level security; alter table public.orders enable row level security; alter table public.order_items enable row level security; alter table public.settings enable row level security;
create policy "Users read own profile or admins" on public.profiles for select to authenticated using(id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Admins manage profiles" on public.profiles for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
create policy "Users read own role or admins" on public.user_roles for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
create policy "Public reads active categories" on public.categories for select to anon,authenticated using(active or public.has_role(auth.uid(),'admin'));
create policy "Admins manage categories" on public.categories for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
create policy "Public reads active products" on public.products for select to anon,authenticated using(active or public.has_role(auth.uid(),'admin'));
create policy "Admins manage products" on public.products for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
create policy "Public reads images of active products" on public.product_images for select to anon,authenticated using(exists(select 1 from public.products p where p.id=product_id and (p.active or public.has_role(auth.uid(),'admin'))));
create policy "Admins manage product images" on public.product_images for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
create policy "Admins manage orders" on public.orders for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
create policy "Admins manage order items" on public.order_items for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
create policy "Public reads settings" on public.settings for select to anon,authenticated using(key='store' or public.has_role(auth.uid(),'admin'));
create policy "Admins manage settings" on public.settings for all to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
insert into storage.buckets(id,name,public) values('product-images','product-images',true) on conflict(id) do nothing;
create policy "Public reads product images" on storage.objects for select to anon,authenticated using(bucket_id='product-images');
create policy "Admins upload product images" on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.has_role(auth.uid(),'admin'));
create policy "Admins update product images" on storage.objects for update to authenticated using(bucket_id='product-images' and public.has_role(auth.uid(),'admin')) with check(bucket_id='product-images' and public.has_role(auth.uid(),'admin'));
create policy "Admins delete product images" on storage.objects for delete to authenticated using(bucket_id='product-images' and public.has_role(auth.uid(),'admin'));

revoke all on public.orders,public.order_items from anon,authenticated;
grant select on public.categories,public.products,public.product_images,public.settings to anon,authenticated;
grant all on public.categories,public.products,public.product_images,public.settings to authenticated;
grant select on public.profiles,public.user_roles to authenticated;
grant all on public.profiles,public.user_roles to authenticated;
grant select,insert,update,delete on public.orders,public.order_items to authenticated;
revoke all on function public.has_role(uuid,public.app_role) from public;
grant execute on function public.has_role(uuid,public.app_role) to anon,authenticated;

create function public.place_public_order(
  p_customer_name text,
  p_customer_phone text,
  p_location_note text,
  p_reference text,
  p_items jsonb
) returns table(order_id uuid, order_reference text, order_total numeric, item_snapshot jsonb)
language plpgsql security definer set search_path=public as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_name text := btrim(coalesce(p_customer_name,''));
  v_phone text := btrim(coalesce(p_customer_phone,''));
  v_note text := btrim(coalesce(p_location_note,''));
  v_reference text := btrim(coalesce(p_reference,''));
  v_item record;
  v_product public.products%rowtype;
  v_total numeric(12,2) := 0;
  v_snapshot jsonb := '[]'::jsonb;
begin
  if length(v_name) < 2 or length(v_name) > 100 then raise exception 'Enter a name between 2 and 100 characters'; end if;
  if length(v_phone) < 7 or length(v_phone) > 25 then raise exception 'Enter a valid phone number'; end if;
  if length(v_note) > 500 then raise exception 'Location or note is too long'; end if;
  if length(v_reference) < 8 or length(v_reference) > 40 then raise exception 'Invalid order reference'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then raise exception 'Invalid order items'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_phone,0));
  if exists(select 1 from public.orders where customer_phone=v_phone and created_at>now()-interval '10 minutes' and status='new' group by customer_phone having count(*)>=4) then raise exception 'Please wait before placing another order'; end if;

  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as i(product_id uuid, quantity integer)
    group by product_id
  loop
    if v_item.quantity < 1 or v_item.quantity > 100 then raise exception 'Invalid product quantity'; end if;
    select * into v_product from public.products where id=v_item.product_id for update;
    if not found or not v_product.active then raise exception 'A product is no longer available'; end if;
    if v_product.stock_quantity < v_item.quantity then raise exception 'Not enough stock for %',v_product.name; end if;
    v_total := v_total + v_product.price*v_item.quantity;
  end loop;

  insert into public.orders(id,reference,customer_name,customer_phone,location_note,total,status)
  values(v_order_id,v_reference,v_name,v_phone,nullif(v_note,''),v_total,'new');

  for v_item in
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as i(product_id uuid, quantity integer)
    group by product_id
  loop
    select * into v_product from public.products where id=v_item.product_id;
    update public.products set stock_quantity=stock_quantity-v_item.quantity where id=v_item.product_id;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price)
    values(v_order_id,v_product.id,v_product.name,v_item.quantity,v_product.price);
    v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object('name',v_product.name,'quantity',v_item.quantity,'unit_price',v_product.price));
  end loop;
  return query select v_order_id,v_reference,v_total,v_snapshot;
end;
$$;
revoke all on function public.place_public_order(text,text,text,text,jsonb) from public;
grant execute on function public.place_public_order(text,text,text,text,jsonb) to anon,authenticated;
