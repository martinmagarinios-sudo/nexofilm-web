
import React from 'react';
import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from '../constants';

const FloatingWhatsApp: React.FC = () => {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a 
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-[100] group flex items-center"
      aria-label="Contactar por WhatsApp"
    >
      <div className="mr-4 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Chatea con nosotros</p>
      </div>
      <div className="relative w-16 h-16 bg-nexo-lime text-black rounded-full flex items-center justify-center shadow-2xl hover-pulse transition-transform hover:scale-110 active:scale-95 duration-300 overflow-hidden">
        <svg 
          className="w-8 h-8" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.539 2.016 2.126-.54c1.029.563 2.025.873 3.162.873h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.766-5.769-5.766zm3.446 8.212c-.149.427-.853.793-1.182.844-.33.051-.739.065-1.196-.082-.321-.102-.732-.249-1.25-.472-2.189-.941-3.605-3.111-3.715-3.26-.111-.148-.901-1.189-.901-2.285 0-1.096.579-1.636.786-1.859.207-.223.452-.279.601-.279.15 0 .301.001.433.007.145.007.337-.056.527.391.197.464.673 1.636.732 1.756.06.119.098.258.02.417-.079.158-.119.258-.237.396-.118.138-.248.309-.354.415-.119.119-.244.249-.105.487.139.238.618 1.017 1.328 1.647.915.811 1.687 1.061 1.925 1.179.238.119.377.099.516-.06.138-.159.595-.694.754-.933.159-.238.317-.198.536-.119.217.079 1.373.648 1.611.767.238.119.396.178.455.277.06.101.06.58-.089 1.008z"/>
        </svg>
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </a>
  );
};

export default FloatingWhatsApp;
