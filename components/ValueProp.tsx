import React from 'react';
import { useTranslation } from 'react-i18next';

const ValueProp: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-black relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-nexo-lime/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vh] bg-zinc-900/40 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/4" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center md:text-left">
          <div className="flex items-center gap-4 mb-8 justify-center md:justify-start">
            <span className="w-12 h-[1px] bg-nexo-lime/40" />
            <span className="text-nexo-lime text-[10px] font-black uppercase tracking-[0.5em]">
              {t('value_prop.badge')}
            </span>
          </div>

          <h2 className="uppercase tracking-tighter leading-[1.1] mb-12">
            <span className="font-bold text-white text-4xl md:text-7xl block mb-4">{t('value_prop.title_main')}</span>
            <span className="font-light text-nexo-lime-dark text-3xl md:text-6xl block">
              {t('value_prop.title_gradient')}
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
            <div className="space-y-6">
              <p className="text-zinc-400 text-lg md:text-xl font-light leading-relaxed">
                {t('value_prop.description')}
              </p>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex flex-col">
                  <span className="text-white font-black text-2xl tracking-tighter">15+</span>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">{t('value_prop.stats.years')}</span>
                </div>
                <div className="w-[1px] h-10 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-white font-black text-2xl tracking-tighter">500+</span>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">{t('value_prop.stats.projects')}</span>
                </div>
              </div>

              {/* CTA Secundario */}
              <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <a
                  href="#contacto"
                  className="group inline-flex items-center gap-3 bg-nexo-lime text-black font-black uppercase tracking-widest text-[11px] px-6 py-4 rounded-sm hover:bg-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(225,249,55,0.25)]"
                >
                  {t('value_prop.cta_primary')}
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
                <a
                  href={`https://wa.me/541158804711?text=${encodeURIComponent('Hola NexoFilm, quiero consultar sobre una producción.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 border border-white/10 text-white font-bold uppercase tracking-widest text-[11px] px-6 py-4 rounded-sm hover:border-nexo-lime/50 hover:text-nexo-lime transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.461l.303.18c1.597.946 3.419 1.446 5.289 1.447h.005c5.444 0 9.873-4.43 9.875-9.875 0-2.639-1.027-5.12-2.892-6.988-1.865-1.867-4.348-2.895-6.99-2.896-5.445 0-9.873 4.43-9.875 9.876-.001 2.11.539 4.161 1.564 5.948l.199.345-.996 3.641 3.729-.978zm11.233-7.236c-.3-.15-1.773-.875-2.048-.975-.275-.1-.475-.15-.675.15s-.775.975-.95 1.175-.35.225-.65.075c-.3-.15-1.267-.467-2.413-1.489-.892-.796-1.493-1.778-1.668-2.078-.175-.3-.018-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5s.05-.375-.025-.525-.675-1.625-.925-2.225c-.244-.589-.491-.51-.675-.519-.175-.009-.375-.01-.575-.01s-.525.075-.8.375c-.275.3-1.05 1.025-1.05 2.5s1.075 2.9 1.225 3.1c.15.2 2.116 3.231 5.126 4.532.715.311 1.273.497 1.708.635.719.227 1.373.195 1.89.117.577-.088 1.773-.725 2.023-1.425.25-.7.25-1.3.175-1.425-.075-.125-.275-.2-.575-.35z"/>
                  </svg>
                  {t('value_prop.cta_whatsapp')}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {[
                { title: t('value_prop.features.01.title'), desc: t('value_prop.features.01.desc') },
                { title: t('value_prop.features.02.title'), desc: t('value_prop.features.02.desc') }
              ].map((feature, i) => (
                <div key={i} className="p-8 border border-white/5 bg-zinc-900/30 backdrop-blur-sm rounded-sm hover:border-nexo-lime/30 transition-all duration-500 group">
                  <h3 className="text-white font-black uppercase tracking-tight mb-2 group-hover:text-nexo-lime transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-500 text-sm font-light">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueProp;
