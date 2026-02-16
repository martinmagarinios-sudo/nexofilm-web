
import React from 'react';

interface MediaBackgroundProps {
    /** URL de la imagen (fallback si hay video, o media principal si no hay video) */
    image?: string;
    /** URL del video (si existe tiene prioridad sobre la imagen) */
    video?: string;
    /** Texto alt para accesibilidad */
    alt?: string;
    /** Clases CSS adicionales para el contenedor */
    className?: string;
    /** Clases CSS para el elemento media (img o video) */
    mediaClassName?: string;
    /** Si es true, la imagen/video llena el contenedor con object-cover */
    cover?: boolean;
    /** Si es true, aplica grayscale */
    grayscale?: boolean;
    /** Si es interactivo (quita grayscale en hover) */
    hoverColor?: boolean;
}

/**
 * Componente reutilizable que renderiza una imagen o video de fondo.
 * - Si hay `video`, lo muestra en loop, muted, autoplay.
 * - Si solo hay `image`, la muestra como fallback.
 * - Auto-escala al contenedor con object-cover.
 */
const MediaBackground: React.FC<MediaBackgroundProps> = ({
    image,
    video,
    alt = '',
    className = '',
    mediaClassName = '',
    cover = true,
    grayscale = false,
    hoverColor = false,
}) => {
    const coverClass = cover ? 'object-cover' : 'object-contain';
    const grayClass = grayscale ? 'grayscale' : '';
    const hoverClass = hoverColor ? 'hover:grayscale-0 transition-all duration-1000' : '';
    const baseMediaClass = `w-full h-full ${coverClass} ${grayClass} ${hoverClass} ${mediaClassName}`.trim();

    return (
        <div className={`overflow-hidden ${className}`}>
            {video ? (
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={image}
                    className={baseMediaClass}
                    aria-label={alt}
                >
                    <source src={video} type="video/mp4" />
                    {/* Fallback: si el navegador no soporta video, muestra la imagen */}
                    {image && <img src={image} alt={alt} className={baseMediaClass} />}
                </video>
            ) : image ? (
                <img
                    src={image}
                    alt={alt}
                    className={baseMediaClass}
                    loading="lazy"
                />
            ) : null}
        </div>
    );
};

export default MediaBackground;
