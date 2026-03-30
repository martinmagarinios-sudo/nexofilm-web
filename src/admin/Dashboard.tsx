import React, { useState, useEffect } from 'react';
// import { supabase } from '../lib/supabase'; // Eliminado para seguridad


interface WhatsAppLead {
    id: string;
    phone: string;
    name: string | null;
    email: string | null;
    summary: string | null;
    is_hot: boolean;
    score: number;
    source: string | null;
    created_at: string;
    updated_at?: string;
}

const Dashboard: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [leads, setLeads] = useState<WhatsAppLead[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalCount, setTotalCount] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Contraseña solicitada por el usuario
        if (password === 'Nex@2023R') {
            setIsAuthenticated(true);
            fetchLeads();
        } else {
            setError('Contraseña incorrecta');
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getLeads', password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al conectar con la API');

            if (data.leads) setLeads(data.leads as WhatsAppLead[]);
            if (data.totalCount !== undefined) setTotalCount(data.totalCount);
        } catch (error: any) {
            console.error('Error fetching leads:', error);
            setError('Falla de seguridad o conexión: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-AR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // --- PANTALLA DE LOGIN ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black font-['Noto_Sans_JP'] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-lg p-8 shadow-2xl">
                    <div className="flex justify-center mb-8">
                        <img src="/img/logo.png" alt="NexoFilm" className="h-12 brightness-0 invert" />
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-zinc-400 text-sm font-medium">Contraseña de Acceso</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-nexo-lime transition-colors"
                                placeholder="••••••••"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-nexo-lime text-black font-bold py-3 rounded hover:bg-white transition-colors"
                        >
                            Ingresar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- PANTALLA DEL DASHBOARD ---
    return (
        <div className="min-h-screen bg-black text-white font-['Noto_Sans_JP'] selection:bg-nexo-lime selection:text-black">
            {/* Header */}
            <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src="/img/logo.png" alt="NexoFilm" className="h-6 brightness-0 invert" />
                        <span className="text-zinc-600">|</span>
                        <h1 className="text-zinc-300 font-medium tracking-wide">Panel de Contactos (Leads)</h1>
                    </div>
                    <button
                        onClick={() => fetchLeads()}
                        className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded transition-colors"
                    >
                        ↻ Actualizar
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-6 py-12">
                {error.includes('Falla') ? (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-8">
                        {error}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* --- HUB DE ANALÍTICAS Y ACCESOS RÁPIDOS --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                            {/* Card 1: Total Leads */}
                            <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-6 shadow-2xl flex flex-col justify-center">
                                <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mb-2">Total Contactos (Leads)</h3>
                                <div className="text-5xl font-black tracking-tighter text-nexo-lime">
                                    {loading ? '...' : totalCount || leads.length}
                                </div>
                            </div>

                            {/* Card 2: Google Analytics */}
                            <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer" className="bg-zinc-900/40 border border-white/5 hover:border-blue-500/50 rounded-xl p-6 shadow-2xl group transition-all flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    </div>
                                    <svg className="w-4 h-4 text-zinc-600 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">Google Analytics</h3>
                                    <p className="text-zinc-500 text-xs">Monitoreo de tráfico y visitas web</p>
                                </div>
                            </a>

                            {/* Card 3: Supabase */}
                            <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer" className="bg-zinc-900/40 border border-white/5 hover:border-emerald-500/50 rounded-xl p-6 shadow-2xl group transition-all flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                    </div>
                                    <svg className="w-4 h-4 text-zinc-600 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1 group-hover:text-emerald-400 transition-colors">Supabase DB</h3>
                                    <p className="text-zinc-500 text-xs">Gestión avanzada de base de datos</p>
                                </div>
                            </a>

                            {/* Card 4: Meta Developers */}
                            <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="bg-zinc-900/40 border border-white/5 hover:border-nexo-lime/50 rounded-xl p-6 shadow-2xl group transition-all flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-full bg-nexo-lime/10 flex items-center justify-center text-nexo-lime group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                    </div>
                                    <svg className="w-4 h-4 text-zinc-600 group-hover:text-nexo-lime transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1 group-hover:text-nexo-lime transition-colors">Meta WhatsApp API</h3>
                                    <p className="text-zinc-500 text-xs">Estado del bot y plantillas</p>
                                </div>
                            </a>

                        </div>

                        {/* --- ESPACIO RESERVADO PARA GOOGLE LOOKER STUDIO --- */}
                        {/* 
                            Para incrustar un reporte visual interactivo en el futuro:
                            1. Creá el reporte en lookerstudio.google.com conectando Analytics.
                            2. En Archivo > Insertar informe, copiá la URL.
                            3. Descomentá el bloque de abajo y reemplazá el 'src'.
                        */}
                        {/* 
                        <div className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden shadow-2xl aspect-[16/9] md:aspect-[21/9]">
                            <iframe 
                                width="100%" 
                                height="100%" 
                                src="https://lookerstudio.google.com/embed/reporting/TU-ID-DE-REPORTE/page/1M" 
                                frameBorder="0" 
                                style={{ border: 0 }} 
                                allowFullScreen 
                                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin popups popups-to-escape-sandbox"
                            ></iframe>
                        </div> 
                        */}

                        {/* --- TABLA DE LEADS --- */}
                        <div className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                            {/* Buscador de Leads */}
                            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-800/20">
                                <h2 className="text-xl font-bold text-white tracking-tight">Listado de Conversaciones</h2>
                                <div className="relative group max-w-md w-full">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-zinc-500 group-focus-within:text-nexo-lime transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o teléfono..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-nexo-lime/50 focus:ring-1 focus:ring-nexo-lime/20 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-zinc-800/50 border-b border-white/10 text-zinc-400 text-sm tracking-wider uppercase">
                                            <th className="px-6 py-4 font-medium w-48">Fecha y Hora</th>
                                            <th className="px-6 py-4 font-medium w-48">Nombre</th>
                                            <th className="px-6 py-4 font-medium w-48">Teléfono</th>
                                            <th className="px-6 py-4 font-medium w-32 text-center">Interés</th>
                                            <th className="px-6 py-4 font-medium w-48">Origen</th>
                                            <th className="px-6 py-4 font-medium">Resumen del Bot</th>
                                            <th className="px-6 py-4 font-medium w-32 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-zinc-300 text-sm">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">Cargando leads...</td>
                                            </tr>
                                        ) : (
                                            leads
                                                .filter(lead => 
                                                    (lead.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                    lead.phone.includes(searchTerm)
                                                )
                                                .map((lead) => (
                                                <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                                                        {formatDate(lead.updated_at || lead.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white uppercase">
                                                        {lead.name || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-nexo-lime">
                                                        {lead.phone.startsWith('+') ? lead.phone : `+${lead.phone}`}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {lead.is_hot ? (
                                                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-xs font-bold" title="Lead Caliente">
                                                                🔥 {lead.score || 100}
                                                            </span>
                                                        ) : lead.score ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${lead.score >= 70 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                                lead.score >= 40 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                                                    'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                                                                }`}>
                                                                {lead.score >= 70 ? '🟢' : lead.score >= 40 ? '🟡' : '⚪'} {lead.score}
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-600 text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {lead.source ? (
                                                            <span className="inline-flex items-center gap-1 bg-white/5 text-zinc-300 border border-white/10 px-2 py-1 rounded text-xs">
                                                                {lead.source.toLowerCase().includes('web') ? '🌐' : lead.source.toLowerCase().includes('ig') || lead.source.toLowerCase().includes('instagram') ? '📱' : lead.source.toLowerCase().includes('linkedin') ? '💼' : '📝'} {lead.source}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded text-xs" title="Proviene de tu base de datos importada o histórica">
                                                                ⭐ Histórico VIP
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 leading-relaxed">
                                                        {lead.summary}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <a
                                                            href={`/admin/chat?phone=${lead.phone}`}
                                                            className="inline-block bg-white/10 text-white font-medium px-4 py-2 rounded text-xs hover:bg-nexo-lime hover:text-black transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        >
                                                            Hablar
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
