import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'es', label: 'ES', name: 'Español' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'pt', label: 'PT', name: 'Português' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
    // Persistencia ya manejada por i18next-browser-languagedetector vía localStorage
  };

  return (
    <div className="relative z-[100]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-sm border border-white/20 bg-black/40 text-white hover:bg-nexo-lime hover:text-black hover:border-nexo-lime hover:shadow-[0_0_20px_rgba(180,228,16,0.3)] transition-all duration-500 group focus:outline-none backdrop-blur-md min-w-[70px] justify-between"
        aria-label="Cambiar idioma"
        aria-expanded={isOpen}
      >
        <span className="text-[11px] font-black tracking-widest transition-colors">
          {currentLanguage.label}
        </span>
        <svg 
          className={`w-3.5 h-3.5 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <div className={`absolute right-0 mt-2 w-32 py-2 bg-black/90 backdrop-blur-2xl border border-white/5 rounded-sm shadow-2xl transition-all duration-500 origin-top-right ${
        isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
      }`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => toggleLanguage(lang.code)}
            className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-white/5 ${
              i18n.language === lang.code ? 'text-nexo-lime' : 'text-zinc-500 hover:text-white'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
