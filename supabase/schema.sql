-- ============================================================
-- Revela · Esquema de base de datos
-- Copia y pega TODO este archivo en Supabase > SQL Editor > New query > Run
-- ============================================================

-- Tabla principal de pedidos
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  full_name text not null,
  email text not null,
  whatsapp text not null,

  occasion text not null,
  accent text not null,
  background text not null,
  custom_background_url text,
  font text not null,
  main_text text not null,
  closing_text text not null,
  special_date date,
  youtube_url text,
  youtube_start int default 0,
  song_url text,
  photos jsonb not null default '[]'::jsonb, -- [{ url, caption }]
  video_url text,

  price numeric not null,
  status text not null default 'PENDIENTE',          -- PENDIENTE | COMPLETADO | RECHAZADO
  payment_status text not null default 'PENDIENTE',  -- PENDIENTE | APROBADO | RECHAZADO

  created_at timestamptz not null default now()
);

-- Habilitar seguridad a nivel de fila
alter table public.orders enable row level security;

-- Cualquiera puede INSERTAR un pedido (es el formulario público de creación)
drop policy if exists "Cualquiera puede crear pedidos" on public.orders;
create policy "Cualquiera puede crear pedidos"
  on public.orders for insert
  to anon
  with check (true);

-- Cualquiera puede LEER un pedido, pero solo si ya fue aprobado
-- (esto es lo que permite que /m/:code funcione públicamente sin exponer pedidos pendientes)
drop policy if exists "Leer solo pedidos aprobados" on public.orders;
create policy "Leer solo pedidos aprobados"
  on public.orders for select
  to anon
  using (payment_status = 'APROBADO');

-- Los usuarios autenticados (tú, el admin) pueden leer y actualizar TODO
drop policy if exists "Admin lee todo" on public.orders;
create policy "Admin lee todo"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "Admin actualiza todo" on public.orders;
create policy "Admin actualiza todo"
  on public.orders for update
  to authenticated
  using (true);

-- ============================================================
-- Storage: bucket público para fotos/videos/canciones/fondos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('capsule-media', 'capsule-media', true)
on conflict (id) do nothing;

drop policy if exists "Cualquiera puede subir archivos" on storage.objects;
create policy "Cualquiera puede subir archivos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'capsule-media');

drop policy if exists "Cualquiera puede ver archivos" on storage.objects;
create policy "Cualquiera puede ver archivos"
  on storage.objects for select
  to anon
  using (bucket_id = 'capsule-media');
