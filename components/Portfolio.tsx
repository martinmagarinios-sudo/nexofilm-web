
import React, { useState } from 'react';
import { CONFIG } from '../data/config';

const Portfolio: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="portfolio" className="py-20 md:py-32 bg-black border-b border-white/5 relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-24 gap-8">
          <div className="space-y-6 text-center md:text-left">
            <div className="flex items-center gap-4">
              <span className="w-12 h-[2px] bg-nexo-lime"></span>
              <span className="text-[10px] uppercase tracking-[0.5em] text-nexo-lime font-bold">Proyectos</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter">Seleccionados</h2>
          </div>
          <p className="text-zinc-500 max-w-sm text-sm font-light leading-relaxed mb-4 text-center md:text-left">
            Cada fotograma es una conexión única. Explorá nuestra curaduría de trabajos sincronizados desde Behance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
          {CONFIG.projects.map((project) => (
            <div
              key={project.id}
              className="group cursor-pointer"
            >
              <div
                className="relative aspect-[16/9] overflow-hidden mb-8 border border-white/5 group-hover:border-nexo-lime/30 transition-colors duration-700 outline-none focus-visible:ring-2 focus-visible:ring-nexo-lime"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (project.embedUrl) {
                      setActiveVideo(project.embedUrl);
                    } else if (project.videoUrl) {
                      setActiveVideo(project.videoUrl);
                    } else {
                      window.open(project.behanceUrl, '_blank');
                    }
                  }
                }}
                onClick={() => {
                  if (project.embedUrl) {
                    setActiveVideo(project.embedUrl);
                  } else if (project.videoUrl) {
                    setActiveVideo(project.videoUrl);
                  } else {
                    window.open(project.behanceUrl, '_blank');
                  }
                }}
                aria-label={`Ver proyecto ${project.title}`}
                onMouseEnter={(e) => {
                  const video = e.currentTarget.querySelector('video');
                  if (video) video.play();
                }}
                onMouseLeave={(e) => {
                  const video = e.currentTarget.querySelector('video');
                  if (video) { video.pause(); video.currentTime = 0; }
                }}
              >
                {project.videoUrl ? (
                  <>
                    <video
                      muted
                      playsInline
                      preload="metadata"
                      aria-label={`Vista previa del proyecto ${project.title}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    >
                      <source src={`${project.videoUrl}#t=0.5`} type="video/mp4" />
                    </video>
                  </>
                ) : (
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 group-hover:grayscale-0 grayscale"
                  />
                )}
                {/* Play button overlay */}
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-500 ${project.videoUrl ? 'opacity-100 group-hover:bg-black/60' : 'opacity-0 group-hover:opacity-100 bg-black/60'}`}>
                  <div className="w-20 h-20 border-2 border-nexo-lime rounded-full flex items-center justify-center text-nexo-lime scale-90 group-hover:scale-100 transition-all duration-500 hover:bg-nexo-lime hover:text-black">
                    {(project.embedUrl || project.videoUrl) ? (
                      <svg className="w-8 h-8 fill-current translate-x-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    ) : (
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-nexo-lime text-[9px] md:text-[10px] font-bold uppercase tracking-[0.4em] mb-3">{project.category}</p>
                  <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight group-hover:text-nexo-lime transition-colors">{project.title}</h3>
                </div>
                <div className="h-10 w-10 border border-white/10 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all mt-2 flex-shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-bold mr-2">Compartir:</span>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Mira este proyecto de Nexo Film: ${project.title} - ${project.behanceUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-nexo-lime hover:text-black transition-all duration-300"
                  title="Compartir en WhatsApp"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.461l.303.18c1.597.946 3.419 1.446 5.289 1.447h.005c5.444 0 9.873-4.43 9.875-9.875 0-2.639-1.027-5.12-2.892-6.988-1.865-1.867-4.348-2.895-6.99-2.896-5.445 0-9.873 4.43-9.875 9.876-.001 2.11.539 4.161 1.564 5.948l.199.345-.996 3.641 3.729-.978zm11.233-7.236c-.3-.15-1.773-.875-2.048-.975-.275-.1-.475-.15-.675.15s-.775.975-.95 1.175-.35.225-.65.075c-.3-.15-1.267-.467-2.413-1.489-.892-.796-1.493-1.778-1.668-2.078-.175-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525-.675-1.625-.925-2.225c-.244-.589-.491-.51-.675-.519-.175-.009-.375-.01-.575-.01s-.525.075-.8.375c-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.116 3.231 5.126 4.532.715.311 1.273.497 1.708.635.719.227 1.373.195 1.89.117.577-.088 1.773-.725 2.023-1.425.25-.7.25-1.3.175-1.425-.075-.125-.275-.2-.575-.35z" /></svg>
                </a>

                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(project.behanceUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white hover:text-black transition-all duration-300"
                  title="Compartir en LinkedIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink(project.behanceUrl, project.id);
                  }}
                  className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-nexo-lime hover:text-black transition-all duration-300"
                  title="Copiar enlace"
                >
                  {copiedId === project.id ? (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-nexo-lime text-black text-[8px] font-bold px-2 py-1 rounded-sm uppercase tracking-tighter">Copiado</span>
                  ) : null}
                  <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de Video */}
        {activeVideo && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12"
            onClick={() => setActiveVideo(null)}
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black border border-white/10 shadow-2xl rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-nexo-lime hover:text-black rounded-full transition-colors text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              {activeVideo.match(/\.(mp4|webm|ogg)$/i) ? (
                <video
                  autoPlay
                  controls
                  className="w-full h-full object-contain"
                >
                  <source src={activeVideo} type="video/mp4" />
                </video>
              ) : (
                <iframe
                  src={activeVideo}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                ></iframe>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Portfolio;
