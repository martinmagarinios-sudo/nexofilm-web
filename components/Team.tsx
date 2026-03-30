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
        <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="w-full md:w-1/2">
            <p className="text-nexo-lime text-[10px] font-black uppercase tracking-[0.4em] mb-4">
              {t('team.badge')}
            </p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-8">
              {t('team.title')}
            </h2>
            <p className="text-zinc-400 text-lg font-light leading-relaxed mb-12">
              {t('team.description')}
            </p>

            <div className="grid grid-cols-1 gap-8">
              {members.map((member, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-8 items-center md:items-start group">
                  <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 overflow-hidden rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700 border border-white/10 group-hover:border-nexo-lime/50">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=B4E410&color=000&size=200`;
                      }}
                    />
                  </div>
                  <div className="space-y-3 text-center md:text-left">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white group-hover:text-nexo-lime transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-nexo-lime text-[10px] font-bold uppercase tracking-[0.3em]">
                      {member.role}
                    </p>
                    <p className="text-zinc-500 text-sm font-light italic">
                      "{member.bio}"
                    </p>
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors pt-2"
                    >
                      Connect on LinkedIn
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/2 p-8 border border-white/5 bg-zinc-900/20 backdrop-blur-xl rounded-sm">
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-8 pb-4 border-b border-white/10">
              {t('team.specialists_title')}
            </h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              {[
                t('team.specialists.dp'),
                t('team.specialists.editors'),
                t('team.specialists.colorists'),
                t('team.specialists.sound'),
                t('team.specialists.vfx'),
                t('team.specialists.producers')
              ].map((spec, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-nexo-lime rounded-full" />
                  <span className="text-zinc-400 text-[11px] uppercase tracking-widest font-medium">{spec}</span>
                </div>
              ))}
            </div>
            <div className="mt-12 p-6 bg-nexo-lime/5 border border-nexo-lime/10 rounded-sm">
              <p className="text-zinc-300 text-sm font-light italic leading-relaxed">
                {t('team.culture_quote')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Team;
