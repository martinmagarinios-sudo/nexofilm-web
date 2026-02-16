
import React, { useState } from 'react';
import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from '../constants';
import { CONFIG } from '../data/config';

const Contact: React.FC = () => {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('sending');
    const formData = new FormData(e.currentTarget);
    try {
      // Formspree: servicio gratuito para envío de formularios
      const response = await fetch('https://formspree.io/f/mpqjdrdy', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        setFormStatus('sent');
        (e.target as HTMLFormElement).reset();
      } else {
        setFormStatus('error');
      }
    } catch {
      setFormStatus('error');
    }
  };

  return (
    <section id="contacto" className="py-24 bg-zinc-950 border-t border-white/5">
      <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-20">
        <div>
          <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter mb-12 leading-[1] text-white">Conecta con Nexo.</h2>
          <div className="space-y-8">
            <div>
              <p className="text-zinc-500 uppercase tracking-[0.4em] text-[10px] font-bold mb-2">Escríbenos</p>
              <a href="mailto:hola@nexofilm.com" className="text-2xl font-light hover:text-nexo-lime transition-colors">hola@nexofilm.com</a>
            </div>

            <div className="pt-4">
              <p className="text-zinc-500 uppercase tracking-[0.4em] text-[10px] font-bold mb-6">En redes</p>
              <div className="flex gap-6">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center hover:bg-nexo-lime hover:text-zinc-950 hover:-translate-y-1.5 transition-all duration-300 group shadow-lg hover:shadow-nexo-lime/20"
                  title="WhatsApp"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.539 2.016 2.126-.54c1.029.563 2.025.873 3.162.873h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.766-5.769-5.766zm3.446 8.212c-.149.427-.853.793-1.182.844-.33.051-.739.065-1.196-.082-.321-.102-.732-.249-1.25-.472-2.189-.941-3.605-3.111-3.715-3.26-.111-.148-.901-1.189-.901-2.285 0-1.096.579-1.636.786-1.859.207-.223.452-.279.601-.279.15 0 .301.001.433.007.145.007.337-.056.527.391.197.464.673 1.636.732 1.756.06.119.098.258.02.417-.079.158-.119.258-.237.396-.118.138-.248.309-.354.415-.119.119-.244.249-.105.487.139.238.618 1.017 1.328 1.647.915.811 1.687 1.061 1.925 1.179.238.119.377.099.516-.06.138-.159.595-.694.754-.933.159-.238.317-.198.536-.119.217.079 1.373.648 1.611.767.238.119.396.178.455.277.06.101.06.58-.089 1.008z" /></svg>
                </a>
                <a href={CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center hover:bg-nexo-lime hover:text-zinc-950 hover:-translate-y-1.5 transition-all duration-300 font-bold text-[10px] uppercase shadow-lg hover:shadow-nexo-lime/20" title="Instagram">Ig</a>
                <a href={CONFIG.social.behance} target="_blank" rel="noopener noreferrer" className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center hover:bg-nexo-lime hover:text-zinc-950 hover:-translate-y-1.5 transition-all duration-300 font-bold text-[10px] uppercase shadow-lg hover:shadow-nexo-lime/20" title="Behance">Be</a>
                <a href={CONFIG.social.linkedin} target="_blank" rel="noopener noreferrer" className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center hover:bg-nexo-lime hover:text-zinc-950 hover:-translate-y-1.5 transition-all duration-300 font-bold text-[10px] uppercase shadow-lg hover:shadow-nexo-lime/20" title="LinkedIn">Li</a>
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-10 rounded-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="contact-name" className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold">Nombre</label>
                <input id="contact-name" name="name" type="text" required className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-nexo-lime transition-all font-light" placeholder="Escribe tu nombre..." />
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-email" className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold">Email</label>
                <input id="contact-email" name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-nexo-lime transition-all font-light" placeholder="tu@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-project" className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold">Tipo de Proyecto</label>
              <select id="contact-project" name="project_type" className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-nexo-lime transition-all appearance-none text-zinc-300 font-light">
                <option>Video Comercial / Publicidad</option>
                <option>Streaming</option>
                <option>Fotografía de Producto/Moda</option>
                <option>Contenido para Redes</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-message" className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 font-bold">Tu Mensaje</label>
              <textarea id="contact-message" name="message" required className="w-full bg-white/5 border border-white/10 rounded-lg p-4 focus:outline-none focus:border-nexo-lime transition-all h-32 resize-none text-zinc-200 placeholder:text-zinc-700 font-light" placeholder="Cuéntanos un poco sobre tu idea..."></textarea>
            </div>
            <button
              type="submit"
              disabled={formStatus === 'sending'}
              className={`w-full py-5 font-bold uppercase tracking-[0.4em] text-[11px] rounded-lg transition-all shadow-xl ${formStatus === 'sent'
                ? 'bg-green-500 text-white'
                : 'bg-nexo-lime text-zinc-950 hover:bg-white hover:shadow-nexo-lime/20'
                }`}
            >
              {formStatus === 'idle' && 'Iniciar el Nexo'}
              {formStatus === 'sending' && 'Enviando...'}
              {formStatus === 'sent' && '¡Mensaje Enviado! ✓'}
              {formStatus === 'error' && 'Error — Intenta de nuevo'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
