
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { CONFIG } from '../data/config';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-700 ease-in-out ${isScrolled
      ? 'bg-black/70 backdrop-blur-xl py-3 border-b border-white/5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)]'
      : 'bg-transparent py-9 border-b border-transparent'
      }`}>
      {/* Línea decorativa inferior que se expande al hacer scroll */}
      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[1px] bg-gradient-to-r from-transparent via-nexo-lime to-transparent transition-all duration-1000 ease-out ${isScrolled ? 'w-full opacity-40' : 'w-0 opacity-0'
        }`} />

      <div className="container mx-auto px-6 flex justify-between items-center relative z-20">
        <a href="#" className="hover:opacity-80 transition-all duration-500 transform active:scale-95" onClick={() => setIsMenuOpen(false)}>
          <Logo size={isScrolled ? "sm" : "md"} className="transition-all duration-500" />
        </a>

        {/* Menú de Escritorio */}
        <div className="hidden md:flex items-center space-x-10 lg:space-x-12">
          {[
            { name: 'Nosotros', href: '#historia' },
            { name: 'Portfolio', href: '#portfolio' },
            { name: 'Clientes', href: '#clientes' },
            { name: 'Opiniones', href: '#reviews' },
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

          <a
            href="#contacto"
            className={`px-8 py-2.5 text-[10px] font-black tracking-[0.4em] uppercase transition-all duration-500 rounded-sm border ${isScrolled
              ? 'bg-nexo-lime text-black border-nexo-lime hover:bg-white hover:border-white shadow-[0_0_20px_rgba(191,224,35,0.2)]'
              : 'border-white/20 text-white hover:border-nexo-lime hover:text-nexo-lime'
              }`}
          >
            Contacto
          </a>
        </div>

        {/* Botón de menú móvil estilizado */}
        <button
          className="md:hidden flex flex-col space-y-1.5 cursor-pointer p-2 group z-50 focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Menú"
        >
          <span className={`h-[1px] bg-white group-hover:bg-nexo-lime transition-all duration-300 ${isMenuOpen ? 'w-6 rotate-45 translate-y-1.5' : (isScrolled ? 'w-6' : 'w-8')}`}></span>
          <span className={`h-[1px] bg-white group-hover:bg-nexo-lime transition-all duration-300 ${isMenuOpen ? 'opacity-0' : (isScrolled ? 'w-4' : 'w-6')}`}></span>
          <span className={`h-[1px] bg-white group-hover:bg-nexo-lime transition-all duration-300 ${isMenuOpen ? 'w-6 -rotate-45 -translate-y-1.5' : (isScrolled ? 'w-6' : 'w-4')} self-end`}></span>
        </button>
      </div>

      {/* Menú Móvil Overlay */}
      <div className={`fixed inset-0 bg-black/95 backdrop-blur-3xl z-10 flex flex-col items-center justify-center transition-all duration-500 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex flex-col space-y-8 text-center">
          {[
            { name: 'Nosotros', href: '#historia' },
            { name: 'Portfolio', href: '#portfolio' },
            { name: 'Clientes', href: '#clientes' },
            { name: 'Opiniones', href: '#reviews' },
            { name: 'Contacto', href: '#contacto' },
          ].map((item, idx) => (
            <a
              key={item.name}
              href={item.href}
              className="text-2xl font-black tracking-[0.2em] uppercase text-white hover:text-nexo-lime transition-all duration-300 transform hover:scale-105"
              style={{ transitionDelay: `${idx * 100}ms` }}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.name}
            </a>
          ))}
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
