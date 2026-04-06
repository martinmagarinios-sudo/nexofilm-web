import React from 'react';
import { useTranslation } from 'react-i18next';
import { CONFIG } from '../data/config';

const Team: React.FC = () => {
  const { t } = useTranslation();

  const members = [
    {
      name: "Martin Magariños",
      role: t('team.roles.founder'),
      image: "/img/equipo/martin.jpg", // Fallback if not exists
      linkedin: CONFIG.social.linkedin,
      bio: t('team.bios.martin')
    }
  ];

  return (
    <section id="equipo" className="py-24 bg-zinc-950 border-b border-white/5 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          <div className="w-full text-center mb-16">
            <p className="text-nexo-lime text-[10px] font-black uppercase tracking-[0.4em] mb-4">
              {t('team.badge')}
            </p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-8">
              {t('team.title')}
            </h2>
            <p className="text-zinc-400 text-lg font-light leading-relaxed max-w-2xl mx-auto">
              {t('team.description')}
            </p>
          </div>

          <div className="w-full max-w-2xl">
            {members.map((member, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-8 items-center bg-zinc-900/20 border border-white/5 p-8 rounded-sm backdrop-blur-xl group">
                <div className="w-40 h-40 shrink-0 overflow-hidden rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700 border border-white/10 group-hover:border-nexo-lime/50">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=B4E410&color=000&size=200`;
                    }}
                  />
                </div>
                <div className="space-y-4 text-center md:text-left">
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tight text-white group-hover:text-nexo-lime transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-nexo-lime text-xs font-bold uppercase tracking-[0.3em] mt-1">
                      {member.role}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-nexo-lime/5 border border-nexo-lime/10 rounded-sm">
                    <p className="text-zinc-300 text-sm font-light italic leading-relaxed">
                      "{member.bio}"
                    </p>
                  </div>
                  
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors mt-2"
                  >
                    Connect on LinkedIn
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Team;

