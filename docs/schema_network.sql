-- ================================================================
-- TABLA Y POLÍTICAS: NEXOFILM NETWORK (CANDIDATOS & FREELANCERS)
-- Ejecutar este script en el SQL Editor del panel de Supabase
-- ================================================================

-- 1. Crear tabla de candidatos de NexoFilm Network
CREATE TABLE IF NOT EXISTS public.network_candidates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Bloque 1: Datos Personales y Contacto
    full_name VARCHAR(255) NOT NULL,
    artistic_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Argentina' NOT NULL,
    birth_year INTEGER,

    -- Bloque 2: Roles y Especialidades
    roles TEXT[] NOT NULL DEFAULT '{}',
    primary_role VARCHAR(100) NOT NULL,

    -- Bloque 3: Experiencia y Proyectos
    years_experience VARCHAR(50),
    project_types TEXT[] NOT NULL DEFAULT '{}',
    notable_clients TEXT,

    -- Bloque 4: Equipamiento y Software
    camera_gear TEXT,
    drone_gear VARCHAR(100),
    software_tools TEXT[] NOT NULL DEFAULT '{}',
    ai_tools TEXT[] NOT NULL DEFAULT '{}',

    -- Bloque 5: Portfolios y Muestras
    portfolio_url TEXT,
    instagram_url TEXT,
    vimeo_youtube_url TEXT,
    behance_url TEXT,
    reel_url TEXT,
    best_link_type VARCHAR(50),
    best_project_url TEXT,

    -- Bloque 6: CV, Modalidad y Facturación
    cv_url TEXT,
    cv_filename TEXT,
    modalities TEXT[] NOT NULL DEFAULT '{}',
    invoicing_status VARCHAR(100),
    willing_to_travel VARCHAR(50),
    bio_notes TEXT,

    -- Análisis y Scoring por Groq IA
    ai_overall_score INTEGER DEFAULT 0,
    ai_profile_score INTEGER DEFAULT 0,
    ai_experience_score INTEGER DEFAULT 0,
    ai_technical_score INTEGER DEFAULT 0,
    ai_executive_summary TEXT,
    ai_inconsistencies TEXT[] DEFAULT '{}',
    ai_extracted_tags TEXT[] DEFAULT '{}',
    ai_raw_analysis JSONB DEFAULT '{}'::jsonb,

    -- Gestión Administrativa en CRM
    status VARCHAR(50) DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'revisado', 'aprobado', 'frecuente', 'descartado', 'inactivo')),
    internal_notes TEXT,
    is_promoted_to_crew BOOLEAN DEFAULT FALSE,
    promoted_crew_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL
);

-- 2. Índices para búsqueda veloz en CRM
CREATE INDEX IF NOT EXISTS idx_network_candidates_primary_role ON public.network_candidates(primary_role);
CREATE INDEX IF NOT EXISTS idx_network_candidates_city ON public.network_candidates(city);
CREATE INDEX IF NOT EXISTS idx_network_candidates_status ON public.network_candidates(status);
CREATE INDEX IF NOT EXISTS idx_network_candidates_ai_score ON public.network_candidates(ai_overall_score DESC);

-- 3. Trigger para updated_at automático
DROP TRIGGER IF EXISTS on_network_candidates_update ON public.network_candidates;
CREATE TRIGGER on_network_candidates_update
    BEFORE UPDATE ON public.network_candidates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Habilitar RLS
ALTER TABLE public.network_candidates ENABLE ROW LEVEL SECURITY;

-- Políticas:
-- Permitir inserción anónima desde la web pública (solo INSERT)
DROP POLICY IF EXISTS "Permitir insercion publica de postulaciones" ON public.network_candidates;
CREATE POLICY "Permitir insercion publica de postulaciones"
    ON public.network_candidates FOR INSERT TO anon
    WITH CHECK (true);

-- Permitir acceso total a usuarios autenticados / servicio backend
DROP POLICY IF EXISTS "Acceso total a postulaciones para administradores" ON public.network_candidates;
CREATE POLICY "Acceso total a postulaciones para administradores"
    ON public.network_candidates FOR ALL TO authenticated
    USING (true);

-- 5. Bucket de almacenamiento para CVs (Supabase Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('network-cvs', 'network-cvs', true)
ON CONFLICT (id) DO NOTHING;
