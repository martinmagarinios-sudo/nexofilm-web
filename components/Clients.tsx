import React from 'react';
import { CONFIG } from '../data/config';

const Clients: React.FC = () => {
  const clients = CONFIG.clients;

  // Si no hay clientes, no renderizamos nada
  if (!clients || clients.length === 0) return null;

  return (
    <section id="clientes" className="py-24 border-y border-white/5 bg-black overflow-hidden">
      <div className="container mx-auto px-6 mb-16 text-center">
        <p className="text-nexo-lime text-[10px] font-black uppercase tracking-[0.4em] mb-4">
          Trusted Partners
        </p>
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">
          Marcas que confían
        </h2>
      </div>

      {/* Marquee Container */}
      <div className="relative w-full overflow-hidden mask-linear-gradient">
        {/*
           Gradient masks to fade out edges - optional but nice
           We can add a custom class or inline style for the mask if needed,
           but for now let's stick to the core marquee.
        */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {/* Renderizamos la lista dos veces para el efecto infinito */}
          {[...clients, ...clients].map((client, index) => (
            <div
              key={`${client.id}-${index}`}
              className="flex items-center justify-center mx-8 md:mx-16 group relative"
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-nexo-lime/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none scale-125" />

              <img
                src={client.logo}
                alt={`Logo de ${client.name}`}
                title={client.name}
                className="h-12 md:h-16 w-auto max-w-[150px] object-contain 
                           opacity-60 transition-all duration-500 ease-out
                           group-hover:opacity-100 group-hover:scale-110
                           transform translate-z-0" // Hardware acceleration hint
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </section>
  );
};

export default Clients;

