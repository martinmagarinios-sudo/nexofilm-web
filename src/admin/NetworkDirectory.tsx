import React, { useState, useEffect, useMemo } from 'react';
import WhatsAppSelectorModal, { getWAPreferredApp, buildWAUrl } from './WhatsAppSelectorModal';

export interface NetworkCandidate {
    id: string;
    created_at: string;
    full_name: string;
    artistic_name?: string | null;
    email: string;
    phone: string;
    city: string;
    state_province?: string | null;
    country: string;
    birth_year?: number | null;
    roles: string[];
    primary_role: string;
    years_experience?: string | null;
    project_types: string[];
    notable_clients?: string | null;
    camera_gear?: string | null;
    drone_gear?: string | null;
    software_tools: string[];
    ai_tools: string[];
    portfolio_url?: string | null;
    instagram_url?: string | null;
    vimeo_youtube_url?: string | null;
    behance_url?: string | null;
    reel_url?: string | null;
    best_link_type?: string | null;
    best_project_url?: string | null;
    cv_url?: string | null;
    cv_filename?: string | null;
    modalities: string[];
    invoicing_status?: string | null;
    willing_to_travel?: string | null;
    bio_notes?: string | null;
    ai_overall_score: number;
    ai_profile_score: number;
    ai_experience_score: number;
    ai_technical_score: number;
    ai_executive_summary?: string | null;
    ai_inconsistencies: string[];
    ai_extracted_tags: string[];
    ai_raw_analysis?: any;
    status: 'nuevo' | 'revisado' | 'aprobado' | 'frecuente' | 'descartado' | 'inactivo';
    internal_notes?: string | null;
    is_promoted_to_crew: boolean;
    promoted_crew_id?: string | null;
}

interface NetworkDirectoryProps {
    password: string;
    onCrewUpdated?: () => void;
}

