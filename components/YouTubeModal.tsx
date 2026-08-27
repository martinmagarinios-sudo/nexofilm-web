import React, { useEffect } from 'react';

interface YouTubeModalProps {
    videoId: string;
    title?: string;
    onClose: () => void;
}

const YouTubeModal: React.FC<YouTubeModalProps> = ({ videoId, title, onClose }) => {
    // Cerrar con tecla Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Extraer ID limpio en caso de que venga una URL completa
    const getCleanVideoId = (urlOrId: string) => {
        if (!urlOrId) return '';
        if (urlOrId.includes('youtu.be/')) {
            return urlOrId.split('youtu.be/')[1].split('?')[0];
        }
        if (urlOrId.includes('youtube.com/watch?v=')) {
            return urlOrId.split('watch?v=')[1].split('&')[0];
        }
        if (urlOrId.includes('youtube.com/embed/')) {
            return urlOrId.split('embed/')[1].split('?')[0];
        }
        return urlOrId;
    };

    const cleanId = getCleanVideoId(videoId);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 md:p-12 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label={title || "Reproductor de Video NexoFilm"}
            onClick={onClose}
        >
            {/* Contenedor del video */}
            <div
                className="relative w-full max-w-5xl aspect-video bg-black rounded-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Barra superior con título y botón de cerrar */}
                <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
                    {title && (
                        <div className="text-white/90 text-xs sm:text-sm font-bold uppercase tracking-wider truncate pr-12 drop-shadow">
                            {title}
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="pointer-events-auto ml-auto w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/70 hover:bg-nexo-lime text-white hover:text-black flex items-center justify-center transition-all duration-300 border border-white/10 hover:border-nexo-lime group shadow-lg cursor-pointer"
                        aria-label="Cerrar video"
                    >
                        <svg className="w-4 h-4 stroke-current stroke-2 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Iframe de YouTube con parámetros optimizados */}
                <iframe
                    src={`https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
                    title={title || "Video NexoFilm"}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            </div>
        </div>
    );
};

export default YouTubeModal;
