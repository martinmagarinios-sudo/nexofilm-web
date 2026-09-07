import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { supabase } from '../src/lib/supabase';

const AVAILABLE_ROLES = [
  'Filmmaker / Videógrafo',
  'Fotógrafo',
  'Director de Fotografía',
  'Operador de Cámara',
  'Editor de Video',
  'Colorista',
  'Motion Graphics / 3D',
  'Piloto de Drone',
  'Creador de Contenido',
  'Creador con IA Generativa',
  'Director / Realizador',
  'Sonidista / Audio',
  'Streaming / Broadcast',
  'Productor / Asistente',
  'Otro'
];

const PROJECT_CATEGORIES = [
  'Publicidad / Comerciales',
  'Corporativo / Institucional',
  'Eventos y Convenciones',
  'Hoteles y Turismo',
  'Gastronomía',
  'Moda y Lifestyle',
  'Música / Videoclips',
  'Documental',
  'Contenido para Redes',
  'Streaming en Vivo',
  'Bodas y Sociales de Alta Gama'
];

const SOFTWARE_LIST = [
  'Premiere Pro',
  'DaVinci Resolve',
  'After Effects',
  'Photoshop',
  'Lightroom',
  'Blender',
  'Cinema 4D',
  'Unreal Engine',
  'Final Cut Pro',
  'Pro Tools / Audition',
  'CapCut'
];

const AI_TOOLS_LIST = [
  'Runway Gen-3',
  'Kling AI',
  'Midjourney',
  'Flux',
  'Luma Dream Machine',
  'Haiper / Pika',
  'ComfyUI / Stable Diffusion',
  'ElevenLabs',
  'ChatGPT / Claude'
];

