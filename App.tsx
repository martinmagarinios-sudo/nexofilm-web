
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Portfolio from './components/Portfolio';
import Clients from './components/Clients';
import Testimonials from './components/Testimonials';
import Process from './components/Process';
import Contact from './components/Contact';
import Logo from './components/Logo';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import ValueProp from './components/ValueProp';
import { CONFIG } from './data/config';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent("[Ref: Web] " + t('whatsapp.prefilled'))}`;

  useEffect(() => {
    // 1. Actualizar SEO básico
    document.title = t('seo.title');
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', t('seo.description'));
    }
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', t('seo.description'));
    }
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', t('seo.description'));
    }

    // 2. Actualizar atributo lang del html
    document.documentElement.lang = i18n.language;

    // 3. Inyectar Schema.org Dinámico (Fase 4)
    const existingSchema = document.getElementById('dynamic-schema');
    if (existingSchema) existingSchema.remove();

    const schemaData = {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "VideoProductionCompany"],
      "name": "NexoFilm",
      "alternateName": "NexoFilm Productora Audiovisual",
      "url": "https://nexofilm.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://nexofilm.com/favicon.png",
        "width": 512,
        "height": 512
      },
      "image": "https://nexofilm.com/preview_whatsapp.jpg",
      "description": t('seo.description'),
      "telephone": "+541158804711",
      "email": "hola@nexofilm.com",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Buenos Aires",
        "addressRegion": "CABA",
        "addressCountry": "AR"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": -34.6037,
        "longitude": -58.3816
      },
      "areaServed": [
        { "@type": "Country", "name": "Argentina" },
        { "@type": "Country", "name": "Uruguay" },
        { "@type": "Country", "name": "Chile" },
        { "@type": "Country", "name": "Paraguay" },
        { "@type": "Country", "name": "Colombia" },
        { "@type": "Country", "name": "México" },
        { "@type": "Country", "name": "España" }
      ],
      "priceRange": "$$",
      "currenciesAccepted": "ARS, USD",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
          "opens": "09:00",
          "closes": "18:00"
        }
      ],
      "sameAs": [
        CONFIG.social.instagram,
        CONFIG.social.linkedin,
        CONFIG.social.behance
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Servicios Audiovisuales NexoFilm",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Video Corporativo e Institucional",
              "description": "Producción de video comercial y corporativo con estética cinematográfica para marcas globales."
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Fotografía Profesional y Publicitaria",
              "description": "Fotografía de producto, eventos y campañas publicitarias con calidad de alto impacto."
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Streaming en Vivo",
              "description": "Transmisiones en vivo con calidad broadcast para eventos corporativos, conferencias y presentaciones."
            }
          }
        ]
      },
      "knowsAbout": [
        "Video Corporativo", "Fotografía Publicitaria", "Streaming en Vivo",
        "Producción Audiovisual", "Cine Publicitario", "Video Institucional"
      ],
      "hasPart": CONFIG.projects.map(proj => ({
        "@type": "CreativeWork",
        "name": proj.title,
        "description": proj.description,
        "genre": proj.category,
        "author": { "@type": "Organization", "name": "NexoFilm" },
        "contentUrl": proj.videoUrl || proj.imageUrl,
        "thumbnailUrl": proj.imageUrl || "https://nexofilm.com/preview_whatsapp.jpg"
      }))
    };

    const script = document.createElement('script');
    script.id = 'dynamic-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    // 4. Inyectar etiquetas Hreflang y Canonical (Fase 3 & 4 SEO)
    const baseUrl = "https://nexofilm.com";
    const head = document.head;

    // Limpiar etiquetas previas para evitar duplicación
    const cleanup = () => {
      document.querySelectorAll('link[rel="alternate"], link[rel="canonical"], meta[property="og:locale"]').forEach(el => {
        if (!el.getAttribute('data-static')) el.remove();
      });
    };
    cleanup();

    const currentLang = i18n.language;
    const locales = ['es', 'en', 'pt'];

    // Hreflang específicos por idioma
    locales.forEach(lang => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang;
      link.href = `${baseUrl}/?lng=${lang}`;
      head.appendChild(link);
    });

    // x-default
    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = baseUrl;
    head.appendChild(xDefault);

    // Canonical dinámico
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = currentLang === 'es' ? baseUrl : `${baseUrl}/?lng=${currentLang}`;
    head.appendChild(canonical);

    // Open Graph Locale Dinámico
    const ogLocaleMap: { [key: string]: string } = { es: 'es_AR', en: 'en_US', pt: 'pt_BR' };
    const metaOgLocale = document.createElement('meta');
    metaOgLocale.setAttribute('property', 'og:locale');
    metaOgLocale.content = ogLocaleMap[currentLang] || 'es_AR';
    head.appendChild(metaOgLocale);

    // 5. Scroll suave (Anchor links)
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.hash && anchor.hash.startsWith('#')) {
        e.preventDefault();
        const targetElement = document.getElementById(anchor.hash.substring(1));
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, [t, i18n.language, i18n]);

  return (
    <div className="min-h-screen bg-black selection:bg-nexo-lime selection:text-black font-sans">
      <Navbar isMenuOpen={isMobileMenuOpen} setIsMenuOpen={setIsMobileMenuOpen} />
      <FloatingWhatsApp isHidden={isMobileMenuOpen} />

      <main>
        <Hero />
        <ValueProp />

        <section id="historia" className="py-20 md:py-32 bg-black overflow-hidden border-b border-white/5 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-[0.02] select-none">
            <span className="text-[15vw] font-extrabold uppercase tracking-tighter leading-none whitespace-nowrap">
              {t('history.background_text')}
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
                    className="relative rounded-sm shadow-2xl saturate-75 contrast-110 brightness-90 hover:saturate-100 hover:contrast-100 hover:brightness-100 transition-all duration-1000 w-full h-auto object-cover"
                  >
                    <source src={CONFIG.history.video} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    src={CONFIG.history.image}
                    alt="Equipo de producción NexoFilm durante un rodaje cinematográfico"
                    className="relative rounded-sm shadow-2xl saturate-75 contrast-110 brightness-90 hover:saturate-100 hover:contrast-100 hover:brightness-100 transition-all duration-1000 w-full h-auto object-cover"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="w-full md:w-1/2 space-y-10 text-center md:text-left">
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 bg-nexo-lime text-black text-[10px] font-bold uppercase tracking-[0.3em]">
                    {t('history.badge')}
                  </div>
                  <h2 className="text-4xl md:text-6xl font-bold leading-[1.05] uppercase tracking-tighter">
                    {t('history.title_span')} <img src="/img/logo.png" alt="NexoFilm" className="h-10 md:h-16 inline-block align-middle ml-2 -mt-2 brightness-0 invert" /> <br />
                    <span className="text-nexo-lime italic font-light">{t('history.subtitle_italic')}</span> <br />
                    {t('history.subtitle2')}
                  </h2>
                </div>

                <div className="space-y-6 text-zinc-400 leading-relaxed text-lg font-light text-center md:text-left">
                  <p>
                    {t('history.description1')}
                  </p>
                  <p>
                    {t('history.description2')}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-nexo-lime font-bold text-xl uppercase tracking-tighter">{t('history.video_badge')}</div>
                    <div className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">{t('history.video_sub')}</div>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <div className="text-nexo-lime font-bold text-xl uppercase tracking-tighter">{t('history.photo_badge')}</div>
                    <div className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">{t('history.photo_sub')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-nexo-lime font-bold text-xl uppercase tracking-tighter">{t('history.stream_badge')}</div>
                    <div className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">{t('history.stream_sub')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Process />
        <Clients />
        <Portfolio />
        <Testimonials />
        <Contact />
      </main>

      <footer className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-12 mb-16">
            <div className="space-y-3 text-center md:text-left">
              <Logo size="md" />
              <p className="text-zinc-500 text-xs font-light leading-relaxed max-w-[220px]">
                {t('footer.tagline_line1')}<br />
                <span className="text-nexo-lime font-medium">{t('footer.tagline_highlight')}</span><br />
                {t('footer.tagline_line2')}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-16 text-center md:text-left">
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-[0.4em] text-white font-bold">{t('footer.navigation')}</h4>
                <ul className="text-zinc-500 text-xs space-y-3 font-medium">
                  <li><a href="#historia" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">{t('navbar.about')}</a></li>
                  <li><a href="#portfolio" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">{t('navbar.portfolio')}</a></li>
                  <li><a href="#clientes" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">{t('navbar.clients')}</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-[0.4em] text-white font-bold">{t('footer.social')}</h4>
                <ul className="text-zinc-500 text-xs space-y-3 font-medium">
                  <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">WhatsApp</a></li>
                  <li><a href={CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">Instagram</a></li>
                  <li><a href={CONFIG.social.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">LinkedIn</a></li>
                  <li><a href={CONFIG.social.behance} target="_blank" rel="noopener noreferrer" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block">Behance</a></li>
                  <li><a href="/politica-de-privacidad" className="hover:text-nexo-lime hover:pl-2 transition-all duration-300 inline-block mt-4 text-white font-bold opacity-80">{t('footer.privacy')}</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold text-center md:text-left">
              <p>© {new Date().getFullYear()} {CONFIG.footer.copyright}</p>
              <p className="mt-1 text-[9px] text-zinc-600">Buenos Aires, Argentina · Global</p>
              <p className="mt-1 text-[9px] text-zinc-700">{t('footer.copyright_note')}</p>
            </div>
            <div className="flex gap-6 text-[10px] uppercase tracking-widest font-bold text-zinc-400">
              <a href="#portfolio" className="hover:text-nexo-lime transition-colors">{t('navbar.portfolio')}</a>
              <a href="#contacto" className="hover:text-nexo-lime transition-colors">{t('navbar.contact')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
