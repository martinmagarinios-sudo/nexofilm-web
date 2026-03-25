
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { CONFIG } from '../data/config';

interface NavbarProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ isMenuOpen, setIsMenuOpen }) => {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Usamos un umbral de 30px para que la transición se sienta inmediata pero suave
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bloquear scroll cuando el menú está abierto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  return (
    <nav className={`fixed top-0 left-0 w-full z-[1000] transition-all duration-700 ease-in-out ${isScrolled
      ? 'bg-black/70 backdrop-blur-xl py-3 border-b border-white/5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)]'
      : 'bg-transparent py-9 border-b border-transparent'
      }`}>
      {/* Línea decorativa inferior que se expande al hacer scroll */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] bg-gradient-to-r from-transparent via-nexo-lime to-transparent transition-all duration-1000 ease-out ${isScrolled ? 'w-full opacity-40' : 'w-0 opacity-0'
        }`} />

      <div className="container mx-auto px-6 flex justify-between items-center relative z-20">
        <button 
          className="hover:opacity-80 transition-all duration-500 transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-nexo-lime rounded-sm" 
          onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMenuOpen(false); }}
          aria-label={t('navbar.about')}
        >
          <Logo size={isScrolled ? "sm" : "md"} className="transition-all duration-500" />
        </button>

        {/* Menú de Escritorio */}
        <div className="hidden md:flex items-center space-x-10 lg:space-x-12">
          {[
            { name: t('navbar.about'), href: '#historia' },
            { name: t('navbar.portfolio'), href: '#portfolio' },
            { name: t('navbar.clients'), href: '#clientes' },
            { name: t('navbar.reviews'), href: '#reviews' },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-[10px] font-black tracking-[0.4em] uppercase text-zinc-400 hover:text-white transition-all duration-300 relative group whitespace-nowrap"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-nexo-lime transition-all duration-300 group-hover:w-full opacity-50"></span>
            </a>
          ))}

          <div className="flex items-center gap-2">
            <a
              href="#contacto"
              className={`px-8 py-2.5 text-[10px] font-black tracking-[0.4em] uppercase transition-all duration-500 rounded-sm border ${isScrolled
                ? 'bg-nexo-lime text-black border-nexo-lime hover:bg-white hover:border-white shadow-[0_0_20px_rgba(191,224,35,0.2)]'
                : 'border-white/20 text-white hover:border-nexo-lime hover:text-nexo-lime'
                }`}
            >
              {t('navbar.contact')}
            </a>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Botón de menú móvil estilizado */}
        <button
          className="md:hidden flex flex-col space-y-1.5 cursor-pointer p-2 group z-50 focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={t('navbar.contact')}
        >
          <span className={`h-[1px] bg-white group-hover:bg-nexo-lime transition-all duration-300 ${isMenuOpen ? 'w-6 rotate-45 translate-y-1.5' : (isScrolled ? 'w-6' : 'w-8')}`}></span>
          <span className={`h-[1px] bg-white group-hover:bg-nexo-lime transition-all duration-300 ${isMenuOpen ? 'opacity-0' : (isScrolled ? 'w-4' : 'w-6')}`}></span>
          <span className={`h-[1px] bg-white group-hover:bg-nexo-lime transition-all duration-300 ${isMenuOpen ? 'w-6 -rotate-45 -translate-y-1.5' : (isScrolled ? 'w-6' : 'w-4')} self-end`}></span>
        </button>
      </div>

      {/* Menú Móvil Overlay - Fondo negro sólido para que sea la PANTALLA PRINCIPAL al abrirse */}
      <div className={`fixed inset-0 bg-black z-[110] flex flex-col items-center justify-start pt-32 transition-all duration-200 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex flex-col space-y-8 text-center w-full px-6">
          {[
            { name: t('navbar.about'), href: '#historia' },
            { name: t('navbar.portfolio'), href: '#portfolio' },
            { name: t('navbar.clients'), href: '#clientes' },
            { name: t('navbar.reviews'), href: '#reviews' },
            { name: t('navbar.contact'), href: '#contacto' },
          ].map((item, idx) => (
            <a
              key={item.name}
              href={item.href}
              className="text-xl font-bold tracking-[0.3em] uppercase text-zinc-400 hover:text-white transition-all duration-300"
              style={{ transitionDelay: `${idx * 50}ms` }}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.name}
            </a>
          ))}
          
          {/* Selector de Idioma Simple para Móvil (botones directos) */}
          <div className="pt-10 border-t border-white/5 w-full flex flex-col items-center gap-6">
            <div className="flex gap-4 justify-center items-center">
              {[
                { code: 'es', label: 'ES' },
                { code: 'en', label: 'EN' },
                { code: 'pt', label: 'PT' }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { 
                    i18n.changeLanguage(lang.code); 
                    // Salida inmediata
                    setIsMenuOpen(false); 
                  }}
                  className={`text-[10px] font-black tracking-widest px-4 py-2 transition-all duration-300 rounded-sm border ${
                    i18n.language === lang.code 
                      ? 'text-nexo-lime border-nexo-lime/40 bg-nexo-lime/5' 
                      : 'text-zinc-500 border-white/5 hover:border-white/20'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 text-center">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">Social</p>
          <div className="flex gap-6 justify-center">
            <a href={CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-nexo-lime">Instagram</a>
            <a href={CONFIG.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-nexo-lime">LinkedIn</a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
