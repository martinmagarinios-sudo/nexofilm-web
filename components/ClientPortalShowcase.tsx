import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const ClientPortalShowcase: React.FC = () => {
    const { t } = useTranslation();
    const [isPlaying, setIsPlaying] = useState(false);
    const bunnyVideoId = "da216142-982e-447f-9dd5-db8ec683e5f4";
    const bunnyLibraryId = "738019";

    React.useEffect(() => {
        const handleGlobalPlay = (e: any) => {
            if (e.detail !== 'portal') {
                setIsPlaying(false);
            }
        };
        window.addEventListener('nexofilm:play-video', handleGlobalPlay);
        return () => window.removeEventListener('nexofilm:play-video', handleGlobalPlay);
    }, []);

    const startPlaying = () => {
        setIsPlaying(true);
        window.dispatchEvent(new CustomEvent('nexofilm:play-video', { detail: 'portal' }));
    };

    const features = [
        {
            key: 'budgets',
            icon: (
                <svg className="w-5 h-5 text-nexo-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            key: 'notifications',
            icon: (
                <svg className="w-5 h-5 text-nexo-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            )
        },
        {
            key: 'billing',
            icon: (
                <svg className="w-5 h-5 text-nexo-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            )
        },
        {
            key: 'live_tracking',
            icon: (
                <svg className="w-5 h-5 text-nexo-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            key: 'downloads',
            icon: (
                <svg className="w-5 h-5 text-nexo-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            )
        },
        {
            key: 'history',
            icon: (
                <svg className="w-5 h-5 text-nexo-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            )
        }
    ];

    return (
        <section id="portal-cliente" className="py-24 md:py-36 bg-black border-b border-white/5 relative overflow-hidden">
            {/* Luces de fondo decorativas */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-nexo-lime/10 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute bottom-10 right-0 w-80 h-80 bg-zinc-800/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                {/* Cabecera de la sección */}
                <div className="max-w-4xl mx-auto text-center mb-16 md:mb-20 space-y-4">
                    <p className="text-nexo-lime text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em]">
                        {t('portal_showcase.badge')}
                    </p>

                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[1.05] text-white">
                        {t('portal_showcase.title_main')}{' '}
                        <span className="text-nexo-lime italic font-light block md:inline">
                            {t('portal_showcase.title_highlight')}
                        </span>
                    </h2>

                    <p className="text-zinc-400 text-base md:text-lg font-light max-w-2xl mx-auto leading-relaxed pt-2">
                        {t('portal_showcase.subtitle')}
                    </p>
                </div>

                {/* Contenido principal: Video / Showcase a la izquierda + Features a la derecha */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center max-w-6xl mx-auto mb-16">
                    {/* Columna Izquierda: Video Card del Portal con IA (Reproducción Directa) */}
                    <div className="lg:col-span-6 relative">
                        <div
                            className="relative aspect-video rounded-sm overflow-hidden bg-zinc-950 ring-1 ring-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                        >
                            {isPlaying ? (
                                <iframe
                                    src={`https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${bunnyVideoId}?autoplay=true&loop=false&muted=false&preload=true&responsive=true`}
                                    title={t('portal_showcase.video_caption')}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                                    allowFullScreen
                                />
                            ) : (
                                <div
                                    onClick={startPlaying}
                                    className="group relative w-full h-full cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { 
                                        if (e.key === 'Enter' || e.key === ' ') { 
                                            e.preventDefault(); 
                                            startPlaying(); 
                                        } 
                                    }}
                                    aria-label="Reproducir video de presentación del Portal de Clientes con IA"
                                >
                                    {/* Imagen de Portada con Carga Inmediata y Alta Prioridad */}
                                    <img
                                        src="/img/portfolio/FotoPortalClienteIA.jpg"
                                        alt="Portal de Clientes NexoFilm - Gestión y Producción Audiovisual con Inteligencia Artificial"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-95 group-hover:brightness-100"
                                        loading="eager"
                                        fetchPriority="high"
                                        decoding="async"
                                    />

                                    {/* Badge IA sobre el video */}
                                    <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md border border-nexo-lime/40 text-nexo-lime text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-sm flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-nexo-lime animate-ping" />
                                        {t('portal_showcase.video_tag')}
                                    </div>

                                    {/* Overlay y Botón Play */}
                                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-all duration-500">
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/80 border-2 border-nexo-lime text-nexo-lime flex items-center justify-center group-hover:bg-nexo-lime group-hover:text-black group-hover:scale-110 transition-all duration-500 shadow-2xl">
                                            <svg className="w-7 h-7 md:w-8 md:h-8 fill-current translate-x-0.5" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Pie del Video (Limpio, sin textos redundantes) */}
                                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                                        <span className="text-[11px] uppercase tracking-wider text-white font-bold">
                                            {t('portal_showcase.video_caption')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna Derecha: Grilla de los 6 Pilares del Portal */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {features.map((item) => (
                                <div
                                    key={item.key}
                                    className="p-4 bg-zinc-950/60 border border-white/5 hover:border-nexo-lime/30 rounded-sm transition-all duration-300 group"
                                >
                                    <div className="w-9 h-9 rounded-sm bg-white/5 group-hover:bg-nexo-lime/10 flex items-center justify-center mb-3 transition-colors">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-white text-xs md:text-sm font-bold uppercase tracking-tight mb-1 group-hover:text-nexo-lime transition-colors">
                                        {t(`portal_showcase.features.${item.key}.title`)}
                                    </h3>
                                    <p className="text-zinc-400 text-[11px] md:text-xs font-light leading-relaxed">
                                        {t(`portal_showcase.features.${item.key}.desc`)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Banner Destacado: Servicio de Producción con Inteligencia Artificial */}
                <div className="max-w-6xl mx-auto p-6 md:p-8 bg-gradient-to-r from-zinc-950 via-zinc-900/60 to-zinc-950 border border-nexo-lime/20 rounded-sm mb-16 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 text-nexo-lime text-[9px] font-black uppercase tracking-[0.3em]">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {t('portal_showcase.ai_service.badge')}
                            </div>
                            <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight text-white">
                                {t('portal_showcase.ai_service.title')}
                            </h3>
                            <p className="text-zinc-400 text-xs md:text-sm font-light max-w-2xl leading-relaxed">
                                {t('portal_showcase.ai_service.desc')}
                            </p>
                        </div>
                        <a
                            href="/presupuesto"
                            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 border border-nexo-lime/40 text-nexo-lime hover:bg-nexo-lime hover:text-black font-bold uppercase tracking-widest text-[10px] rounded-sm transition-all duration-300"
                        >
                            {t('portal_showcase.ai_service.cta')}
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </a>
                    </div>
                </div>

                {/* CTAs de Entrada: Nuevo Cliente vs Cliente Existente */}
                <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                    {/* Botón Principal: Nuevos Presupuestos */}
                    <a
                        href="/presupuesto"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-nexo-lime text-black font-black uppercase tracking-widest text-xs px-8 py-4 rounded-sm hover:bg-white transition-all duration-300 hover:shadow-[0_0_35px_rgba(191,224,35,0.3)]"
                    >
                        <span>{t('portal_showcase.cta_quote')}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </a>

                    {/* Botón Secundario: Acceso Clientes Existentes (Magic Link) */}
                    <a
                        href="/portal/login"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 border border-white/15 bg-white/5 text-zinc-300 hover:text-white hover:border-nexo-lime/40 font-bold uppercase tracking-widest text-xs px-7 py-4 rounded-sm transition-all duration-300"
                    >
                        <svg className="w-4 h-4 text-nexo-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>{t('portal_showcase.cta_login')}</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default ClientPortalShowcase;
