
import React, { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../data/config';

const Testimonials: React.FC = () => {
  const testimonials = CONFIG.testimonials;
  const totalSlides = testimonials.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Número de cards visibles según breakpoint
  const getVisibleCount = () => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth >= 768) return 3;
    return 1;
  };

  const [visibleCount, setVisibleCount] = useState(getVisibleCount);

  useEffect(() => {
    const handleResize = () => setVisibleCount(getVisibleCount());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, totalSlides - visibleCount);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Auto-rotación cada 5 segundos (se pausa al hacer hover)
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [goNext, isHovered]);

  // Calcular dots (páginas)
  const totalDots = maxIndex + 1;

  return (
    <section id="reviews" className="py-24 bg-zinc-900/50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center mb-16">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
            <span className="text-zinc-500 uppercase tracking-[0.4em] text-[10px] font-black">Feedback Profesional</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-center max-w-3xl leading-[1.1]">Lo que dicen nuestros clientes</h2>
        </div>

        {/* Carousel Container */}
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Flechas de navegación */}
          <button
            onClick={goPrev}
            className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-nexo-lime/30 transition-all duration-300"
            aria-label="Anterior"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={goNext}
            className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-nexo-lime/30 transition-all duration-300"
            aria-label="Siguiente"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>

          {/* Carousel Track */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`,
              }}
            >
              {testimonials.map((testi) => (
                <div
                  key={testi.id}
                  className="flex-shrink-0 px-3"
                  style={{ width: `${100 / visibleCount}%` }}
                >
                  <div className="glass p-8 rounded-xl flex flex-col justify-between hover:border-white/20 transition-all duration-300 group h-full">
                    <div>
                      <div className="flex items-center gap-4 mb-6">
                        <img src={testi.avatar} alt={testi.author} className="w-12 h-12 rounded-full border border-white/10 object-cover" loading="lazy" />
                        <div>
                          <h4 className="font-black uppercase tracking-tight text-nexo-lime group-hover:text-white transition-colors">{testi.author}</h4>
                          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{testi.role} @ {testi.company}</p>
                        </div>
                      </div>
                      <p className="text-zinc-300 font-light italic mb-8 leading-relaxed text-lg">"{testi.text}"</p>
                    </div>
                    <a
                      href={testi.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-zinc-500 hover:text-white uppercase tracking-[0.3em] flex items-center gap-2 group/link border-t border-white/5 pt-4"
                    >
                      Ver Recomendación en LinkedIn
                      <svg className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots de navegación */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalDots }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex
                  ? 'w-8 bg-nexo-lime'
                  : 'w-3 bg-white/20 hover:bg-white/40'
                  }`}
                aria-label={`Ir a slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
