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

          <h2 className="text-4xl md:text-7xl uppercase tracking-tighter leading-[1] mb-12">
            <span className="font-normal block mb-2">{t('value_prop.title_main')}</span>
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-nexo-lime to-white">
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
