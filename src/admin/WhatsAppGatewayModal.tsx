import React, { useState, useEffect } from 'react';

interface WhatsAppGatewayModalProps {
    isOpen: boolean;
    onClose: () => void;
    password?: string;
}

export const WhatsAppGatewayModal: React.FC<WhatsAppGatewayModalProps> = ({
    isOpen,
    onClose,
    password = 'Nex@2023R'
}) => {
    const [status, setStatus] = useState<{
        connected: boolean;
        configured: boolean;
        qr?: string | null;
        qrDataUrl?: string | null;
        user?: any;
        error?: string;
        gatewayUrl?: string;
    } | null>(null);

    const [loading, setLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('+5491151191964');
    const [testSending, setTestSending] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/gateway');
            const data = await res.json();
            setStatus(data);
        } catch (err: any) {
            setStatus({
                connected: false,
                configured: false,
                error: 'No se pudo contactar con el endpoint de Gateway.'
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchStatus();
            const interval = setInterval(fetchStatus, 4000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSendTest = async () => {
        if (!testPhone) return;
        setTestSending(true);
        setTestResult(null);

        try {
            const res = await fetch('/api/gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send',
                    to: testPhone,
                    message: `🎬 *NexoFilm CRM* — _Prueba de Conexión_\n\n✅ ¡Tu WhatsApp Business quedó vinculado exitosamente con el CRM en segundo plano!\n\nFecha: ${new Date().toLocaleString('es-AR')}`,
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar');

            setTestResult('✅ ¡Mensaje de prueba enviado con éxito a tu WhatsApp!');
        } catch (err: any) {
            setTestResult(`❌ Error: ${err.message}`);
        } finally {
            setTestSending(false);
        }
    };

    const handleLogout = async () => {
        if (!confirm('¿Seguro que querés desvincular este WhatsApp Business del CRM?')) return;
        setLoading(true);
        try {
            await fetch('/api/gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout', password })
            });
            fetchStatus();
        } catch (err) {
            alert('Error al desvincular');
        } finally {
            setLoading(false);
        }
    };

    const handleRestart = async () => {
        setLoading(true);
        try {
            await fetch('/api/gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restart', password })
            });
            setTimeout(fetchStatus, 2000);
        } catch (err) {
            alert('Error al reiniciar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white relative">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="text-2xl">⚡</span>
                        <div>
                            <h3 className="font-black text-base text-white tracking-tight">
                                WhatsApp Business Gateway
                            </h3>
                            <p className="text-[11px] text-zinc-400">
                                Envíos 100% en segundo plano con tu número comercial
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm font-bold"
                    >
                        ✕
                    </button>
                </div>

                {/* Status Badge */}
                <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-zinc-950/60 border-white/10">
                    <div className="flex items-center gap-2.5">
                        <span className="text-xl">
                            {status?.connected ? '🟢' : (status?.qrDataUrl ? '🟡' : '🔴')}
                        </span>
                        <div>
                            <div className="text-xs font-bold text-white">
                                {status?.connected
                                    ? 'Conectado y Operativo'
                                    : (status?.qrDataUrl ? 'Esperando Escaneo de QR' : 'Servicio Desconectado')}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                                {status?.connected
                                    ? `Línea: ${status.user?.id?.split(':')[0] || '+54 9 11 5119 1964'} (${status.user?.name || 'NexoFilm Business'})`
                                    : (status?.qrDataUrl ? 'Abrí WhatsApp Business en tu celu y escaneá el QR' : (status?.error || 'Iniciá el microservicio para conectar'))}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={fetchStatus}
                        className="text-zinc-400 hover:text-white text-xs px-2.5 py-1 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition"
                        title="Actualizar estado"
                    >
                        🔄
                    </button>
                </div>

                {/* QR Code Section (If not connected and QR is available) */}
                {!status?.connected && status?.qrDataUrl && (
                    <div className="bg-black/50 border border-nexo-lime/20 rounded-xl p-5 text-center space-y-3">
                        <div className="inline-block p-3 bg-white rounded-2xl shadow-xl">
                            <img
                                src={status.qrDataUrl}
                                alt="Código QR de WhatsApp"
                                className="w-56 h-56 mx-auto object-contain"
                            />
                        </div>
                        <div className="text-xs text-zinc-300 space-y-1">
                            <p className="font-bold text-nexo-lime">📱 Pasos para vincular:</p>
                            <p className="text-[11px] text-zinc-400">
                                1. Abrí <strong>WhatsApp Business</strong> en tu celular.<br />
                                2. Tocá <strong>Ajustes / Menú</strong> ➜ <strong>Dispositivos vinculados</strong>.<br />
                                3. Tocá <strong>Vincular un dispositivo</strong> y apuntá la cámara a este QR.
                            </p>
                        </div>
                    </div>
                )}

                {/* Connected Section */}
                {status?.connected && (
                    <div className="space-y-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
                        <div className="text-xs text-emerald-300 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                                <span>✅</span> ¡Todo listo para enviar en segundo plano!
                            </p>
                            <p className="text-[11px] text-zinc-400">
                                Las notificaciones de Crew, presupuestos y portal saldrán de forma invisible desde tu WhatsApp Business.
                            </p>
                        </div>

                        {/* Test Message Form */}
                        <div className="pt-2 border-t border-white/5 space-y-2">
                            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                                Enviar mensaje de prueba a tu WhatsApp:
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value)}
                                    placeholder="+5491151191964"
                                    className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime flex-1"
                                />
                                <button
                                    onClick={handleSendTest}
                                    disabled={testSending}
                                    className="bg-nexo-lime hover:bg-nexo-lime/90 text-black font-bold text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                                >
                                    {testSending ? 'Enviando...' : 'Probar Envío'}
                                </button>
                            </div>
                            {testResult && (
                                <p className={`text-[11px] font-medium ${testResult.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {testResult}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <div className="flex gap-2">
                        {status?.connected && (
                            <button
                                onClick={handleLogout}
                                disabled={loading}
                                className="text-red-400 hover:text-red-300 text-[11px] hover:underline"
                            >
                                Desvincular WhatsApp
                            </button>
                        )}
                        <button
                            onClick={handleRestart}
                            disabled={loading}
                            className="text-zinc-400 hover:text-white text-[11px] hover:underline"
                        >
                            Reiniciar Socket
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                        Cerrar
                    </button>
                </div>

            </div>
        </div>
    );
};

export default WhatsAppGatewayModal;