const NetworkPage: React.FC = () => {
  const { t } = useTranslation();

  // Estado del Formulario
  const [fullName, setFullName] = useState('');
  const [artisticName, setArtisticName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [country, setCountry] = useState('Argentina');
  const [birthYear, setBirthYear] = useState('');

  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Filmmaker / Videógrafo']);
  const [primaryRole, setPrimaryRole] = useState('Filmmaker / Videógrafo');

  const [yearsExperience, setYearsExperience] = useState('4-6 años');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [notableClients, setNotableClients] = useState('');

  const [cameraGear, setCameraGear] = useState('');
  const [droneGear, setDroneGear] = useState('No tengo');
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]);
  const [selectedAiTools, setSelectedAiTools] = useState<string[]>([]);

  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [vimeoYoutubeUrl, setVimeoYoutubeUrl] = useState('');
  const [behanceUrl, setBehanceUrl] = useState('');
  const [reelUrl, setReelUrl] = useState('');
  const [bestLinkType, setBestLinkType] = useState('Reel / Video');
  const [bestProjectUrl, setBestProjectUrl] = useState('');

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [modalities, setModalities] = useState<string[]>(['Freelance / Por proyecto']);
  const [invoicingStatus, setInvoicingStatus] = useState('Emite factura propia (Monotributo / RI / Exterior)');
  const [willingToTravel, setWillingToTravel] = useState('Sí, a cualquier destino');
  const [bioNotes, setBioNotes] = useState('');
  const [consent, setConsent] = useState(true);

  // Honeypot anti-spam (invisible)
  const [honeypot, setHoneypot] = useState('');

  // Estados de carga y feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const toggleRole = (r: string) => {
    let next: string[];
    if (selectedRoles.includes(r)) {
      next = selectedRoles.filter(x => x !== r);
      if (next.length === 0) next = [r];
    } else {
      next = [...selectedRoles, r];
    }
    setSelectedRoles(next);
    if (!next.includes(primaryRole)) {
      setPrimaryRole(next[0] || r);
    }
  };

  const toggleProject = (p: string) => {
    setSelectedProjects(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const toggleSoftware = (s: string) => {
    setSelectedSoftware(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const toggleAiTool = (t: string) => {
    setSelectedAiTools(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const toggleModality = (m: string) => {
    setModalities(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Spam bot capturado

    if (!fullName.trim() || !email.trim() || !phone.trim() || !city.trim()) {
      setErrorMessage('Por favor completá los campos obligatorios: Nombre, Email, Teléfono/WhatsApp y Ciudad.');
      window.scrollTo({ top: 400, behavior: 'smooth' });
      return;
    }

    if (!consent) {
      setErrorMessage('Debes aceptar la autorización de conservación de datos profesionales.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setUploadProgress('Preparando datos...');

    try {
      let uploadedCvUrl = '';
      let uploadedCvFilename = '';

      // 1. Subir CV si fue seleccionado
      if (cvFile && supabase) {
        setUploadProgress('Subiendo CV en PDF de forma segura...');
        const fileExt = cvFile.name.split('.').pop() || 'pdf';
        const cleanName = cvFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `cv_${Date.now()}_${cleanName}`;

        const { error: uploadErr } = await supabase.storage
          .from('network-cvs')
          .upload(fileName, cvFile, { cacheControl: '3600', upsert: true });

        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('network-cvs')
            .getPublicUrl(fileName);
          uploadedCvUrl = publicUrl;
          uploadedCvFilename = cvFile.name;
        } else {
          console.warn('No se pudo subir el archivo al storage, se procesará sin archivo:', uploadErr.message);
        }
      }

      setUploadProgress('Evaluando perfil y portfolio con NexoFilm IA...');

      // 2. Enviar datos al backend
      const payload = {
        full_name: fullName.trim(),
        artistic_name: artisticName.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        state_province: stateProvince.trim() || null,
        country: country.trim() || 'Argentina',
        birth_year: birthYear ? parseInt(birthYear, 10) : null,
        roles: selectedRoles,
        primary_role: primaryRole,
        years_experience: yearsExperience,
        project_types: selectedProjects,
        notable_clients: notableClients.trim() || null,
        camera_gear: cameraGear.trim() || null,
        drone_gear: droneGear,
        software_tools: selectedSoftware,
        ai_tools: selectedAiTools,
        portfolio_url: portfolioUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        vimeo_youtube_url: vimeoYoutubeUrl.trim() || null,
        behance_url: behanceUrl.trim() || null,
        reel_url: reelUrl.trim() || null,
        best_link_type: bestLinkType,
        best_project_url: bestProjectUrl.trim() || null,
        cv_url: uploadedCvUrl || null,
        cv_filename: uploadedCvFilename || null,
        modalities,
        invoicing_status: invoicingStatus,
        willing_to_travel: willingToTravel,
        bio_notes: bioNotes.trim() || null,
        website_url_hp: honeypot
      };

      const res = await fetch('/api/network?action=apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al enviar tu información.');
      }

      setSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error('Error enviando formulario:', err);
      setErrorMessage(err.message || 'Error de conexión. Por favor intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-nexo-lime selection:text-black font-sans">
      
      {/* Header sobrio y consistente */}
      <header className="border-b border-white/5 bg-black/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <a href="/" className="inline-flex items-center gap-3 group">
            <Logo size="md" />
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 group-hover:text-nexo-lime transition-colors">
              / Network
            </span>
          </a>
          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            <a
              href="/"
              className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 hover:text-nexo-lime transition-colors inline-flex items-center gap-2"
            >
              <span>{t('network_page.back_home', '← Volver al inicio')}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Principal */}
      <section className="pt-16 pb-12 md:pt-24 md:pb-16 border-b border-white/5 relative overflow-hidden">
        {/* Glow de acento */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-nexo-lime/10 blur-[140px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
          <p className="text-nexo-lime text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-4">
            {t('network_page.badge', 'RED DE PROFESIONALES AUDIOVISUALES')}
          </p>

          <h1 className="uppercase tracking-tighter leading-[1.05] mb-6">
            <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap mb-2">
              <img src="/img/logo.png" alt="NexoFilm" className="h-10 md:h-16 w-auto brightness-0 invert inline-block" />
              <span className="font-light text-nexo-lime italic text-3xl md:text-6xl">NETWORK.</span>
            </div>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed mb-4">
            {t('network_page.subtitle', 'Conectamos profesionales y especialistas técnicos con producciones comerciales, cinematográficas y eventos en Argentina y el mundo.')}
          </p>

          <p className="text-[10px] md:text-[11px] text-zinc-500 uppercase tracking-widest font-semibold max-w-xl mx-auto">
            {t('network_page.roles_summary', 'Filmmakers · Fotógrafos · Editores · Pilotos de Drone · Directores de Fotografía · Creadores con IA')}
          </p>
        </div>
      </section>

      {/* Contenedor del Formulario o Éxito */}
      <main className="container mx-auto px-6 py-12 md:py-20 max-w-3xl">
        {submittedSuccess ? (
          <div className="glass p-8 md:p-14 rounded-2xl border border-nexo-lime/30 text-center shadow-2xl relative overflow-hidden animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-nexo-lime/10 border border-nexo-lime/40 text-nexo-lime flex items-center justify-center text-3xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-white mb-4">
              {t('network_page.success_title', '¡Tu perfil ya está en NexoFilm Network!')}
            </h2>
            <p className="text-zinc-300 text-sm md:text-base font-light leading-relaxed max-w-xl mx-auto mb-8">
              {t('network_page.success_p1', 'Muchas gracias, {{name}}. Nuestro equipo de producción y sistema de análisis ya han indexado tus especialidades, equipamiento y muestras de trabajo.', { name: fullName })}
            </p>
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-left text-xs text-zinc-400 space-y-2 max-w-lg mx-auto mb-8 font-light">
              <p className="text-nexo-lime font-bold uppercase tracking-[0.2em] text-[10px]">{t('network_page.success_how', '¿Cómo seguimos?')}</p>
              <p>{t('network_page.success_step1', '• Conservamos tu ficha en nuestro directorio interno de colaboradores.')}</p>
              <p>{t('network_page.success_step2', '• Cuando se active una producción o rodaje que requiera tu perfil o equipamiento, nos pondremos en contacto directo por WhatsApp o Email.')}</p>
            </div>
            <a
              href="/"
              className="inline-flex items-center justify-center px-8 py-4 rounded-sm bg-nexo-lime text-black font-black text-[11px] uppercase tracking-widest hover:bg-white hover:text-black transition-all cursor-pointer"
            >
              {t('network_page.back_home_btn', 'Volver al inicio')}
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-12">
            
            {/* Mensaje de error general */}
            {errorMessage && (
              <div className="p-4 rounded-sm bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-medium flex items-center gap-3">
                <span className="text-lg">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Campo Honeypot invisible contra bots */}
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                name="website_url_hp"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* ============================================================ */}
            {/* DATOS PROFESIONALES Y CONTACTO                               */}
            {/* ============================================================ */}
            <div className="glass p-8 md:p-10 rounded-2xl border border-white/5 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-white">
                  {t('network_page.section1_title', 'Datos de Contacto & Ubicación')}
                </h2>
                <p className="text-zinc-500 text-xs font-light mt-1">{t('network_page.section1_desc', 'Indicanos dónde estás radicado para vincularte a rodajes en tu zona o con movilidad.')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.name_label', 'Nombre y Apellido')} <span className="text-nexo-lime">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Martín García"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.artistic_name_label', 'Nombre Artístico / Comercial')} <span className="text-zinc-600 text-[10px] lowercase font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: MG Visuals"
                    value={artisticName}
                    onChange={e => setArtisticName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.email_label', 'Email Profesional')} <span className="text-nexo-lime">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tuemail@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.phone_label', 'WhatsApp / Teléfono')} <span className="text-nexo-lime">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+54 9 11 1234 5678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.city_label', 'Ciudad de Residencia')} <span className="text-nexo-lime">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Buenos Aires / Córdoba / Mendoza"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.state_label', 'Provincia / Estado')}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: CABA / Buenos Aires / Córdoba"
                    value={stateProvince}
                    onChange={e => setStateProvince(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.country_label', 'País')} <span className="text-nexo-lime">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Argentina / Uruguay / Chile / etc."
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.birth_year_label', 'Año de Nacimiento')} <span className="text-zinc-600 text-[10px] lowercase font-normal">(demográfico)</span>
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2015"
                    placeholder="Ej: 1995"
                    value={birthYear}
                    onChange={e => setBirthYear(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* ESPECIALIDADES & ROL PRINCIPAL                               */}
            {/* ============================================================ */}
            <div className="glass p-8 md:p-10 rounded-2xl border border-white/5 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-white">
                  {t('network_page.section2_title', 'Especialidades & Disciplinas')}
                </h2>
                <p className="text-zinc-500 text-xs font-light mt-1">{t('network_page.section2_desc', 'Seleccioná todas las áreas en las que te desempeñás profesionalmente.')}</p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3">
                  {t('network_page.roles_label', '¿En qué áreas trabajás?')} <span className="text-zinc-600 text-[10px] font-normal lowercase tracking-normal">{t('network_page.roles_multiple', '(selección múltiple)')}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ROLES.map(r => {
                    const isSelected = selectedRoles.includes(r);
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => toggleRole(r)}
                        className={`px-3.5 py-2 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-nexo-lime text-black border-nexo-lime font-bold shadow-sm shadow-nexo-lime/20'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.primary_role_label', '¿Cuál considerás que es tu principal especialidad?')} <span className="text-nexo-lime">*</span>
                </label>
                <select
                  value={primaryRole}
                  onChange={e => setPrimaryRole(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white"
                >
                  {selectedRoles.map(r => (
                    <option key={r} value={r} className="bg-zinc-900 text-white">
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ============================================================ */}
            {/* TRAYECTORIA Y PROYECTOS                                      */}
            {/* ============================================================ */}
            <div className="glass p-8 md:p-10 rounded-2xl border border-white/5 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-white">
                  {t('network_page.section3_title', 'Experiencia & Tipos de Proyectos')}
                </h2>
                <p className="text-zinc-500 text-xs font-light mt-1">{t('network_page.section3_desc', 'Contanos sobre tu recorrido en la industria audiovisual.')}</p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.experience_years_label', 'Años trabajando profesionalmente en audiovisual')}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {['0-1 años', '2-3 años', '4-6 años', '7-10 años', '10+ años'].map(exp => (
                    <button
                      type="button"
                      key={exp}
                      onClick={() => setYearsExperience(exp)}
                      className={`py-2 px-2 text-center text-xs rounded-md border transition-all cursor-pointer ${
                        yearsExperience === exp
                          ? 'bg-nexo-lime text-black border-nexo-lime font-bold'
                          : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3">
                  {t('network_page.project_types_label', '¿En qué tipo de producciones tenés experiencia?')} <span className="text-zinc-600 text-[10px] font-normal lowercase tracking-normal">(múltiple)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_CATEGORIES.map(cat => {
                    const isSelected = selectedProjects.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleProject(cat)}
                        className={`px-3 py-1.5 rounded-md text-xs border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-nexo-lime/15 text-nexo-lime border-nexo-lime/40 font-medium'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.notable_clients_label', 'Marcas, Clientes o Proyectos destacados en los que participaste')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Campaña para Quilmes, evento corporativo Google, documental para canal Encuentro, etc."
                  value={notableClients}
                  onChange={e => setNotableClients(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600 resize-none"
                />
              </div>
            </div>

            {/* ============================================================ */}
            {/* EQUIPAMIENTO, SOFTWARE & IA                                  */}
            {/* ============================================================ */}
            <div className="glass p-8 md:p-10 rounded-2xl border border-white/5 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-white">
                  {t('network_page.section4_title', 'Equipamiento, Software & IA')}
                </h2>
                <p className="text-zinc-500 text-xs font-light mt-1">{t('network_page.section4_desc', 'Para saber con qué herramientas contás ante cada necesidad técnica.')}</p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.gear_label', 'Cámaras, Lentes y Equipos Propios')} <span className="text-zinc-600 text-[10px] font-normal lowercase tracking-normal">(si aplica)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sony FX3, 24-70 GM II, 70-200 GM, Ronin RS3 Pro, luces Amaran..."
                  value={cameraGear}
                  onChange={e => setCameraGear(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.drone_label', '¿Tenés Drone?')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['No tengo', 'DJI Mini / Air', 'DJI Mavic 3 / Pro', 'FPV / Inspire / Otro'].map(dr => (
                    <button
                      type="button"
                      key={dr}
                      onClick={() => setDroneGear(dr)}
                      className={`py-2 px-2 text-center text-xs rounded-md border transition-all cursor-pointer ${
                        droneGear === dr
                          ? 'bg-nexo-lime text-black border-nexo-lime font-bold'
                          : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {dr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.software_label', 'Software que utilizás habitualmente')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SOFTWARE_LIST.map(soft => {
                    const isSelected = selectedSoftware.includes(soft);
                    return (
                      <button
                        type="button"
                        key={soft}
                        onClick={() => toggleSoftware(soft)}
                        className={`px-3 py-1.5 rounded-md text-xs border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-nexo-lime/15 text-nexo-lime border-nexo-lime font-medium'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{soft}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.ai_tools_label', 'Herramientas de Inteligencia Artificial que utilizás')} <span className="text-zinc-600 text-[10px] font-normal lowercase tracking-normal">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {AI_TOOLS_LIST.map(tool => {
                    const isSelected = selectedAiTools.includes(tool);
                    return (
                      <button
                        type="button"
                        key={tool}
                        onClick={() => toggleAiTool(tool)}
                        className={`px-3 py-1.5 rounded-md text-xs border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-nexo-lime text-black border-nexo-lime font-bold'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{tool}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* MUESTRAS DE TRABAJO Y PORTFOLIO                              */}
            {/* ============================================================ */}
            <div className="glass p-8 md:p-10 rounded-2xl border border-white/5 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-white">
                  {t('network_page.section5_title', 'Muestras de Trabajo & Portfolios')}
                </h2>
                <p className="text-zinc-500 text-xs font-light mt-1">{t('network_page.section5_desc', 'Compartí enlaces donde podamos ver la calidad visual y estética de tu trabajo.')}</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Portfolio Web:</span>
                  <input
                    type="url"
                    placeholder="https://tuweb.com"
                    value={portfolioUrl}
                    onChange={e => setPortfolioUrl(e.target.value)}
                    className="sm:col-span-2 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-nexo-lime font-light"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Instagram Profesional:</span>
                  <input
                    type="url"
                    placeholder="https://instagram.com/tuperfil"
                    value={instagramUrl}
                    onChange={e => setInstagramUrl(e.target.value)}
                    className="sm:col-span-2 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-nexo-lime font-light"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Vimeo / YouTube:</span>
                  <input
                    type="url"
                    placeholder="https://vimeo.com/... o youtube.com/..."
                    value={vimeoYoutubeUrl}
                    onChange={e => setVimeoYoutubeUrl(e.target.value)}
                    className="sm:col-span-2 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-nexo-lime font-light"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Behance / ArtStation:</span>
                  <input
                    type="url"
                    placeholder="https://behance.net/tuperfil"
                    value={behanceUrl}
                    onChange={e => setBehanceUrl(e.target.value)}
                    className="sm:col-span-2 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-nexo-lime font-light"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Showreel Directo:</span>
                  <input
                    type="url"
                    placeholder="https://link-a-tu-reel.com"
                    value={reelUrl}
                    onChange={e => setReelUrl(e.target.value)}
                    className="sm:col-span-2 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-nexo-lime font-light"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.best_project_label', '¿Qué trabajo de los que compartiste representa mejor lo que sabés hacer?')} <span className="text-nexo-lime">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="Pegá el link puntual al video, álbum o post que mejor define tu nivel"
                    value={bestProjectUrl}
                    onChange={e => setBestProjectUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600"
                  />
                  <p className="text-zinc-600 text-[10px] mt-1.5 font-light">{t('network_page.best_project_help', 'Nuestro sistema y equipo analizarán prioritariamente este enlace para el scoring de portfolio.')}</p>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* CV EN PDF (OPCIONAL), MODALIDAD & FACTURACIÓN                 */}
            {/* ============================================================ */}
            <div className="glass p-8 md:p-10 rounded-2xl border border-white/5 space-y-6">
              <div className="border-b border-white/5 pb-4">
                <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter text-white">
                  {t('network_page.section6_title', 'CV en PDF, Modalidad & Facturación')}
                </h2>
                <p className="text-zinc-500 text-xs font-light mt-1">{t('network_page.section6_desc', 'Completá los aspectos operativos para la coordinación de proyectos.')}</p>
              </div>

              {/* Input de archivo PDF para CV */}
              <div className="p-6 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-center relative hover:border-nexo-lime/40 transition-colors">
                <div className="text-2xl mb-2">📎</div>
                <label className="block text-xs uppercase tracking-wider text-zinc-300 font-semibold mb-1">
                  {t('network_page.attach_cv_label', 'Adjuntar CV en PDF')} <span className="text-nexo-lime text-[10px] font-normal lowercase tracking-normal">(opcional)</span>
                </label>
                <p className="text-zinc-400 text-xs font-light mb-4">
                  {t('network_page.attach_cv_desc', 'Nuestro sistema con Groq IA extraerá automáticamente clientes, cargos y trayectoria para complementar tu scoring.')}
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setCvFile(file);
                  }}
                  className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-[0.2em] file:bg-white/10 file:text-white hover:file:bg-nexo-lime hover:file:text-black cursor-pointer"
                />
                {cvFile && (
                  <p className="text-nexo-lime text-xs mt-3 font-medium">
                    ✓ Archivo seleccionado: {cvFile.name} ({(cvFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.modality_label', 'Modalidad de colaboración habitual')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Freelance / Por proyecto', 'Por jornada técnica', 'Remoto (Edición / Color / IA)', 'Presencial en set'].map(mod => {
                    const isSelected = modalities.includes(mod);
                    return (
                      <button
                        type="button"
                        key={mod}
                        onClick={() => toggleModality(mod)}
                        className={`px-3 py-1.5 rounded-md text-xs border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-nexo-lime text-black border-nexo-lime font-bold'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : ''}{mod}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.invoicing_label', 'Condición de Facturación')}
                  </label>
                  <select
                    value={invoicingStatus}
                    onChange={e => setInvoicingStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white"
                  >
                    <option value="Emite factura propia (Monotributo / RI / Exterior)" className="bg-zinc-900">Emite factura propia (Monotributo / RI / Exterior)</option>
                    <option value="Factura a través de tercero" className="bg-zinc-900">Factura a través de tercero</option>
                    <option value="A convenir según proyecto" className="bg-zinc-900">A convenir según proyecto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                    {t('network_page.travel_label', 'Disponibilidad para viajar')}
                  </label>
                  <select
                    value={willingToTravel}
                    onChange={e => setWillingToTravel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white"
                  >
                    <option value="Sí, a cualquier destino" className="bg-zinc-900">Sí, a cualquier destino</option>
                    <option value="Sí, dentro del país" className="bg-zinc-900">Sí, dentro del país</option>
                    <option value="Solo en mi provincia/ciudad" className="bg-zinc-900">Solo en mi provincia/ciudad</option>
                    <option value="Solo trabajo remoto" className="bg-zinc-900">Solo trabajo remoto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {t('network_page.bio_label', 'Breve presentación o comentarios adicionales')} <span className="text-zinc-600 text-[10px] font-normal lowercase tracking-normal">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Contanos qué tipo de producciones te motivan o cualquier detalle sobre tu perfil..."
                  value={bioNotes}
                  onChange={e => setBioNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3.5 focus:outline-none focus:border-nexo-lime transition-all font-light text-sm text-white placeholder:text-zinc-600 resize-none"
                />
              </div>

              {/* Consentimiento */}
              <div className="pt-4 border-t border-white/5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-1 accent-[#bfe023] w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="consent" className="text-xs text-zinc-400 font-light leading-relaxed cursor-pointer select-none">
                  {t('network_page.consent_text', 'Autorizo a NexoFilm a conservar mis datos profesionales y muestras de trabajo en su base interna para ser contactado ante oportunidades de colaboración en futuros proyectos.')}
                </label>
              </div>
            </div>

            {/* Estado de envío y botón final idéntico a Contact */}
            <div className="pt-4 space-y-4">
              {uploadProgress && (
                <p className="text-nexo-lime text-xs font-bold uppercase tracking-[0.2em] text-center animate-pulse">
                  {uploadProgress}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 font-bold uppercase tracking-[0.4em] text-[11px] rounded-lg transition-all shadow-xl bg-nexo-lime text-zinc-950 hover:bg-white hover:shadow-nexo-lime/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('network_page.submitting_button', 'Procesando postulación...') : t('network_page.submit_button', 'Quiero sumarme a NexoFilm Network')}
              </button>

              <p className="text-zinc-600 text-[10px] uppercase tracking-[0.25em] text-center font-bold">
                {t('network_page.data_guarantee', 'Protección de datos garantizada · Revisión técnica por directores de producción')}
              </p>
            </div>

          </form>
        )}
      </main>

      {/* Footer sobrio */}
      <footer className="border-t border-white/10 py-12 bg-black text-center text-zinc-600 text-xs font-light">
        <div className="container mx-auto px-6 space-y-2">
          <p>© {new Date().getFullYear()} NexoFilm · Red Profesional Audiovisual</p>
          <p className="text-[10px] text-zinc-700">Buenos Aires, Argentina · Alcance Global</p>
        </div>
      </footer>

    </div>
  );
};

export default NetworkPage;
