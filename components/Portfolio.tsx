import React, { useState } from 'react';
import { CONFIG } from '../data/config';
import ProjectCard from './ProjectCard';

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
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <span className="w-12 h-[2px] bg-nexo-lime"></span>
              <span className="text-[10px] uppercase tracking-[0.5em] text-nexo-lime font-bold">Proyectos</span>
            </div>
            <h2 className="text-4xl md:text-7xl font-bold uppercase tracking-tighter">Seleccionados</h2>
          </div>
          <p className="text-zinc-300 max-w-xl text-lg font-normal leading-relaxed mb-4 text-center md:text-left">
            Cada fotograma es una conexión única. <strong>Sumate a un equipo que hace que cada detalle cuente.</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24">
          {CONFIG.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onVideoClick={(url) => setActiveVideo(url)}
              onCopyLink={handleCopyLink}
              copiedId={copiedId}
            />
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
