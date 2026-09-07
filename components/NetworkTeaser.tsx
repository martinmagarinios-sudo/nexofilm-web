import React from 'react';
import { useTranslation } from 'react-i18next';

const NetworkTeaser: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="network" className="py-24 md:py-32 bg-black border-t border-white/5 relative overflow-hidden font-sans">
      {/* Elementos decorativos de fondo idénticos a ValueProp */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-nexo-lime/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vh] bg-zinc-900/40 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/4" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center md:text-left">
          
          {/* Badge de sección idéntico al resto de la web (texto puro en verde lima sin cápsula) */}
          <p className="text-nexo-lime text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-4">
            {t('network_teaser.badge', 'NEXOFILM NETWORK')}
          </p>

          {/* Título con la tipografía e interlineado exacto de NexoFilm */}
          <h2 className="uppercase tracking-tighter leading-[1.05] mb-12">
            <span className="font-bold text-white text-4xl md:text-7xl block mb-3">
              {t('network_teaser.title_line1', 'CONECTAMOS TALENTO AUDIOVISUAL CON')}
            </span>
            <span className="font-light text-nexo-lime italic text-3xl md:text-6xl block">
              {t('network_teaser.title_line2', 'GRANDES PRODUCCIONES.')}
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
            <div className="space-y-6">
              <p className="text-zinc-400 text-lg md:text-xl font-light leading-relaxed">
                {t('network_teaser.description', 'Filmmakers · Fotógrafos · Editores · Pilotos de Drone · Directores de Fotografía · Creadores con IA. Estamos construyendo una red de profesionales y especialistas técnicos para proyectos comerciales, cinematográficos y eventos en Argentina y el mundo.')}
              </p>

              {/* Botón idéntico al de ValueProp */}
              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a
                  href="/network"
                  className="group inline-flex items-center gap-3 bg-nexo-lime text-black font-black uppercase tracking-widest text-[11px] px-8 py-4 rounded-sm hover:bg-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(225,249,55,0.25)] cursor-pointer"
                >
                  <span>{t('network_teaser.cta', 'Sumar mi perfil a la red')}</span>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Ficha lateral glass */}
            <div className="glass p-8 md:p-10 rounded-2xl space-y-4 border border-white/5">
              <div className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold">
                {t('network_teaser.card_title', 'MODALIDAD DE TRABAJO')}
              </div>
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                {t('network_teaser.card_desc', 'Sin intermediarios ni cargos fijos. Convocamos y coordinamos equipos a medida según las necesidades técnicas, equipamiento y locación de cada proyecto.')}
              </p>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">
                <span>{t('network_teaser.card_location', 'Buenos Aires · Latam · Global')}</span>
                <span className="text-nexo-lime">{t('network_teaser.card_tag', 'Por Proyecto')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default NetworkTeaser;
