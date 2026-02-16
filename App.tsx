
import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Portfolio from './components/Portfolio';
import Clients from './components/Clients';
import Testimonials from './components/Testimonials';
import Process from './components/Process';
import Contact from './components/Contact';
import Logo from './components/Logo';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import { CONFIG } from './data/config';

const App: React.FC = () => {
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;

  useEffect(() => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href')?.substring(1);
        const targetElement = document.getElementById(targetId || '');
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-black selection:bg-nexo-lime selection:text-black font-sans">
      <Navbar />
      <FloatingWhatsApp />

      <main>
        <Hero />

        <section id="historia" className="py-20 md:py-32 bg-black overflow-hidden border-b border-white/5 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-[0.02] select-none">
            <span className="text-[15vw] font-extrabold uppercase tracking-tighter leading-none whitespace-nowrap">
              CONECTAMOS HISTORIAS
            </span>
          </div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-16">
              <div className="w-full md:w-1/2 relative group">
                <div className="absolute -inset-4 bg-nexo-lime/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                {CONFIG.history.video ? (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={CONFIG.history.image}
                    aria-label="Video de presentación de NexoFilm: equipo de producción en acción"
                    className="relative rounded-sm shadow-2xl saturate-[0.7] contrast-[1.1] brightness-90 hover:saturate-100 hover:contrast-100 hover:brightness-100 transition-all duration-1000 w-full h-auto object-cover"
                  >
                    <source src={CONFIG.history.video} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    src={CONFIG.history.image}
                    alt="Equipo de producción NexoFilm durante un rodaje cinematográfico"
                    className="relative rounded-sm shadow-2xl grayscale hover:grayscale-0 transition-all duration-1000 w-full h-auto object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="w-full md:w-1/2 space-y-10">
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 bg-nexo-lime text-black text-[10px] font-bold uppercase tracking-[0.3em]">
                    Nuestra Esencia
                  </div>
                  <h2 className="text-4xl md:text-6xl font-bold leading-[1.05] uppercase tracking-tighter">
                    {CONFIG.history.title} <br />
                    <span className="text-nexo-lime italic font-light">{CONFIG.history.subtitle}</span> <br />
                    {CONFIG.history.subtitle2}
                  </h2>
                </div>

                <div className="space-y-6 text-zinc-400 leading-relaxed text-lg font-light">
                  <p>
                    {CONFIG.history.description1}
                  </p>
                  <p>
                    {CONFIG.history.description2}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-nexo-lime font-bold text-xl uppercase tracking-tighter">VIDEO 4K</div>
                    <div className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">Cinema Look</div>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <div className="text-nexo-lime font-bold text-xl uppercase tracking-tighter">HIGH RES</div>
                    <div className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">Fotografía</div>
                  </div>
                  <div className="text-center">
                    <div className="text-nexo-lime font-bold text-xl uppercase tracking-tighter">LIVE HD</div>
                    <div className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">Streaming</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Clients />
        <Portfolio />
        <Process />
        <Testimonials />
        <Contact />
      </main>

      <footer className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
            <div className="space-y-8">
              <Logo size="md" />
              <p className="text-zinc-500 max-w-sm text-sm font-light leading-relaxed">
                {CONFIG.footer.text}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-[0.4em] text-white font-bold">Navegación</h4>
                <ul className="text-zinc-500 text-xs space-y-3 font-medium">
                  <li><a href="#historia" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">Nosotros</a></li>
                  <li><a href="#portfolio" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">Trabajos</a></li>
                  <li><a href="#clientes" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">Clientes</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-[0.4em] text-white font-bold">Social</h4>
                <ul className="text-zinc-500 text-xs space-y-3 font-medium">
                  <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">WhatsApp</a></li>
                  <li><a href={CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">Instagram</a></li>
                  <li><a href={CONFIG.social.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">LinkedIn</a></li>
                  <li><a href={CONFIG.social.behance} target="_blank" rel="noopener noreferrer" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">Behance</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between gap-4">
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
              © {new Date().getFullYear()} {CONFIG.footer.copyright}
            </p>
            <div className="flex gap-6 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
              <a href="#portfolio" className="hover:text-nexo-lime transition-colors">Portfolio</a>
              <a href="#contacto" className="hover:text-nexo-lime transition-colors">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
