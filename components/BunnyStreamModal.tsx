import React, { useEffect } from 'react';

interface BunnyStreamModalProps {
    videoId: string;
    libraryId?: string;
    title?: string;
    onClose: () => void;
}

const BunnyStreamModal: React.FC<BunnyStreamModalProps> = ({
    videoId,
    libraryId = "738019",
    title,
    onClose
}) => {
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

    // Extraer limpio el ID de video y librería si pasan la URL completa
    const parseBunnyUrl = (input: string) => {
        let lib = libraryId;
        let vid = input;

        if (input.includes('mediadelivery.net')) {
            const parts = input.split('?')[0].split('/');
            // https://player.mediadelivery.net/play/738019/da216142... o embed/738019/da216142...
            if (parts.length >= 2) {
                vid = parts[parts.length - 1];
                lib = parts[parts.length - 2];
            }
        }
        return { lib, vid };
    };

    const { lib: cleanLib, vid: cleanVid } = parseBunnyUrl(videoId);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-3 sm:p-6 md:p-12 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label={title || "Reproductor de Video NexoFilm"}
            onClick={onClose}
        >
            {/* Contenedor del video con aceleración por hardware */}
            <div
                className="relative w-full max-w-6xl aspect-video bg-black rounded-sm overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
                style={{ transform: 'translateZ(0)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Barra superior con título y botón de cerrar */}
                <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
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

                {/* Iframe oficial de Bunny Stream con HLS adaptativo y controles Nexo-Lime */}
                <iframe
                    src={`https://iframe.mediadelivery.net/embed/${cleanLib}/${cleanVid}?autoplay=true&loop=false&muted=false&preload=true&responsive=true`}
                    title={title || "NexoFilm Video Player"}
                    className="w-full h-full border-0"
                    loading="eager"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                />
            </div>
        </div>
    );
};

export default BunnyStreamModal;
