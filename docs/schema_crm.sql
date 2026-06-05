-- ==========================================
-- SCRIPT DE BASE DE DATOS: CRM COMERCIAL NEXOFILM
-- Instrucciones: Copiar y pegar todo este script en el SQL Editor de tu panel de Supabase y ejecutarlo.
-- ==========================================

-- 1. Habilitar la extensión de generación de UUIDs si no está habilitada
create extension if not exists "uuid-ossp";

-- 2. Crear tabla de proyectos (projects)
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  client_name varchar(255) not null,
  client_email varchar(255) not null,
  title varchar(255) not null,
  status varchar(50) default 'draft' check (status in ('draft', 'sent', 'review', 'approved', 'rejected', 'production', 'delivered')),
  access_token uuid default uuid_generate_v4() unique not null,
  
  -- Especificaciones del proyecto
  event_date date,
  event_time time,
  location text,
  coverage_types text[], -- Ej: ['foto', 'video', 'streaming']
  coverage_hours integer,
  guests_count integer,
  currency varchar(10) default 'USD',
  crew_count integer default 1,
  
  -- Integración de Google Drive
  drive_folder_id varchar(255),
  
  -- Datos de facturación post-aprobación
  bank_details text,
  invoice_url text,
  invoice_type varchar(50) check (invoice_type in ('total', 'deposit_50', 'custom')),
  invoice_amount numeric(12, 2),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Crear tabla de presupuestos (budgets)
create table if not exists public.budgets (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  version integer default 1 not null,
  items jsonb not null, -- Array de ítems [{ description: text, quantity: int, unit_price: numeric }]
  total_price numeric(12, 2) not null,
  payment_terms text,
  client_feedback text,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Crear bucket para almacenar facturas en PDF (Supabase Storage)
-- Nota: La creación física del bucket se debe hacer desde el menú 'Storage' en la UI de Supabase, 
-- creá un bucket público llamado 'invoices'.

-- 5. Habilitar la seguridad a nivel de fila (Row Level Security - RLS)
alter table public.projects enable row level security;
alter table public.budgets enable row level security;

-- Limpiar políticas existentes por si se vuelve a correr el script
drop policy if exists "Admins have full access to projects" on public.projects;
drop policy if exists "Admins have full access to budgets" on public.budgets;
drop policy if exists "Clients can select their project with token" on public.projects;
drop policy if exists "Clients can update specifications of their project with token" on public.projects;
drop policy if exists "Clients can select budgets for their project with token" on public.budgets;
drop policy if exists "Clients can update budgets with feedback/approvals" on public.budgets;

-- 6. Crear políticas de acceso para el rol 'authenticated' (Administrador en Supabase)
create policy "Admins have full access to projects"
  on public.projects for all to authenticated using (true);

create policy "Admins have full access to budgets"
  on public.budgets for all to authenticated using (true);

-- 7. Crear políticas de acceso para usuarios anónimos ('anon') basadas en access_token pasado por headers
-- El header personalizado usado será: 'x-client-token'
create policy "Clients can select their project with token"
  on public.projects for select to anon
  using (access_token::text = current_setting('request.headers', true)::json->>'x-client-token');

create policy "Clients can update specifications of their project with token"
  on public.projects for update to anon
  using (access_token::text = current_setting('request.headers', true)::json->>'x-client-token');

create policy "Clients can select budgets for their project with token"
  on public.budgets for select to anon
  using (
    project_id in (
      select id from public.projects 
      where access_token::text = current_setting('request.headers', true)::json->>'x-client-token'
    )
  );

create policy "Clients can update budgets with feedback/approvals"
  on public.budgets for update to anon
  using (
    project_id in (
      select id from public.projects 
      where access_token::text = current_setting('request.headers', true)::json->>'x-client-token'
    )
  );

-- 8. Automatizar la actualización del campo 'updated_at' al modificar registros
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_project_update on public.projects;
create trigger on_project_update
  before update on public.projects
  for each row execute function public.handle_updated_at();

drop trigger if exists on_budget_update on public.budgets;
create trigger on_budget_update
  before update on public.budgets
  for each row execute function public.handle_updated_at();
