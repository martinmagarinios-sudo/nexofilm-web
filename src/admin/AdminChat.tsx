import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'admin';
    content: string;
    timestamp?: string;
}

interface WhatsAppSession {
    phone: string;
    history: ChatMessage[];
    updated_at: string;
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
    
    // Referencia para mantener el scroll abajo
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
        if (!supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('whatsapp_sessions')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            if (data) setSessions(data as WhatsAppSession[]);
        } catch (error) {
            console.error('Error fetching sessions:', error);
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

    const activeSession = sessions.find(s => s.phone === selectedPhone);

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
                
                {/* Buscador ficticio */}
                <div className="bg-[#111b21] p-2 border-b border-[#222d34]">
                    <div className="bg-[#202c33] flex items-center px-4 py-1.5 rounded-lg">
                        <span className="text-[#8696a0] text-sm">Chats Activos</span>
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto">
                    {loading && sessions.length === 0 ? (
                        <div className="text-center p-4 text-[#8696a0]">Sincronizando con Meta...</div>
                    ) : (
                        sessions.map(session => (
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
                                        <div className="font-normal text-[#e9edef] truncate text-base">+{session.phone}</div>
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
                        <div className="bg-[#202c33] h-16 flex items-center px-4 shrink-0 z-10">
                            <button onClick={() => setSelectedPhone(null)} className="md:hidden mr-4 text-[#8696a0] text-2xl">←</button>
                            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">👤</div>
                            <div className="ml-4">
                                <div className="font-medium text-base">+{selectedPhone}</div>
                                <div className="text-xs text-[#8696a0] mt-0.5">Respondiendo como Cuenta Oficial NexoFilm</div>
                            </div>
                        </div>

                        {/* Globos de Mensajes */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-2 z-10 min-h-0">
                            {activeSession?.history?.map((msg, idx) => {
                                if (msg.role === 'system') return null; // No mostramos los prompts del sistema

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
                                            {msg.content}
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
