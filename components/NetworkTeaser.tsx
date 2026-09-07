import React from 'react';

const NetworkTeaser: React.FC = () => {
  return (
    <section id="network" className="py-20 md:py-28 bg-black border-t border-white/5 relative overflow-hidden font-sans">
      {/* Glow ambiental de acento sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-nexo-lime/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto rounded-xl bg-zinc-950/80 border border-white/10 p-8 md:p-14 backdrop-blur-sm text-center relative group hover:border-nexo-lime/30 transition-all duration-500 shadow-2xl">
          
          {/* Badge superior */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nexo-lime/10 border border-nexo-lime/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-nexo-lime animate-pulse"></span>
            <span className="text-nexo-lime text-[10px] md:text-[11px] font-black uppercase tracking-[0.35em]">
              NexoFilm Network
            </span>
          </div>

          {/* Título de sección */}
          <h2 className="text-2xl md:text-5xl font-bold uppercase tracking-tight text-white leading-tight mb-6">
            Conectamos talento audiovisual con <br className="hidden md:block" />
            <span className="text-nexo-lime italic font-light">grandes producciones.</span>
          </h2>

          {/* Bajada cinematográfica y sobria (sin palabras que disminuyan escala) */}
          <p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed max-w-2xl mx-auto mb-8">
            Filmmakers · Fotógrafos · Editores · Pilotos de Drone · Directores de Fotografía · Creadores con IA.
            Estamos construyendo una red de profesionales y especialistas técnicos para proyectos comerciales, cinematográficos y eventos en Argentina y el mundo.
          </p>

          {/* Botón de acción hacia /network */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/network"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-sm bg-nexo-lime text-black font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300 shadow-lg shadow-nexo-lime/10 group-hover:shadow-nexo-lime/20 cursor-pointer"
            >
              <span>Sumar mi perfil a la red</span>
              <svg className="w-4 h-4 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Micro detalle al pie */}
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-6 font-medium">
            Sin costos ni intermediarios · Proyectos puntuales y rodajes coordinados
          </p>

        </div>
      </div>
    </section>
  );
};

export default NetworkTeaser;
