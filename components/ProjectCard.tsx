import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';

interface ProjectCardProps {
    project: Project;
    onVideoClick: (url: string) => void;
    onCopyLink: (url: string, id: string) => void;
    copiedId: string | null;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onVideoClick, onCopyLink, copiedId }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const isPortrait = project.orientation === 'portrait';

    // Lógica para Galerías
    useEffect(() => {
        // Si es galería (más de 1 foto) y está en hover
        if (project.gallery && project.gallery.length > 1 && isHovering) {
            intervalRef.current = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % project.gallery!.length);
            }, 1500); // 1.5s para dar tiempo a ver
        } else {
            // Al salir del hover, volvemos al principio (opcional, o dejar donde quedó)
            setCurrentImageIndex(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isHovering, project.gallery]);

    const handleMouseEnter = () => {
        setIsHovering(true);
        if (project.videoUrl && videoRef.current) {
            videoRef.current.play().catch(e => console.log("Autoplay prevented", e));
        }
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        if (project.videoUrl && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    const handleClick = () => {
        if (project.embedUrl) {
            onVideoClick(project.embedUrl);
        } else if (project.videoUrl) {
            onVideoClick(project.videoUrl);
        } else if (project.category !== 'Foto Producto') {
            window.open(project.behanceUrl, '_blank');
        }
    };

    // Helper para obtener las 3 imágenes actuales en modo Portrait
    const getPortraitImages = () => {
        if (!project.gallery || project.gallery.length === 0) return [project.imageUrl];
        const len = project.gallery.length;
        return [
            project.gallery[currentImageIndex % len],
            project.gallery[(currentImageIndex + 1) % len],
            project.gallery[(currentImageIndex + 2) % len]
        ];
    };

    const displayImage = (project.gallery && project.gallery.length > 0 && isHovering && !isPortrait)
        ? project.gallery[currentImageIndex]
        : project.imageUrl;

    return (
        <div className="group cursor-pointer">
            <div
                className="relative aspect-[16/9] overflow-hidden mb-8 border border-white/5 group-hover:border-nexo-lime/30 transition-colors duration-700 outline-none focus-visible:ring-2 focus-visible:ring-nexo-lime"
                role="button"
                tabIndex={0}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {project.videoUrl ? (
                    /* --- MODO VIDEO --- */
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    >
                        <source src={`${project.videoUrl}#t=0.5`} type="video/mp4" />
                    </video>
                ) : isPortrait && project.gallery && isHovering ? (
                    /* --- MODO PORTRAIT (TRIPTICO) --- */
                    <div className="flex w-full h-full">
                        {getPortraitImages().map((imgSrc, idx) => (
                            <div key={idx} className="w-1/3 h-full border-r border-black/10 last:border-0 relative overflow-hidden">
                                <img
                                    src={imgSrc}
                                    alt={`${project.title} ${idx}`}
                                    className="w-full h-full object-cover transition-transform duration-1000 scale-105"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    /* --- MODO IMAGEN SIMPLE / LANDSCAPE --- */
                    <img
                        src={displayImage}
                        alt={project.title}
                        className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${isHovering ? 'grayscale-0' : 'grayscale'}`}
                    />
                )}

                {/* Overlay */}
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-500 ${project.videoUrl || isHovering ? 'opacity-100 group-hover:bg-black/60' : 'opacity-0 group-hover:opacity-100 bg-black/60'}`}>
                    <div className="w-20 h-20 border-2 border-nexo-lime rounded-full flex items-center justify-center text-nexo-lime scale-90 group-hover:scale-100 transition-all duration-500 hover:bg-nexo-lime hover:text-black">
                        {(project.embedUrl || project.videoUrl) ? (
                            <svg className="w-8 h-8 fill-current translate-x-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        ) : (
                            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                        )}
                    </div>
                </div>

                {/* Indicador de Galería */}
                {project.gallery && project.gallery.length > 1 && isHovering && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                        {project.gallery.slice(0, 5).map((_, idx) => ( // Limitamos a 5 dots
                            <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === (currentImageIndex % 5) ? 'bg-nexo-lime' : 'bg-white/50'}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Resto del componente (Textos y botones) igual ... */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-nexo-lime text-[9px] md:text-[10px] font-bold uppercase tracking-[0.4em] mb-3">{project.category}</p>
                    <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight group-hover:text-nexo-lime transition-colors">{project.title}</h3>
                </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold mr-2">Compartir:</span>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Mira este proyecto de Nexo Film: ${project.title}`)}`} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-nexo-lime hover:text-black transition-all">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.461l.303.18c1.597.946 3.419 1.446 5.289 1.447h.005c5.444 0 9.873-4.43 9.875-9.875 0-2.639-1.027-5.12-2.892-6.988-1.865-1.867-4.348-2.895-6.99-2.896-5.445 0-9.873 4.43-9.875 9.876-.001 2.11.539 4.161 1.564 5.948l.199.345-.996 3.641 3.729-.978zm11.233-7.236c-.3-.15-1.773-.875-2.048-.975-.275-.1-.475-.15-.675.15s-.775.975-.95 1.175-.35.225-.65.075c-.3-.15-1.267-.467-2.413-1.489-.892-.796-1.493-1.778-1.668-2.078-.175-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525-.675-1.625-.925-2.225c-.244-.589-.491-.51-.675-.519-.175-.009-.375-.01-.575-.01s-.525.075-.8.375c-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.116 3.231 5.126 4.532.715.311 1.273.497 1.708.635.719.227 1.373.195 1.89.117.577-.088 1.773-.725 2.023-1.425.25-.7.25-1.3.175-1.425-.075-.125-.275-.2-.575-.35z" /></svg>
                </a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(project.behanceUrl)}`} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white hover:text-black transition-all">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>
                <button onClick={(e) => { e.stopPropagation(); onCopyLink(project.behanceUrl, project.id); }} className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-nexo-lime hover:text-black transition-all">
                    {copiedId === project.id && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-nexo-lime text-black text-[8px] font-bold px-2 py-1 rounded-sm uppercase">Copiado</span>}
                    <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
            </div>
        </div>
    );
};

export default ProjectCard;
