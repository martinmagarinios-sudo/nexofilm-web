import React, { useState, useEffect, useRef } from 'react';
// import { supabase } from '../lib/supabase'; // Eliminado para seguridad


interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'admin';
    content: string;
    timestamp?: string;
}

interface WhatsAppSession {
    phone: string;
    history: ChatMessage[];
    updated_at: string;
    name?: string; // Nombre opcional traído de whatsapp_leads
}

interface AdminChatProps {
    initialPhone?: string | null;
}

const AdminChat: React.FC<AdminChatProps> = ({ initialPhone }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
    const [selectedPhone, setSelectedPhone] = useState<string | null>(initialPhone || null);
    const [loading, setLoading] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [activeLead, setActiveLead] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Referencia para mantener el scroll abajo
    const [promoLoading, setPromoLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'Nex@2023R') {
            setIsAuthenticated(true);
            fetchSessions();
        } else {
            setError('Contraseña incorrecta');
        }
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getSessions', password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al conectar con la API');

            // Cruzar datos (Usar últimos 8 dígitos para evitar problemas de +54 vs +549)
            const getLast8 = (p: string) => (p || '').replace(/\D/g, '').slice(-8);
            const enrichedSessions = (data.sessions || []).map((s: any) => {
                const lead = data.leadNames?.find((l: any) => getLast8(l.phone) === getLast8(s.phone));
                return { ...s, name: lead?.name };
            });

            setSessions(enrichedSessions as WhatsAppSession[]);
        } catch (error: any) {
            console.error('Error fetching sessions:', error);
            setError('Falla de seguridad o conexión: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Actualizar historial periódicamente (Polling)
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            fetchSessions();
        }, 5000); // Refresca cada 5 segundos
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Bajar el scroll al cambiar de chat o recibir mensaje
    useEffect(() => {
        scrollToBottom();
    }, [selectedPhone, sessions]);

    // Buscar datos del lead (Resumen IA)
    useEffect(() => {
        if (!selectedPhone || !isAuthenticated) {
            setActiveLead(null);
            return;
        }
        const fetchLeadData = async () => {
            try {
                const res = await fetch('/api/admin-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'getLeadDetail', password, phone: selectedPhone })
                });
                const data = await res.json();
                if (res.ok && data.lead) {
                    setActiveLead(data.lead);
                }
            } catch (e) {
                console.error("Error fetching lead detail:", e);
            }
        };
        fetchLeadData();
    }, [selectedPhone, isAuthenticated]);

    const activeSession = sessions.find(s => s.phone === selectedPhone);

    const sendPromo = async (phone: string) => {
        if (!confirm('¿Seguro que querés enviar la promoción de servicios a este cliente?')) return;
        
        setPromoLoading(true);
        try {
            const res = await fetch('/api/whatsapp_promo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await res.json();
            if (data.status === 'success') {
                alert('¡Promo enviada exitosamente!');
                fetchSessions(); // Recargar la lista de mensajes
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e) {
            alert('Error al enviar: ' + (e as any).message);
        } finally {
            setPromoLoading(false);
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedPhone || sending) return;

        setSending(true);
        const textToSend = messageInput.trim();
        setMessageInput(''); // Optimistic clear

        try {
            const res = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: selectedPhone,
                    message: textToSend,
                    password: password // para seguridad del endpoint
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error enviando mensaje');
            
            // Forzar actualización inmediata para ver nuestro mensaje
            await fetchSessions();
            
        } catch (err: any) {
            alert('❌ Falla al enviar a Meta: ' + err.message);
            setMessageInput(textToSend); // Restore input
        } finally {
            setSending(false);
        }
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
                            <label className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Desbloquear CRM Omnicanal</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-[#25D366] transition-colors"
                                placeholder="••••••••"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#25D366] text-white font-bold py-3 rounded hover:bg-white hover:text-black transition-colors"
                        >
                            Acceder al Chat
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- PANTALLA TIPO WHATSAPP WEB ---
    return (
        <div className="h-screen bg-[#111b21] flex text-[#e9edef] font-['Segoe_UI',Helvetica,Arial,sans-serif]">
            
            {/* Lista de Contactos (Izquierda) */}
            <div className={`w-full md:w-1/3 bg-[#111b21] border-r border-[#222d34] flex flex-col ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
                {/* Header Lateral */}
                <div className="bg-[#202c33] h-16 flex items-center px-4 shrink-0 justify-between">
                    <img src="/img/logo.png" alt="NexoFilm" className="h-6 brightness-0 invert" />
                    <a href="/admin" className="text-xs text-[#00a884] font-medium hover:underline">Volver a Leads</a>
                </div>
                
                {/* Buscador de Chats */}
                <div className="bg-[#111b21] p-2 border-b border-[#222d34]">
                    <div className="bg-[#202c33] flex items-center px-4 py-1 rounded-lg group focus-within:ring-1 focus-within:ring-[#00a884]/30 transition-all">
                        <svg className="w-4 h-4 text-[#8696a0] mr-3 group-focus-within:text-[#00a884]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar contacto o mensaje..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none text-[14px] text-[#e9edef] placeholder-[#8696a0] py-1.5 focus:outline-none focus:ring-0"
                        />
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto">
                    {loading && sessions.length === 0 ? (
                        <div className="text-center p-4 text-[#8696a0]">Sincronizando con Meta...</div>
                    ) : (
                        sessions
                            .filter(s => 
                                (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                s.phone.includes(searchTerm) ||
                                s.history.some(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
                            )
                            .map(session => (
                            <div 
                                key={session.phone}
                                onClick={() => setSelectedPhone(session.phone)}
                                className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#202c33] transition-colors border-b border-[#222d34] ${selectedPhone === session.phone ? 'bg-[#2a3942]' : ''}`}
                            >
                                <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 text-xl overflow-hidden">
                                    👤
                                </div>
                                <div className="ml-4 flex-1 overflow-hidden">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <div className="font-semibold text-[#e9edef] truncate text-base">
                                            {session.name || `+${session.phone}`}
                                        </div>
                                        <div className="text-xs text-[#8696a0] shrink-0">{formatTime(session.updated_at)}</div>
                                    </div>
                                    <div className="text-sm text-[#8696a0] truncate">
                                        {session.history && session.history.length > 0 
                                            ? session.history[session.history.length - 1].content 
                                            : "Sin mensajes previos"}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Panel de Chat (Derecha) */}
            <div className={`w-full md:w-2/3 bg-[#0b141a] flex flex-col relative ${!selectedPhone ? 'hidden md:flex' : 'flex'}`}>
                
                {/* Fondo doodle de Whatsapp opcional */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "url('https://static.whatsapp.net/rsrc.php/v3/yl/r/rI1wIfE3O56.png')", backgroundSize: "300px" }}></div>

                {selectedPhone ? (
                    <>
                        {/* Header Chat Activo */}
                        <div className="bg-[#202c33] h-16 flex items-center px-4 shrink-0 z-10 border-b border-white/5">
                            <button onClick={() => setSelectedPhone(null)} className="md:hidden mr-4 text-[#8696a0] text-2xl">←</button>
                            <div className="w-10 h-10 rounded-full bg-nexo-lime flex items-center justify-center shrink-0 text-white font-bold">
                                {activeLead?.name?.[0] || '👤'}
                            </div>
                            <div className="ml-4 flex-1">
                                <div className="font-medium text-base">{activeLead?.name || `+${selectedPhone}`}</div>
                                <div className="text-[11px] text-[#8696a0] flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
                                    Canal de Atención Directa
                                </div>
                            </div>
                        </div>

                        {/* PANEL DE RESUMEN IA (Anti-Desparramo) */}
                        {activeLead?.summary && (
                            <div className="bg-[#202c33]/80 backdrop-blur-md mx-4 mt-4 p-4 rounded-xl border border-nexo-lime/20 z-10 shadow-lg">
                                <div className="flex items-center gap-2 mb-2 text-nexo-lime text-xs font-bold uppercase tracking-wider">
                                    <span>🧠 Resumen de NexoBot IA</span>
                                    <div className="ml-auto flex items-center gap-2">
                                        <button 
                                            onClick={() => sendPromo(selectedPhone)} 
                                            disabled={promoLoading}
                                            className="bg-[#25D366] hover:bg-[#128c7e] text-black text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            🚀 {promoLoading ? 'Enviando...' : 'ENVIAR PROMO'}
                                        </button>
                                        {activeLead.score && (
                                            <span className="bg-nexo-lime/20 px-2 py-0.5 rounded text-[10px]">
                                                Calificación: {activeLead.score}/100
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-[#e9edef] italic leading-relaxed">
                                    "{activeLead.summary}"
                                </p>
                                <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#8696a0]">
                                    {activeLead.email && <span>📧 Email: <b className="text-[#e9edef]">{activeLead.email}</b></span>}
                                    {activeLead.source && <span>📍 Origen: <b className="text-[#e9edef]">{activeLead.source}</b></span>}
                                    {activeLead.created_at && <span>📅 Captado: <b className="text-[#e9edef]">{new Date(activeLead.created_at).toLocaleDateString()}</b></span>}
                                </div>
                            </div>
                        )}

                        {/* Globos de Mensajes */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-2 z-10 min-h-0">
                            {activeSession?.history?.map((msg, idx) => {
                                if (msg.role === 'system') return null;
                                
                                // Limpiar el bloque HANDOFF_JSON del contenido visible
                                const cleanContent = (msg.content || '')
                                    .replace(/\$\$HANDOFF_JSON\$\$[\s\S]*?\$\$HANDOFF_JSON\$\$/gi, '')
                                    .replace(/\$\$SHOW_MENU\$\$/gi, '[Menú enviado]')
                                    .trim();
                                
                                if (!cleanContent) return null; // No mostrar burbujas vacías

                                const isNexoFilm = msg.role === 'assistant' || msg.role === 'admin';
                                return (
                                    <div key={idx} className={`flex ${isNexoFilm ? 'justify-end' : 'justify-start'} w-full`}>
                                        <div className={`relative max-w-[85%] md:max-w-[70%] px-2.5 py-1.5 rounded-lg text-[14.2px] leading-[19px] whitespace-pre-wrap break-words ${
                                            isNexoFilm ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                        }`}>
                                            {msg.role === 'admin' && (
                                                <div className="text-[10px] uppercase font-bold text-[#25D366] mb-1">👨‍💻 TÚ MISM@ (Humano)</div>
                                            )}
                                            {msg.role === 'assistant' && (
                                                <div className="text-[10px] uppercase font-bold text-nexo-lime mb-1">🤖 NexoBot IA</div>
                                            )}
                                            {cleanContent}
                                            <div className="text-[11px] text-white/50 text-right mt-1 ml-4 float-right pt-2.5">
                                                {formatTime(msg.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Inferior */}
                        <div className="bg-[#202c33] px-4 py-3 shrink-0 z-10">
                            <form onSubmit={handleSendMessage} className="flex gap-4 items-end bg-[#2a3942] rounded-lg overflow-hidden py-1 px-2">
                                <textarea 
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    // Para que enter envíe y shift+enter baje
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-transparent border-none text-[15px] text-[#e9edef] placeholder-[#8696a0] px-3 py-2.5 resize-none max-h-32 min-h-[44px] focus:outline-none focus:ring-0 whitespace-pre-wrap"
                                    rows={1}
                                />
                                <button 
                                    type="submit"
                                    disabled={sending || !messageInput.trim()}
                                    className="p-3 text-[#8696a0] hover:text-[#00a884] disabled:opacity-50 transition-colors"
                                >
                                    {sending ? '...' : (
                                        <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" className="" fill="currentColor">
                                            <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path>
                                        </svg>
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
                        <img src="/img/logo.png" alt="NexoFilm" className="h-12 brightness-0 invert opacity-20 mb-8" />
                        <h2 className="text-3xl text-white/80 font-light mb-4">NexoFilm CRM</h2>
                        <p className="text-[#8696a0] text-sm">Selecciona un chat activo a tu izquierda para continuar la conversación humana sin salir de tu escritorio.</p>
                        <div className="mt-10 inline-flex items-center gap-2 text-[#8696a0] text-xs bg-[#202c33] px-4 py-2 rounded-full">
                            🔒 Encriptado con la API Oficial de Meta
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default AdminChat;
