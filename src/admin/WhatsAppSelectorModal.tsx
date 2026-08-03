import React, { useState, useEffect } from 'react';

export type WATargetApp = 'personal' | 'business' | 'web' | 'ask';

export const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const getWAPreferredApp = (): WATargetApp => {
    const saved = localStorage.getItem('nexo_crm_wa_app') as WATargetApp;
    if (saved) return saved;
    // En PC la preferencia por defecto es WhatsApp Web ('web')
    // En Celular la preferencia por defecto es 'ask' (Preguntar entre Personal y Business)
    return isMobileDevice() ? 'ask' : 'web';
};

export const setWAPreferredApp = (app: WATargetApp) => {
    localStorage.setItem('nexo_crm_wa_app', app);
};

export const buildWAUrl = (phone: string, text: string, targetApp: 'personal' | 'business' | 'web'): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(text);

    if (targetApp === 'personal') {
        // whatsapp:// URI scheme forces opening standard WhatsApp app on mobile (iOS/Android)
        return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    }
    if (targetApp === 'web') {
        return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }
    // Business / Universal wa.me link
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};

export interface WhatsAppSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    phone: string;
    message: string;
    recipientName?: string;
    onSent?: () => void;
}

export const WhatsAppSelectorModal: React.FC<WhatsAppSelectorModalProps> = ({
    isOpen,
    onClose,
    phone,
    message,
    recipientName,
    onSent
}) => {
    const [preferredApp, setPreferredAppState] = useState<WATargetApp>('ask');
    const [rememberChoice, setRememberChoice] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            setPreferredAppState(getWAPreferredApp());
            setCopied(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelectApp = (target: 'personal' | 'business' | 'web') => {
        if (rememberChoice) {
            setWAPreferredApp(target);
        }
        const url = buildWAUrl(phone, message, target);
        window.open(url, '_blank');
        if (onSent) onSent();
        onClose();
    };

    const handleCopy = () => {
        const textToCopy = message || `https://wa.me/${phone.replace(/\D/g, '')}`;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        if (onSent) onSent();
        setTimeout(() => setCopied(false), 2500);
    };

    const cleanPhone = phone.replace(/\D/g, '');

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-white relative">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm font-bold"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">💬</span>
                        <h3 className="font-black text-base text-white tracking-tight">
                            Enviar Mensaje por WhatsApp
                        </h3>
                    </div>
                    {recipientName && (
                        <p className="text-xs text-nexo-lime font-medium truncate">
                            Para: <span className="font-bold text-white">{recipientName}</span> ({phone})
                        </p>
                    )}
                </div>

                <p className="text-xs text-zinc-400">
                    Seleccioná con qué aplicación de WhatsApp querés notificar:
                </p>

                {/* Options list */}
                <div className="space-y-2 pt-1">
                    {/* WhatsApp Personal */}
                    <button
                        onClick={() => handleSelectApp('personal')}
                        className="w-full bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 rounded-xl p-3 flex items-center justify-between transition-all group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                                📱
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white group-hover:text-emerald-300">WhatsApp Personal / Estándar</div>
                                <div className="text-[10px] text-zinc-400">Abre la app principal (whatsapp://)</div>
                            </div>
                        </div>
                        <span className="text-xs text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">Abrir →</span>
                    </button>

                    {/* WhatsApp Business */}
                    <button
                        onClick={() => handleSelectApp('business')}
                        className="w-full bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 hover:border-blue-400 text-blue-300 rounded-xl p-3 flex items-center justify-between transition-all group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                                💼
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white group-hover:text-blue-300">WhatsApp Business</div>
                                <div className="text-[10px] text-zinc-400">Abre la app Business (wa.me)</div>
                            </div>
                        </div>
                        <span className="text-xs text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">Abrir →</span>
                    </button>

                    {/* WhatsApp Web */}
                    <button
                        onClick={() => handleSelectApp('web')}
                        className="w-full bg-zinc-800/50 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl p-3 flex items-center justify-between transition-all group text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-zinc-700/50 text-zinc-300 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                                🌐
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white">WhatsApp Web</div>
                                <div className="text-[10px] text-zinc-400">Abre en el navegador (web.whatsapp.com)</div>
                            </div>
                        </div>
                        <span className="text-xs text-zinc-400 font-bold group-hover:translate-x-0.5 transition-transform">Abrir →</span>
                    </button>

                    {/* Copy to clipboard */}
                    <button
                        onClick={handleCopy}
                        className="w-full bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-semibold transition-all"
                    >
                        <span>📋</span>
                        <span>{copied ? '✅ ¡Copiado al portapapeles!' : 'Copiar mensaje completo'}</span>
                    </button>
                </div>

                {/* Remember choice */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs text-zinc-400">
                    <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white transition-colors">
                        <input
                            type="checkbox"
                            checked={rememberChoice}
                            onChange={(e) => setRememberChoice(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-950 text-nexo-lime focus:ring-nexo-lime"
                        />
                        <span>Recordar mi elección para siempre</span>
                    </label>

                    {preferredApp !== 'ask' && (
                        <button
                            onClick={() => {
                                setWAPreferredApp('ask');
                                setPreferredAppState('ask');
                            }}
                            className="text-[10px] text-red-400 hover:underline shrink-0"
                        >
                            Resetear preferencia
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default WhatsAppSelectorModal;
