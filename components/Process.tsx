
import React from 'react';

const Process: React.FC = () => {
  const steps = [
    { num: '01', title: 'Planificación', desc: 'Conceptualización de narrativa, guión o plan técnico de conectividad y luces.' },
    { num: '02', title: 'Captura', desc: 'Producción en set, sesión fotográfica o despliegue de señales para vivo.' },
    { num: '03', title: 'Optimización', desc: 'Post-producción, retoque digital de imagen o monitoreo de bitrate en tiempo real.' },
    { num: '04', title: 'Nexo Final', desc: 'Entrega de una pieza de impacto o una transmisión impecable para tu audiencia.' }
  ];

  return (
    <section id="proceso" className="py-24 bg-zinc-950 overflow-hidden border-b border-white/5">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <p className="text-nexo-lime text-[10px] font-black uppercase tracking-[0.4em]">Metodología</p>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Cómo creamos el nexo</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
          <div className="hidden md:block absolute top-8 left-0 w-full h-[1px] bg-white/5" />
          {steps.map((step) => (
            <div key={step.num} className="relative z-10 group">
              <div className="w-16 h-16 bg-black border border-white/10 rounded-full flex items-center justify-center mb-6 group-hover:border-nexo-lime transition-all duration-500 group-hover:bg-nexo-lime">
                <span className="text-xl font-black text-white group-hover:text-black">{step.num}</span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-4 group-hover:text-nexo-lime transition-colors">{step.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-light">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;
