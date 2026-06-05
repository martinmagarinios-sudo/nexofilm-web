import React, { useState } from 'react';

const PortalLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'request_magic_link',
                    email: email.trim().toLowerCase()
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al enviar enlace');
            }

            setSuccessMsg('🔐 ¡Enlace enviado! Revisá tu bandeja de entrada (y la carpeta de spam si no lo encontrás).');
            setEmail('');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'El email ingresado no coincide con ningún proyecto registrado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Elemento de diseño de fondo */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nexo-lime/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00e5ff]/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-md bg-zinc-950 border border-white/5 p-8 rounded-xl shadow-2xl space-y-6 relative z-10">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-nexo-lime/10 border border-nexo-lime/20 text-nexo-lime text-xl font-bold mb-2">
                        🔐
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-wider text-white">Portal de Clientes</h1>
                    <p className="text-zinc-500 text-xs leading-relaxed max-w-xs mx-auto">
                        Ingresá tu correo electrónico registrado para recibir el enlace de acceso confidencial a tu portal de proyectos.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="email" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime transition-colors"
                            placeholder="nombre@empresa.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-nexo-lime hover:bg-white text-black font-black text-xs uppercase tracking-widest py-3.5 rounded transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-none"
                    >
                        {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
                    </button>
                </form>

                {successMsg && (
                    <div className="bg-nexo-lime/10 border border-nexo-lime/20 text-nexo-lime p-4 rounded-lg text-xs leading-relaxed">
                        {successMsg}
                    </div>
                )}

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-xs leading-relaxed">
                        ⚠️ {errorMsg}
                    </div>
                )}

                <div className="text-center pt-2">
                    <a 
                        href="/" 
                        className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
                    >
                        ← Volver al inicio
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PortalLogin;
