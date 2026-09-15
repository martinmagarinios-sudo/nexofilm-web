import React, { useState, useEffect } from 'react';
import Logo from '../../components/Logo';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink?: string;
    thumbnailLink?: string;
    webContentLink?: string;
    size?: string | number;
    createdTime?: string;
}

interface ProjectPublicInfo {
    name: string;
    client_name?: string;
    company?: string;
    status?: string;
    created_at?: string;
}

const StorageDelivery: React.FC = () => {
    const [project, setProject] = useState<ProjectPublicInfo | null>(null);
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [previewVideo, setPreviewVideo] = useState<DriveFile | null>(null);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<'name' | 'default'>('default');

    // Obtener token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    useEffect(() => {
        if (!token) {
            setError('No se proporcionó un enlace o token válido de descarga.');
            setLoading(false);
            return;
        }

        const fetchStorageData = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/api/comercial/client?action=storage&token=${encodeURIComponent(token)}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'No se pudieron recuperar los archivos de la entrega.');
                }

                setProject(data.project || null);
                setFiles(data.files || []);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Error de conexión con NexoFilm Storage.');
            } finally {
                setLoading(false);
            }
        };

        fetchStorageData();
    }, [token]);

    const formatFileSize = (bytes?: string | number | null) => {
        if (!bytes) return null;
        const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
        if (isNaN(num) || num <= 0) return null;
        if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
        if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
        return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const isVideo = (file: DriveFile) => {
        return (
            file.mimeType?.includes('video') ||
            file.name?.toLowerCase().endsWith('.mp4') ||
            file.name?.toLowerCase().endsWith('.mov') ||
            file.name?.toLowerCase().endsWith('.mkv') ||
            file.name?.toLowerCase().endsWith('.webm')
        );
    };

    const isZip = (file: DriveFile) => {
        return (
            file.mimeType?.includes('zip') ||
            file.mimeType?.includes('compressed') ||
            file.name?.toLowerCase().endsWith('.zip') ||
            file.name?.toLowerCase().endsWith('.rar')
        );
    };

    const getFileIcon = (file: DriveFile) => {
        if (isVideo(file)) return '🎬';
        if (isZip(file)) return '📦';
        if (file.mimeType?.includes('image')) return '🖼️';
        if (file.mimeType?.includes('audio')) return '🎵';
        return '📄';
    };

    const handleCopyDirectLink = () => {
        const fullUrl = window.location.href;
        navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    // Cerrar modal con ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPreviewVideo(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-[#070709] text-white selection:bg-nexo-lime selection:text-black font-sans">
            {/* Header de Marca */}
            <header className="border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="hover:opacity-90 transition-opacity">
                            <Logo size="md" />
                        </a>
                        <div className="h-5 w-[1px] bg-white/10 hidden sm:block"></div>
                        <span className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold hidden sm:inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-nexo-lime animate-pulse"></span>
                            Storage Vault
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href="/"
                            className="text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                            nexofilm.com ↗
                        </a>
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
                {/* Cargando */}
                {loading && (
                    <div className="py-24 text-center space-y-4">
                        <div className="w-10 h-10 border-2 border-nexo-lime border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">
                            Conectando con NexoFilm Storage...
                        </p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="max-w-xl mx-auto py-16 text-center space-y-6 bg-red-950/20 border border-red-500/20 rounded-2xl p-8">
                        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 text-2xl flex items-center justify-center mx-auto">
                            ⚠️
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                                Entrega no disponible
                            </h2>
                            <p className="text-zinc-400 text-xs max-w-md mx-auto leading-relaxed">
                                {error}
                            </p>
                        </div>
                        <a
                            href="/"
                            className="inline-block bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-lg border border-white/10 transition-all"
                        >
                            Ir a NexoFilm Inicio
                        </a>
                    </div>
                )}

                {/* Vista de Archivos */}
                {!loading && !error && (
                    <>
                        {/* Hero / Presentación de la Entrega */}
                        <div className="bg-gradient-to-b from-zinc-900/60 to-black/60 border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-nexo-lime/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                            <div className="relative z-10 space-y-4">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="bg-nexo-lime/10 text-nexo-lime text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-nexo-lime/30 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-nexo-lime"></span>
                                        Entrega Oficial Finalizada
                                    </span>
                                    {project?.company && (
                                        <span className="text-zinc-400 text-xs font-medium">
                                            para <strong className="text-zinc-200">{project.company}</strong>
                                        </span>
                                    )}
                                </div>

                                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
                                    {project?.name || 'Material Audiovisual'}
                                </h1>

                                <p className="text-zinc-400 text-xs sm:text-sm max-w-3xl leading-relaxed">
                                    Centro de previsualización y descarga oficial de <strong>NexoFilm</strong>. Podés reproducir cada pieza en alta definición en tiempo real o descargar los masters directamente a tu equipo.
                                </p>

                                {/* Banner de Privacidad, Seguridad y Botón Destacado de Compartir */}
                                <div className="pt-2">
                                    <div className="bg-black/50 border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
                                        <div className="flex items-start gap-3 flex-1">
                                            <span className="text-xl flex-shrink-0">🔒</span>
                                            <div className="text-xs text-zinc-300 space-y-1 leading-relaxed">
                                                <strong className="text-white block font-semibold text-xs sm:text-sm">
                                                    Almacenamiento Seguro para Compartir
                                                </strong>
                                                <p className="text-zinc-400 text-[11px] sm:text-xs">
                                                    Utilizá el botón <strong>"Copiar Enlace de Nexo Storage"</strong>. Este enlace exclusivo solo permite visualizar y descargar los archivos terminados. No comparte el acceso a tu portal privado.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCopyDirectLink}
                                            className="w-full md:w-auto bg-nexo-lime text-black font-extrabold uppercase tracking-widest text-[10px] sm:text-xs px-6 py-3 rounded-lg hover:bg-[#b3ff00] hover:scale-105 transition-all shadow-[0_0_15px_rgba(204,255,0,0.25)] flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                                            title="Copia el enlace directo para enviar por WhatsApp, email o pegar en el navegador"
                                        >
                                            <span>{copied ? '✓' : '🔗'}</span>
                                            <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace de Nexo Storage'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Listado de Archivos */}
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>📦</span>
                                    <span>Archivos Disponibles ({files.length})</span>
                                </h3>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('grid')}
                                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            title="Vista en cuadrícula con miniaturas"
                                        >
                                            ▦ Cuadrícula
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white/15 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            title="Vista en lista detallada"
                                        >
                                            ☰ Lista
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setSortBy(prev => prev === 'name' ? 'default' : 'name')}
                                        className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all ${sortBy === 'name' ? 'bg-nexo-lime/10 border-nexo-lime/40 text-nexo-lime' : 'bg-black/50 border-white/10 text-zinc-400 hover:text-white'}`}
                                        title="Ordenar por nombre alfabético"
                                    >
                                        A-Z {sortBy === 'name' ? '✓' : ''}
                                    </button>
                                </div>
                            </div>

                            {files.length === 0 ? (
                                <div className="text-center py-16 bg-zinc-900/20 border border-white/5 rounded-2xl space-y-3">
                                    <span className="text-3xl">📂</span>
                                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                        No se encontraron archivos en este directorio de entrega.
                                    </p>
                                </div>
                            ) : (() => {
                                const sorted = [...files].sort((a, b) => {
                                    if (sortBy === 'name') return a.name.localeCompare(b.name);
                                    return 0;
                                });

                                if (viewMode === 'list') {
                                    return (
                                        <div className="bg-black/40 border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
                                            {sorted.map((file) => {
                                                const video = isVideo(file);
                                                const zip = isZip(file);

                                                return (
                                                    <div key={file.id} className="p-3 sm:p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                                                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                            <span className="text-2xl flex-shrink-0">{getFileIcon(file)}</span>
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-bold text-xs sm:text-sm text-white truncate" title={file.name}>
                                                                    {file.name}
                                                                </h4>
                                                                {formatFileSize(file.size) && (
                                                                    <span className="text-[10px] text-zinc-500 font-mono">
                                                                        {formatFileSize(file.size)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {video && (
                                                                <button
                                                                    onClick={() => setPreviewVideo(file)}
                                                                    className="bg-white/5 hover:bg-white/15 border border-white/10 text-white font-bold text-[10px] uppercase px-3.5 py-2 rounded-lg transition-all cursor-pointer"
                                                                >
                                                                    Previsualizar
                                                                </button>
                                                            )}
                                                            <a
                                                                href={file.webContentLink || file.webViewLink || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                download={file.name}
                                                                className="bg-nexo-lime hover:bg-[#b3ff00] text-black font-extrabold text-[10px] uppercase px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(204,255,0,0.15)]"
                                                            >
                                                                <span>⬇</span>
                                                                <span>Descargar</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {sorted.map((file) => {
                                            const video = isVideo(file);
                                            const zip = isZip(file);

                                            return (
                                                <div
                                                    key={file.id}
                                                    className="bg-zinc-900/40 border border-white/10 hover:border-nexo-lime/40 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(204,255,0,0.08)] flex flex-col group"
                                                >
                                                    {/* Contenedor Visual / Miniatura */}
                                                    <div className="relative aspect-video bg-gradient-to-br from-zinc-900 via-black to-zinc-950 flex items-center justify-center overflow-hidden border-b border-white/5">
                                                        {file.thumbnailLink ? (
                                                            <img
                                                                src={file.thumbnailLink.includes('=w') || file.thumbnailLink.includes('=s') ? file.thumbnailLink : `https://lh3.googleusercontent.com/d/${file.id}=w640`}
                                                                alt=""
                                                                referrerPolicy="no-referrer"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    const target = e.currentTarget;
                                                                    if (!target.dataset.triedFallback) {
                                                                        target.dataset.triedFallback = 'true';
                                                                        target.src = `https://drive.google.com/thumbnail?id=${file.id}&sz=w640`;
                                                                    } else {
                                                                        target.style.display = 'none';
                                                                    }
                                                                }}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        ) : null}

                                                        {/* Fallback elegante si la imagen no carga o no existe */}
                                                        <div className="absolute inset-0 flex items-center justify-center text-zinc-700 pointer-events-none -z-0">
                                                            <span className="text-3xl">{getFileIcon(file)}</span>
                                                        </div>

                                                        {/* Badge de tipo */}
                                                        <span className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md text-zinc-300 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-white/10">
                                                            {file.name.split('.').pop() || 'FILE'}
                                                        </span>

                                                        {/* Botón de Play Flotante si es Video */}
                                                        {video && (
                                                            <button
                                                                onClick={() => setPreviewVideo(file)}
                                                                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-nexo-lime text-black flex items-center justify-center shadow-lg hover:scale-110 hover:bg-[#b3ff00] transition-all duration-300 cursor-pointer"
                                                                title="Reproducir video"
                                                            >
                                                                <span className="ml-1 text-base font-bold">▶</span>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Datos del Archivo */}
                                                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                                                        <div className="space-y-1.5">
                                                            <h4
                                                                className="font-bold text-xs sm:text-sm text-white group-hover:text-nexo-lime transition-colors line-clamp-2 leading-snug"
                                                                title={file.name}
                                                            >
                                                                {file.name}
                                                            </h4>
                                                            {formatFileSize(file.size) && (
                                                                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                                                                    <span>{formatFileSize(file.size)}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Acciones */}
                                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                                            {video && (
                                                                <button
                                                                    onClick={() => setPreviewVideo(file)}
                                                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-lg transition-all text-center cursor-pointer"
                                                                >
                                                                    Previsualizar
                                                                </button>
                                                            )}
                                                            <a
                                                                href={file.webContentLink || file.webViewLink || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                download={file.name}
                                                                className={`flex-1 ${
                                                                    video
                                                                        ? 'bg-nexo-lime hover:bg-[#b3ff00] text-black'
                                                                        : 'bg-nexo-lime hover:bg-[#b3ff00] text-black w-full'
                                                                } font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(204,255,0,0.15)]`}
                                                            >
                                                                <span>⬇</span>
                                                                <span>Descargar</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </>
                )}
            </main>

            {/* Modal de Previsualización de Video */}
            {previewVideo && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
                    onClick={() => setPreviewVideo(null)}
                >
                    <div
                        className="bg-zinc-950 border border-white/15 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl space-y-0 relative flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Barra Superior del Modal */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
                            <div className="space-y-0.5 max-w-[80%]">
                                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                                    {previewVideo.name}
                                </h3>
                                <p className="text-[10px] text-zinc-500 font-mono">
                                    Reproductor de Entrega NexoFilm Storage
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewVideo(null)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center text-sm transition-all cursor-pointer"
                                title="Cerrar (Esc)"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Contenedor del Reproductor */}
                        <div className="relative aspect-video bg-black flex items-center justify-center">
                            <iframe
                                src={`https://drive.google.com/file/d/${previewVideo.id}/preview`}
                                className="w-full h-full border-0"
                                allow="autoplay; fullscreen"
                                title={previewVideo.name}
                            ></iframe>
                        </div>

                        {/* Barra Inferior con Acciones de Descarga */}
                        <div className="p-4 bg-zinc-900/40 border-t border-white/10 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-400 font-mono">
                                Peso: {formatFileSize(previewVideo.size)}
                            </span>

                            <a
                                href={previewVideo.webContentLink || previewVideo.webViewLink || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={previewVideo.name}
                                className="bg-nexo-lime text-black font-extrabold uppercase tracking-wider text-[11px] px-5 py-2 rounded-lg hover:bg-[#b3ff00] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                            >
                                <span>⬇</span>
                                <span>Descargar Master</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-white/5 mt-16 py-8 text-center text-zinc-600 text-xs">
                <p>© {new Date().getFullYear()} NexoFilm — Productora Audiovisual. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
};

export default StorageDelivery;