const NetworkDirectory: React.FC<NetworkDirectoryProps> = ({ password, onCrewUpdated }) => {
    const [candidates, setCandidates] = useState<NetworkCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMinScore, setFilterMinScore] = useState<number>(0);

    // AI Matcher
    const [matcherQuery, setMatcherQuery] = useState('');
    const [matchingInProgress, setMatchingInProgress] = useState(false);
    const [matchedResults, setMatchedResults] = useState<{ candidate_id: string; match_percentage: number; match_reason: string }[] | null>(null);

    // Modal de detalle
    const [selectedCandidate, setSelectedCandidate] = useState<NetworkCandidate | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [actionMessage, setActionMessage] = useState('');

    // WhatsApp Modal
    const [waModalOpen, setWaModalOpen] = useState(false);
    const [waPhone, setWaPhone] = useState('');
    const [waRecipient, setWaRecipient] = useState('');
    const [waMessage, setWaMessage] = useState('');

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/network/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'listCandidates', password })
            });
            const data = await res.json();
            if (data.success) {
                setCandidates(data.candidates || []);
            }
        } catch (err) {
            console.error('Error cargando candidatos de network:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCandidates();
    }, [password]);

    const handlePromoteToCrew = async (cand: NetworkCandidate) => {
        if (!window.confirm(`¿Promover a "${cand.full_name}" a Crew Activo? Se creará su ficha en el directorio de crew para asignación a presupuestos y rodajes.`)) {
            return;
        }

        setUpdatingStatus(true);
        setActionMessage('');
        try {
            const res = await fetch('/api/network/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'promoteCandidateToCrew',
                    password,
                    candidate_id: cand.id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al promover candidato');

            setActionMessage('✅ ¡Promovido exitosamente a Crew Activo!');
            // Refrescar lista local y notificar al CRM
            await fetchCandidates();
            if (onCrewUpdated) onCrewUpdated();
            if (selectedCandidate && selectedCandidate.id === cand.id) {
                setSelectedCandidate(prev => prev ? { ...prev, is_promoted_to_crew: true, status: 'aprobado' } : null);
            }
            setTimeout(() => setActionMessage(''), 4000);
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleUpdateStatus = async (candId: string, newStatus: string, notes?: string) => {
        setUpdatingStatus(true);
        try {
            const res = await fetch('/api/network/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateCandidate',
                    password,
                    candidate_id: candId,
                    status: newStatus,
                    internal_notes: notes !== undefined ? notes : undefined
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al actualizar');

            setCandidates(prev =>
                prev.map(c => c.id === candId ? { ...c, status: newStatus as any, internal_notes: notes !== undefined ? notes : c.internal_notes } : c)
            );
            if (selectedCandidate && selectedCandidate.id === candId) {
                setSelectedCandidate(prev => prev ? { ...prev, status: newStatus as any, internal_notes: notes !== undefined ? notes : prev.internal_notes } : null);
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleRunAiMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matcherQuery.trim()) return;

        setMatchingInProgress(true);
        try {
            const res = await fetch('/api/network/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'matchProject',
                    password,
                    project_description: matcherQuery.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                setMatchedResults(data.matches || []);
            }
        } catch (err) {
            console.error('Error al ejecutar AI Match:', err);
        } finally {
            setMatchingInProgress(false);
        }
    };

    const openWhatsApp = (cand: NetworkCandidate) => {
        const text = `Hola ${cand.full_name}, te escribo desde NexoFilm. Vimos tu perfil en NexoFilm Network y queríamos consultarte por tu disponibilidad para un proyecto audiovisual.`;
        const pref = getWAPreferredApp();
        if (pref === 'ask') {
            setWaPhone(cand.phone);
            setWaRecipient(cand.full_name);
            setWaMessage(text);
            setWaModalOpen(true);
        } else {
            window.open(buildWAUrl(cand.phone, text, pref), '_blank');
        }
    };

    // KPIs
    const totalCandidates = candidates.length;
    const newCandidates = candidates.filter(c => c.status === 'nuevo').length;
    const promotedCandidates = candidates.filter(c => c.is_promoted_to_crew).length;
    const topScored = candidates.filter(c => c.ai_overall_score >= 80).length;

    // Filtrado
    const filteredCandidates = useMemo(() => {
        return candidates.filter(c => {
            if (filterStatus !== 'all' && c.status !== filterStatus) return false;
            if (filterRole !== 'all') {
                const matchesRole = c.primary_role === filterRole || (c.roles && c.roles.includes(filterRole));
                if (!matchesRole) return false;
            }
            if (filterMinScore > 0 && (c.ai_overall_score || 0) < filterMinScore) return false;

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const inName = c.full_name.toLowerCase().includes(term);
                const inCity = c.city.toLowerCase().includes(term);
                const inGear = (c.camera_gear || '').toLowerCase().includes(term);
                const inTags = (c.ai_extracted_tags || []).some(t => t.toLowerCase().includes(term));
                const inClients = (c.notable_clients || '').toLowerCase().includes(term);
                if (!inName && !inCity && !inGear && !inTags && !inClients) return false;
            }

            return true;
        });
    }, [candidates, filterStatus, filterRole, filterMinScore, searchTerm]);

    // Ordenar si hay resultados de AI match
    const displayCandidates = useMemo(() => {
        if (!matchedResults || matchedResults.length === 0) return filteredCandidates;
        const matchMap = new Map(matchedResults.map(m => [m.candidate_id, m]));
        return [...filteredCandidates].sort((a, b) => {
            const matchA = matchMap.get(a.id)?.match_percentage || 0;
            const matchB = matchMap.get(b.id)?.match_percentage || 0;
            return matchB - matchA;
        });
    }, [filteredCandidates, matchedResults]);

    return (
        <div className="space-y-6 text-white font-sans">
            
            {/* Header y KPIs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950 p-6 rounded-xl border border-white/10">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nexo-lime/10 border border-nexo-lime/20 mb-2">
                        <span className="w-2 h-2 rounded-full bg-nexo-lime animate-pulse"></span>
                        <span className="text-nexo-lime text-[10px] font-black uppercase tracking-[0.3em]">
                            NexoFilm Network
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight text-white">
                        Red de Colaboradores & Freelancers
                    </h2>
                    <p className="text-zinc-400 text-xs mt-1">
                        Base de profesionales evaluada por Groq IA con scoring automático, muestras de portfolio y exportación directa a Crew Activo.
                    </p>
                </div>

                <div className="grid grid-cols-4 gap-3 w-full md:w-auto">
                    <div className="bg-black/60 border border-white/5 rounded-lg px-4 py-2.5 text-center">
                        <div className="text-xl font-bold text-white">{totalCandidates}</div>
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Total Red</div>
                    </div>
                    <div className="bg-black/60 border border-amber-500/20 rounded-lg px-4 py-2.5 text-center">
                        <div className="text-xl font-bold text-amber-400">{newCandidates}</div>
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Nuevos</div>
                    </div>
                    <div className="bg-black/60 border border-nexo-lime/20 rounded-lg px-4 py-2.5 text-center">
                        <div className="text-xl font-bold text-nexo-lime">{promotedCandidates}</div>
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">En Crew</div>
                    </div>
                    <div className="bg-black/60 border border-emerald-500/20 rounded-lg px-4 py-2.5 text-center">
                        <div className="text-xl font-bold text-emerald-400">{topScored}</div>
                        <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Score 80+</div>
                    </div>
                </div>
            </div>

            {/* AI Project Matcher Bar */}
            <div className="bg-zinc-950 p-6 rounded-xl border border-nexo-lime/30 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">✨</span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-nexo-lime">
                        AI Project Matcher (Búsqueda Inteligente con Groq)
                    </h3>
                </div>
                <form onSubmit={handleRunAiMatch} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Ej: Necesito un filmmaker con Sony FX3 y drone en Bariloche para filmar un hotel 2 días..."
                        value={matcherQuery}
                        onChange={e => setMatcherQuery(e.target.value)}
                        className="flex-1 bg-black/60 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-nexo-lime"
                    />
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={matchingInProgress}
                            className="px-6 py-3 bg-nexo-lime text-black font-bold text-xs uppercase tracking-widest rounded-sm hover:bg-white transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                            {matchingInProgress ? 'Analizando con IA...' : 'Buscar Matches'}
                        </button>
                        {matchedResults && (
                            <button
                                type="button"
                                onClick={() => { setMatchedResults(null); setMatcherQuery(''); }}
                                className="px-4 py-3 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase rounded-sm hover:bg-zinc-700 hover:text-white"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </form>
                {matchedResults && (
                    <div className="mt-3 text-xs text-nexo-lime font-medium flex items-center gap-2">
                        <span>🎯 Mostrando {matchedResults.length} perfiles ordenados por afinidad según tu requerimiento.</span>
                    </div>
                )}
            </div>

            {/* Barra de Filtros y Búsqueda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-xl border border-white/10">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Buscar</label>
                    <input
                        type="text"
                        placeholder="Nombre, ciudad, equipo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-sm px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-nexo-lime"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Especialidad</label>
                    <select
                        value={filterRole}
                        onChange={e => setFilterRole(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-sm px-3 py-2 text-xs text-white focus:outline-none focus:border-nexo-lime"
                    >
                        <option value="all">Todas las especialidades</option>
                        <option value="Filmmaker / Videógrafo">Filmmaker / Videógrafo</option>
                        <option value="Fotógrafo">Fotógrafo</option>
                        <option value="Director de Fotografía">Director de Fotografía</option>
                        <option value="Editor de Video">Editor de Video</option>
                        <option value="Colorista">Colorista</option>
                        <option value="Piloto de Drone">Piloto de Drone</option>
                        <option value="Creador con IA Generativa">Creador con IA Generativa</option>
                        <option value="Streaming / Broadcast">Streaming / Broadcast</option>
                        <option value="Sonidista / Audio">Sonidista / Audio</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Estado</label>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-sm px-3 py-2 text-xs text-white focus:outline-none focus:border-nexo-lime"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="nuevo">🟡 Nuevos</option>
                        <option value="revisado">🔵 Revisados</option>
                        <option value="aprobado">🟢 Aprobados</option>
                        <option value="frecuente">⭐ Frecuentes</option>
                        <option value="descartado">🔴 Descartados</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Score Mínimo Groq</label>
                    <select
                        value={filterMinScore}
                        onChange={e => setFilterMinScore(Number(e.target.value))}
                        className="w-full bg-black/60 border border-white/10 rounded-sm px-3 py-2 text-xs text-white focus:outline-none focus:border-nexo-lime"
                    >
                        <option value="0">Cualquier score</option>
                        <option value="70">≥ 70 pts (Apto)</option>
                        <option value="80">≥ 80 pts (Calificado)</option>
                        <option value="90">≥ 90 pts (Top Talent)</option>
                    </select>
                </div>
            </div>

            {/* Listado de Tarjetas de Candidatos */}
            {loading ? (
                <div className="text-center py-20 bg-zinc-950 rounded-xl border border-white/5">
                    <div className="w-8 h-8 border-2 border-nexo-lime border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest">Cargando base de NexoFilm Network...</p>
                </div>
            ) : displayCandidates.length === 0 ? (
                <div className="text-center py-20 bg-zinc-950 rounded-xl border border-white/5">
                    <p className="text-zinc-500 text-sm">No se encontraron colaboradores con los filtros seleccionados.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayCandidates.map(cand => {
                        const matchData = matchedResults?.find(m => m.candidate_id === cand.id);
                        return (
                            <div
                                key={cand.id}
                                className={`p-5 rounded-xl bg-zinc-950 border transition-all duration-300 relative flex flex-col justify-between hover:border-white/20 ${
                                    cand.is_promoted_to_crew
                                        ? 'border-nexo-lime/40 bg-zinc-950/90'
                                        : 'border-white/10'
                                }`}
                            >
                                <div>
                                    {/* Cabecera de la Card */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                                                    {cand.full_name}
                                                </h3>
                                                {cand.is_promoted_to_crew && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-nexo-lime text-black">
                                                        En Crew
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-400">
                                                📍 {cand.city}, {cand.country}
                                            </p>
                                        </div>

                                        {/* Badge Score */}
                                        <div className="text-right">
                                            <div className={`text-lg font-black ${
                                                cand.ai_overall_score >= 85
                                                    ? 'text-nexo-lime'
                                                    : cand.ai_overall_score >= 70
                                                    ? 'text-amber-400'
                                                    : 'text-zinc-400'
                                            }`}>
                                                {cand.ai_overall_score || '--'}<span className="text-[10px] text-zinc-500">/100</span>
                                            </div>
                                            <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Groq Score</div>
                                        </div>
                                    </div>

                                    {/* Match IA si está activo */}
                                    {matchData && (
                                        <div className="mb-3 p-2.5 rounded-sm bg-nexo-lime/10 border border-nexo-lime/30 text-xs">
                                            <div className="flex justify-between items-center text-nexo-lime font-bold mb-1">
                                                <span>Match Proyecto:</span>
                                                <span>{matchData.match_percentage}%</span>
                                            </div>
                                            <p className="text-zinc-300 text-[11px] leading-tight">
                                                {matchData.match_reason}
                                            </p>
                                        </div>
                                    )}

                                    {/* Especialidades */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-nexo-lime/15 text-nexo-lime border border-nexo-lime/30">
                                            {cand.primary_role}
                                        </span>
                                        {cand.roles?.filter(r => r !== cand.primary_role).slice(0, 2).map(r => (
                                            <span key={r} className="px-2 py-0.5 rounded-sm text-[9px] text-zinc-400 bg-black/40 border border-white/5">
                                                {r}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Resumen de Groq */}
                                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                                        {cand.ai_executive_summary || 'Sin análisis generado.'}
                                    </p>

                                    {/* Equipos destacados */}
                                    {cand.camera_gear && (
                                        <div className="text-[11px] text-zinc-500 mb-2 truncate">
                                            🎥 <span className="text-zinc-400">{cand.camera_gear}</span>
                                        </div>
                                    )}

                                    {/* Tags de IA y software */}
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {(cand.ai_extracted_tags || []).slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Acciones al pie de la tarjeta */}
                                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCandidate(cand)}
                                        className="px-3 py-1.5 rounded-sm bg-zinc-900 border border-white/10 text-xs text-white font-medium hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer"
                                    >
                                        Ver Ficha Completa
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => openWhatsApp(cand)}
                                            className="p-1.5 rounded-sm bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/60 text-xs transition-colors"
                                            title="Enviar WhatsApp"
                                        >
                                            💬
                                        </button>
                                        {!cand.is_promoted_to_crew && (
                                            <button
                                                type="button"
                                                onClick={() => handlePromoteToCrew(cand)}
                                                className="px-3 py-1.5 rounded-sm bg-nexo-lime text-black font-bold text-[10px] uppercase tracking-wider hover:bg-white transition-all cursor-pointer"
                                                title="Promover a Crew Activo para asignación a presupuestos"
                                            >
                                                + Promover a Crew
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Detalle (Dossier Profesional) */}
            {selectedCandidate && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-zinc-950 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative">
                        
                        {/* Cabecera del Modal */}
                        <div className="flex items-start justify-between border-b border-white/10 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold uppercase tracking-tight text-white">
                                        {selectedCandidate.full_name}
                                    </h3>
                                    {selectedCandidate.artistic_name && (
                                        <span className="text-xs text-zinc-500">({selectedCandidate.artistic_name})</span>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    📍 {selectedCandidate.city}, {selectedCandidate.state_province || ''} {selectedCandidate.country} · {selectedCandidate.years_experience || 'Años N/A'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCandidate(null)}
                                className="text-zinc-500 hover:text-white text-xl p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Mensaje de acción */}
                        {actionMessage && (
                            <div className="p-3 bg-nexo-lime/15 border border-nexo-lime text-nexo-lime text-xs font-bold rounded-sm">
                                {actionMessage}
                            </div>
                        )}

                        {/* Radar de Scores de Groq */}
                        <div className="grid grid-cols-4 gap-2 bg-black/50 p-3 rounded-lg border border-white/5 text-center">
                            <div>
                                <div className="text-lg font-bold text-nexo-lime">{selectedCandidate.ai_overall_score}/100</div>
                                <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Overall Score</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white">{selectedCandidate.ai_profile_score}/100</div>
                                <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Perfil</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white">{selectedCandidate.ai_experience_score}/100</div>
                                <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Experiencia</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white">{selectedCandidate.ai_technical_score}/100</div>
                                <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Equipamiento</div>
                            </div>
                        </div>

                        {/* Resumen de Groq & Inconsistencias */}
                        <div className="space-y-3 bg-zinc-900/50 p-4 rounded-lg border border-white/5">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-nexo-lime">Resumen Ejecutivo IA:</span>
                                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                                    {selectedCandidate.ai_executive_summary}
                                </p>
                            </div>
                            {selectedCandidate.ai_inconsistencies && selectedCandidate.ai_inconsistencies.length > 0 && (
                                <div className="pt-2 border-t border-white/5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">⚠️ Observaciones / Alertas de coherencia:</span>
                                    <ul className="text-xs text-amber-200/90 list-disc list-inside mt-1 space-y-0.5">
                                        {selectedCandidate.ai_inconsistencies.map((inc, i) => (
                                            <li key={i}>{inc}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Muestras y Portfolios */}
                        <div>
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Muestras & Portfolios</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {selectedCandidate.best_project_url && (
                                    <a
                                        href={selectedCandidate.best_project_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded bg-nexo-lime/10 border border-nexo-lime/30 text-nexo-lime font-bold hover:bg-nexo-lime hover:text-black transition-all flex items-center justify-between"
                                    >
                                        <span>🌟 Muestra Más Destacada</span>
                                        <span>↗</span>
                                    </a>
                                )}
                                {selectedCandidate.portfolio_url && (
                                    <a
                                        href={selectedCandidate.portfolio_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded bg-black/40 border border-white/10 text-white hover:border-nexo-lime flex items-center justify-between"
                                    >
                                        <span>🌐 Portfolio Web</span>
                                        <span>↗</span>
                                    </a>
                                )}
                                {selectedCandidate.instagram_url && (
                                    <a
                                        href={selectedCandidate.instagram_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded bg-black/40 border border-white/10 text-white hover:border-nexo-lime flex items-center justify-between"
                                    >
                                        <span>📸 Instagram</span>
                                        <span>↗</span>
                                    </a>
                                )}
                                {selectedCandidate.vimeo_youtube_url && (
                                    <a
                                        href={selectedCandidate.vimeo_youtube_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded bg-black/40 border border-white/10 text-white hover:border-nexo-lime flex items-center justify-between"
                                    >
                                        <span>▶ Vimeo / YouTube</span>
                                        <span>↗</span>
                                    </a>
                                )}
                                {selectedCandidate.behance_url && (
                                    <a
                                        href={selectedCandidate.behance_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded bg-black/40 border border-white/10 text-white hover:border-nexo-lime flex items-center justify-between"
                                    >
                                        <span>🎨 Behance</span>
                                        <span>↗</span>
                                    </a>
                                )}
                                {selectedCandidate.reel_url && (
                                    <a
                                        href={selectedCandidate.reel_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded bg-black/40 border border-white/10 text-white hover:border-nexo-lime flex items-center justify-between"
                                    >
                                        <span>🎬 Showreel</span>
                                        <span>↗</span>
                                    </a>
                                )}
                                {selectedCandidate.cv_url && (
                                    <a
                                        href={selectedCandidate.cv_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded bg-blue-950/40 border border-blue-500/30 text-blue-300 font-bold hover:bg-blue-900/40 transition-all flex items-center justify-between"
                                    >
                                        <span>📎 Abrir CV en PDF</span>
                                        <span>↗</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Equipos y Software */}
                        <div className="space-y-2 text-xs">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Equipamiento & Herramientas</h4>
                            <div className="p-3 rounded bg-black/40 border border-white/5 space-y-1.5 text-zinc-300">
                                <div><strong className="text-white">Cámaras:</strong> {selectedCandidate.camera_gear || 'No declarado'}</div>
                                <div><strong className="text-white">Drone:</strong> {selectedCandidate.drone_gear || 'No tiene'}</div>
                                <div><strong className="text-white">Software:</strong> {(selectedCandidate.software_tools || []).join(', ') || 'No declarado'}</div>
                                <div><strong className="text-white">IA Generativa:</strong> {(selectedCandidate.ai_tools || []).join(', ') || 'No declarado'}</div>
                            </div>
                        </div>

                        {/* Modalidad y Facturación */}
                        <div className="grid grid-cols-2 gap-3 text-xs bg-black/40 p-3 rounded border border-white/5">
                            <div>
                                <span className="text-[10px] uppercase text-zinc-500 font-bold">Facturación:</span>
                                <p className="text-zinc-200 mt-0.5">{selectedCandidate.invoicing_status || 'A convenir'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase text-zinc-500 font-bold">Viajes:</span>
                                <p className="text-zinc-200 mt-0.5">{selectedCandidate.willing_to_travel || 'No especificado'}</p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[10px] uppercase text-zinc-500 font-bold">Modalidad:</span>
                                <p className="text-zinc-200 mt-0.5">{(selectedCandidate.modalities || []).join(' · ') || 'Freelance'}</p>
                            </div>
                        </div>

                        {/* Contacto y Cambio de Estado */}
                        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400 font-bold uppercase">Estado:</span>
                                <select
                                    value={selectedCandidate.status}
                                    onChange={e => handleUpdateStatus(selectedCandidate.id, e.target.value)}
                                    disabled={updatingStatus}
                                    className="bg-black border border-white/20 rounded-sm px-3 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                                >
                                    <option value="nuevo">🟡 Nuevo</option>
                                    <option value="revisado">🔵 Revisado</option>
                                    <option value="aprobado">🟢 Aprobado</option>
                                    <option value="frecuente">⭐ Colaborador Frecuente</option>
                                    <option value="descartado">🔴 Descartado</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => openWhatsApp(selectedCandidate)}
                                    className="px-4 py-2 rounded-sm bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-500 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <span>💬 WhatsApp</span>
                                </button>
                                {!selectedCandidate.is_promoted_to_crew && (
                                    <button
                                        type="button"
                                        disabled={updatingStatus}
                                        onClick={() => handlePromoteToCrew(selectedCandidate)}
                                        className="px-5 py-2 rounded-sm bg-nexo-lime text-black font-bold text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        🚀 Promover a Crew Activo
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Modal Selector de WhatsApp */}
            <WhatsAppSelectorModal
                isOpen={waModalOpen}
                onClose={() => setWaModalOpen(false)}
                phone={waPhone}
                recipientName={waRecipient}
                message={waMessage}
            />

        </div>
    );
};

export default NetworkDirectory;
