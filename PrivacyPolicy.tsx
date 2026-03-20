import React from 'react';
import Logo from './components/Logo';
import { CONFIG } from './data/config';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-nexo-lime selection:text-black">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <header className="mb-12 flex items-center justify-between border-b border-white/10 pb-6">
          <Logo size="md" />
          <a href="/" className="text-nexo-lime hover:underline font-bold text-sm tracking-widest uppercase">Volver al inicio</a>
        </header>

        <main className="space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-tighter">Política de Privacidad</h1>
          <p className="text-sm text-zinc-500">Última actualización: 15 de Marzo de 2026</p>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-nexo-lime uppercase tracking-tight">1. Información que recopilamos</h2>
            <div className="space-y-2">
              <p>En NexoFilm, y a través de nuestro Asistente Automatizado de WhatsApp (bot), podemos recopilar la siguiente información:</p>
              <ul className="list-disc pl-6 space-y-1 text-zinc-400">
                <li>Número de teléfono (WhatsApp).</li>
                <li>Nombre de perfil público o el proporcionado directamente en la conversación.</li>
                <li>Datos específicos sobre consultas de proyectos audiovisuales (fechas, servicios requeridos).</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-nexo-lime uppercase tracking-tight">2. Uso de la información</h2>
            <div className="space-y-2">
              <p>La información recopilada a través del chat es utilizada única y exclusivamente para:</p>
              <ul className="list-disc pl-6 space-y-1 text-zinc-400">
                <li>Responder a consultas de servicios de producción de foto, video o streaming.</li>
                <li>Elaborar presupuestos a medida.</li>
                <li>Asignar un productor humano para continuar la gestión comercial.</li>
              </ul>
              <p>NexoFilm no vende ni comparte estos datos con terceros externos bajo ninguna circunstancia.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-nexo-lime uppercase tracking-tight">3. Almacenamiento y Seguridad</h2>
            <p>
              Su información (leads) es procesada temporalmente en memoria y almacenada de forma segura en bases de datos con cifrado (Supabase), a las cuales solo el personal autorizado de NexoFilm tiene acceso administrativo para el seguimiento del cliente.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-nexo-lime uppercase tracking-tight">4. Integración con Meta (API de WhatsApp Business)</h2>
            <p>
              Nuestro servicio de mensajería funciona a través de la API oficial de WhatsApp Business (plataforma de Meta). Al iniciar una conversación con nuestro número, usted también acepta las políticas de privacidad y condiciones de servicio del propio WhatsApp. Este flujo es completamente "Server-to-Server" para respuestas automatizadas iniciales.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-nexo-lime uppercase tracking-tight">5. Contacto e Inquietudes</h2>
            <p>
              Si desea eliminar sus datos de nuestra base de clientes o tiene preguntas sobre cómo procesamos su información, contáctenos escribiendo directamente a nuestro WhatsApp o a través del sitio web principal de NexoFilm.
            </p>
          </section>
        </main>
        
        <footer className="mt-20 pt-8 border-t border-white/10 text-center text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
           <p>© {new Date().getFullYear()} {CONFIG.footer.copyright}</p>
           <p className="mt-2 text-[9px] text-zinc-700">Responsable de datos: Martín Magariños - Registrado en Argentina.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
