
import React, { useState, useEffect } from 'react';
import { HERO_SLIDES } from '../constants';

const Hero: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 8000);

    const handleScroll = () => {
      setOffsetY(window.pageYOffset);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {/* Etiqueta lateral decorativa */}
      <div className="absolute top-1/2 right-12 -translate-y-1/2 z-40 hidden lg:block rotate-90 origin-right">
        <p className="text-[9px] font-bold uppercase tracking-[0.8em] text-white/10">
          NexoFilm • Estética Cinematográfica
        </p>
      </div>

      {HERO_SLIDES.map((slide, idx) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1500 ${idx === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          {/* 1. FONDO PRINCIPAL (Parallax profundo) */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              transform: `translateY(${offsetY * 0.3}px)`,
            }}
          >
            {slide.video ? (
              <video
                autoPlay
                muted
                loop
                playsInline
                poster={slide.image}
                aria-label={`Video de fondo: ${slide.title}`}
                className="absolute inset-0 w-full h-full object-cover grayscale brightness-[0.25]"
                style={{
                  transform: `scale(${idx === current ? 1.1 : 1.2})`,
                  transition: 'transform 12s linear',
                  height: '110%',
                  top: '-5%'
                }}
              >
                <source src={slide.video} type="video/mp4" />
              </video>
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center grayscale brightness-[0.25]"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,1)), url(${slide.image})`,
                  transform: `scale(${idx === current ? 1.1 : 1.2})`,
                  transition: 'transform 12s linear',
                  height: '110%',
                  top: '-5%'
                }}
              />
            )}
          </div>

          {/* 2. CAPA DE IMÁGENES FUNDIDAS (Visuales grandes de fondo) */}
          <div className="absolute inset-0 z-0 flex items-end justify-center pointer-events-none">
            <div className="container mx-auto px-6 h-full flex items-center justify-around gap-4 opacity-30">
              {slide.gallery.map((img, i) => (
                <div
                  key={i}
                  className={`relative w-full h-[60%] overflow-hidden transition-all duration-[2000ms] ease-out ${idx === current ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-110'
                    }`}
                  style={{
                    transitionDelay: `${800 + i * 300}ms`,
                    // Efecto de máscara para fundir las imágenes con el fondo negro
                    maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
                  }}
                >
                  <img
                    src={img}
                    className="w-full h-full object-cover grayscale brightness-75"
                    alt={`${slide.title} - imagen ${i + 1} de galería NexoFilm`}
                    loading="lazy"
                  />
                  {/* Overlay de color sutil */}
                  <div className="absolute inset-0 bg-black/20"></div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. CONTENIDO (Primer plano) */}
          <div className="relative h-full container mx-auto px-6 flex flex-col justify-center items-start z-20">
            <div className="overflow-hidden mb-6">
              <p className={`text-nexo-lime uppercase tracking-[0.6em] text-[10px] font-bold transition-transform duration-1000 delay-300 ${idx === current ? 'translate-y-0' : 'translate-y-full'}`}>
                NexoFilm • Productora Audiovisual
              </p>
            </div>

            {idx === current ? (
              <h1 className="text-4xl md:text-[8rem] lg:text-[10rem] font-black mb-6 md:mb-8 leading-[0.9] md:leading-[0.85] max-w-5xl uppercase tracking-tighter mix-blend-lighten break-words">
                {slide.title.split(' ').map((word, i) => (
                  <span key={i} className={`inline-block mr-3 md:mr-6 transition-all duration-[1200ms] opacity-100 translate-y-0`} style={{ transitionDelay: `${500 + i * 150}ms` }}>
                    {word}
                  </span>
                ))}
              </h1>
            ) : (
              <div aria-hidden="true" className="text-4xl md:text-[8rem] lg:text-[10rem] font-black mb-6 md:mb-8 leading-[0.9] md:leading-[0.85] max-w-5xl uppercase tracking-tighter mix-blend-lighten break-words">
                {slide.title.split(' ').map((word, i) => (
                  <span key={i} className={`inline-block mr-3 md:mr-6 transition-all duration-[1200ms] opacity-0 translate-y-16 md:translate-y-32`} style={{ transitionDelay: `${500 + i * 150}ms` }}>
                    {word}
                  </span>
                ))}
              </div>
            )}

            <p className={`text-lg md:text-2xl text-white/60 max-w-2xl mb-12 font-light leading-relaxed transition-all duration-1000 delay-[1200ms] ${idx === current ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              {slide.subtitle}
            </p>

            <div className={`transition-all duration-1000 delay-[2000ms] ${idx === current ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <a href="#portfolio" className="group flex items-center gap-8 hover-pulse">
                <div className="relative">
                  <span className="uppercase tracking-[0.5em] text-[12px] font-black group-hover:text-nexo-lime transition-colors">Ver Portfolio</span>
                  <div className="absolute -bottom-2 left-0 w-full h-[1px] bg-white/20 group-hover:bg-nexo-lime group-hover:w-full transition-all duration-500 scale-x-50 group-hover:scale-x-100 origin-left"></div>
                </div>
                <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center group-hover:border-nexo-lime group-hover:bg-nexo-lime group-hover:text-black transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </div>
              </a>
            </div>
          </div>
        </div>
      ))}

      {/* Indicadores de Slide Minimalistas */}
      <div className="absolute bottom-12 left-6 md:left-24 flex items-center gap-10 z-40">
        <div className="flex items-center gap-3">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-1 transition-all duration-700 rounded-full ${idx === current ? 'w-12 bg-nexo-lime' : 'w-2 bg-white/10'}`}
              aria-label={`Ir a slide ${idx + 1}: ${HERO_SLIDES[idx].title}`}
            />
          ))}
        </div>
        <div className="text-[10px] font-bold text-white/20 tracking-widest uppercase">
          0{current + 1} / 0{HERO_SLIDES.length}
        </div>
      </div>
    </section>
  );
};

export default Hero;
