import React, { useState, useEffect } from 'react';

interface BudgetItem {
    description: string;
    quantity: number;
    unit_price: number;
}

interface Budget {
    id: string;
    items: BudgetItem[];
    total_price: number;
    payment_terms: string;
    client_feedback: string | null;
}

interface Project {
    id: string;
    client_name: string;
    client_email: string;
    title: string;
    status: 'draft' | 'sent' | 'review' | 'approved' | 'rejected' | 'production' | 'delivered';
    event_date: string | null;
    event_time: string | null;
    location: string | null;
    coverage_types: string[] | null;
    coverage_hours: number | null;
    bank_details: string | null;
    invoice_url: string | null;
    invoice_type: 'total' | 'deposit_50' | 'custom' | null;
    invoice_amount: number | null;
    client_phone?: string | null;
    notification_preference?: 'both' | 'email' | 'whatsapp' | null;
    guests_count?: number | null;
    client_billing_info?: string | null;
    client_notes?: string | null;
}

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    webViewLink: string;
    thumbnailLink: string | null;
    webContentLink: string | null;
    size: string | null;
}

const ClientPortal: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [budget, setBudget] = useState<Budget | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Especificaciones Form
    const [projectTitle, setProjectTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [location, setLocation] = useState('');
    const [coverageHours, setCoverageHours] = useState<number>(4);
    const [coverageTypes, setCoverageTypes] = useState<string[]>([]);
    const [guestsCount, setGuestsCount] = useState<number | ''>('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [notificationPref, setNotificationPref] = useState<'both' | 'email' | 'whatsapp'>('both');
    const [isEditingSpecs, setIsEditingSpecs] = useState(false);
    
    // Estados adicionales de facturación y observaciones
    const [billingInfo, setBillingInfo] = useState('');
    const [noteText, setNoteText] = useState('');
    const [sendingAction, setSendingAction] = useState(false);

    // Acciones de presupuesto
    const [feedbackText, setFeedbackText] = useState('');
    const [actionView, setActionView] = useState<'normal' | 'feedback' | 'reject'>('normal');

    // Drive Bridge
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [loadingDrive, setLoadingDrive] = useState(false);
    const [driveError, setDriveError] = useState('');

    // Extraer token de la URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tok = urlParams.get('token');
        if (tok) {
            setToken(tok);
        } else {
            setError('Token de acceso no encontrado. Por favor, verificá el enlace que te envió el productor.');
            setLoading(false);
        }
    }, []);

    // Cargar datos del proyecto
    useEffect(() => {
        if (token) {
            fetchPortalData();
        }
    }, [token]);

    // Cargar archivos de drive si está en modo entregado
    useEffect(() => {
        if (project && project.status === 'delivered') {
            fetchDriveFiles();
        }
    }, [project]);

    const fetchPortalData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/comercial/client-portal?token=${token}`, {
                headers: { 'x-client-token': token || '' }
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Falla al conectar con el servidor');
            }

            setProject(data.project);
            setBudget(data.budget);
            
            // Cargar specs si existen
            if (data.project) {
                setProjectTitle(data.project.title || '');
                setEventDate(data.project.event_date || '');
                setEventTime(data.project.event_time || '');
                setLocation(data.project.location || '');
                setCoverageHours(data.project.coverage_hours || 4);
                setCoverageTypes(data.project.coverage_types || []);
                setGuestsCount(data.project.guests_count || '');
                setClientPhone(data.project.client_phone || '');
                setClientEmail(data.project.client_email || '');
                setNotificationPref(data.project.notification_preference || 'both');
                setBillingInfo(data.project.client_billing_info || '');
                setNoteText(data.project.client_notes || '');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al validar credenciales');
        } finally {
            setLoading(false);
        }
    };

    const fetchDriveFiles = async () => {
        setLoadingDrive(true);
        setDriveError('');
        try {
            const res = await fetch(`/api/comercial/drive-bridge?token=${token}`, {
                headers: { 'x-client-token': token || '' }
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'No se pudieron recuperar las entregas');
            }

            setDriveFiles(data.files || []);
        } catch (err: any) {
            console.error(err);
            setDriveError(err.message);
        } finally {
            setLoadingDrive(false);
        }
    };

    // Enviar especificaciones refinadas
    const handleUpdateSpecifications = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/comercial/client-action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({
                    token,
                    action: 'update_specifications',
                    specifications: {
                        title: projectTitle,
                        event_date: eventDate,
                        event_time: eventTime,
                        location,
                        coverage_types: coverageTypes,
                        coverage_hours: coverageHours,
                        client_phone: clientPhone,
                        client_email: clientEmail,
                        notification_preference: notificationPref,
                        guests_count: guestsCount === '' ? null : Number(guestsCount),
                        client_notes: noteText
                    }
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar datos');

            setSuccessMsg('¡Especificaciones enviadas correctamente! El productor revisará los datos para confeccionar tu propuesta.');
            setIsEditingSpecs(false);
            fetchPortalData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitBillingInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setSendingAction(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/client-action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({
                    token,
                    action: 'submit_billing_info',
                    billing_info: billingInfo
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar datos de facturación');

            setSuccessMsg('¡Datos de facturación cargados correctamente! El productor procederá a confeccionar tu factura.');
            fetchPortalData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSendingAction(false);
        }
    };

    const handleSubmitNotes = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        setSendingAction(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/client-action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({
                    token,
                    action: 'submit_notes',
                    notes: noteText
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar la consulta');

            setSuccessMsg('¡Tu consulta ha sido enviada con éxito! El productor ha sido notificado.');
            setNoteText('');
            fetchPortalData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSendingAction(false);
        }
    };

    const handleRequestNewProject = async () => {
        if (!window.confirm('¿Estás seguro de que querés solicitar un nuevo presupuesto? Se creará una nueva propuesta borrador vinculada a tus datos.')) {
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/client-action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({
                    token,
                    action: 'request_new_project'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al solicitar nuevo presupuesto');

            if (data.redirectToken) {
                // Redirigir al nuevo portal
                window.location.search = `?token=${data.redirectToken}`;
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Aprobar Presupuesto
    const handleApproveBudget = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/comercial/client-action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({ token, action: 'approve' })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al aprobar presupuesto');

            setSuccessMsg('¡Presupuesto Aprobado con éxito! Gracias por confiar en NexoFilm. En breve nos pondremos en contacto.');
            fetchPortalData();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Solicitar Modificaciones / Cambios
    const handleFeedbackBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedbackText.trim()) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/comercial/client-action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({ 
                    token, 
                    action: 'feedback', 
                    client_feedback: feedbackText 
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar comentarios');

            setSuccessMsg('Tus comentarios han sido enviados al productor para modificar la propuesta.');
            setActionView('normal');
            setFeedbackText('');
            fetchPortalData();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Rechazar Presupuesto
    const handleRejectBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/comercial/client-action', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({ 
                    token, 
                    action: 'reject', 
                    client_feedback: feedbackText || 'Rechazado' 
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al procesar acción');

            setSuccessMsg('Propuesta comercial finalizada como rechazada.');
            setActionView('normal');
            setFeedbackText('');
            fetchPortalData();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const toggleCoverageType = (type: string) => {
        if (coverageTypes.includes(type)) {
            setCoverageTypes(coverageTypes.filter(t => t !== type));
        } else {
            setCoverageTypes([...coverageTypes, type]);
        }
    };

    const formatBytes = (bytesStr: string | null) => {
        if (!bytesStr) return '';
        const bytes = parseInt(bytesStr);
        if (isNaN(bytes)) return '';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // --- PANTALLA DE CARGA ---
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
                <div className="space-y-4 text-center">
                    <img src="/img/logo.png" alt="NexoFilm" className="h-10 mx-auto brightness-0 invert animate-pulse" />
                    <div className="w-16 h-0.5 bg-nexo-lime mx-auto rounded overflow-hidden">
                        <div className="w-full h-full bg-white translate-x-[-100%] animate-[translateX_1.5s_infinite]"></div>
                    </div>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium">Validando Sesión Comercial...</p>
                </div>
            </div>
        );
    }

    // --- PANTALLA DE ERROR ---
    if (error && !project) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-8 rounded-xl space-y-6 shadow-2xl">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-3xl">
                        ⚠️
                    </div>
                    <h2 className="text-white text-xl font-bold">Error de Conexión</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        {error}
                    </p>
                    <div className="border-t border-white/5 pt-4">
                        <p className="text-zinc-500 text-xs">
                            Si el problema persiste, contactanos directamente a <br />
                            <a href="mailto:hola@nexofilm.com" className="text-nexo-lime hover:underline font-bold">hola@nexofilm.com</a>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!project) return null;

    // Colores de estado
    const statusTrackers = [
        { key: 'draft', label: 'Especificaciones', active: ['draft', 'review', 'sent', 'approved', 'rejected', 'production', 'delivered'] },
        { key: 'sent', label: 'Presupuesto', active: ['sent', 'approved', 'production', 'delivered'] },
        { key: 'approved', label: 'Facturación / Pago', active: ['approved', 'production', 'delivered'] },
        { key: 'production', label: 'Rodaje / Edición', active: ['production', 'delivered'] },
        { key: 'delivered', label: 'Entrega Material', active: ['delivered'] }
    ];

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-nexo-lime selection:text-black">
            
            {/* Header de Portal Seguro */}
            <header className="border-b border-white/5 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/img/logo.png" alt="NexoFilm" className="h-6 brightness-0 invert" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <span>🔒 Portal Seguro</span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 max-w-4xl space-y-8">
                
                {/* Alertas */}
                {successMsg && (
                    <div className="bg-nexo-lime/10 border border-nexo-lime/20 text-nexo-lime p-4 rounded-lg flex items-start gap-3">
                        <span className="text-lg">✓</span>
                        <p className="text-sm font-medium">{successMsg}</p>
                    </div>
                )}

                {/* Banner de Bienvenida Premium */}
                <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-nexo-lime/20 p-6 md:p-8 rounded-xl shadow-[0_0_30px_rgba(204,255,0,0.03)] relative overflow-hidden no-print">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-nexo-lime/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-nexo-lime/10 text-nexo-lime border border-nexo-lime/25 rounded-md text-[10px] font-black uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-nexo-lime animate-pulse"></span>
                                Portal de Autogestión Comercial
                            </div>
                            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight uppercase">
                                ¡Bienvenido a NexoFilm, <span className="text-nexo-lime">{project.client_name}</span>!
                            </h2>
                            {project.status === 'draft' ? (
                                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                    Hemos diseñado este espacio privado y seguro para gestionar tu propuesta. Para comenzar, por favor <strong>completá el Formulario de Especificaciones</strong> a continuación con los datos de tu evento o producción. Con esta información, nuestro equipo podrá confeccionar una cotización comercial a tu medida.
                                </p>
                            ) : project.status === 'review' ? (
                                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                    Ya recibimos tus especificaciones. Nuestro equipo de producción está elaborando la propuesta comercial adaptada a tus necesidades. Te notificaremos de manera automática en cuanto el presupuesto esté listo para ser revisado y aprobado en este mismo portal.
                                </p>
                            ) : project.status === 'sent' ? (
                                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                    ¡Tu propuesta comercial ya está disponible! A continuación podés <strong>revisar el desglose del presupuesto</strong>, descargar el PDF para su presentación interna, y decidir si deseas aprobarlo o solicitar modificaciones con tus comentarios directamente desde aquí.
                                </p>
                            ) : project.status === 'approved' ? (
                                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                    ¡Presupuesto aprobado! Muchas gracias por confiar en NexoFilm. Para avanzar con la producción y la facturación, por favor <strong>completá los datos de facturación</strong> solicitados abajo para que podamos emitir el comprobante correspondiente.
                                </p>
                            ) : project.status === 'production' ? (
                                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                    ¡Estamos en etapa de producción! Nuestro equipo está trabajando en el rodaje, cobertura o edición de tu proyecto. Podés seguir el estado desde esta barra de progreso y, una vez finalizado el material, estará disponible para su descarga en este portal.
                                </p>
                            ) : project.status === 'delivered' ? (
                                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                    ¡Tu material audiovisual ya está listo y entregado! Podés acceder y <strong>descargar todas las entregas finales</strong> y archivos desde el panel de entregas seguro que ves a continuación.
                                </p>
                            ) : (
                                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                    Portal de autogestión comercial seguro de NexoFilm. Si tenés dudas o querés solicitar una nueva cotización, podés escribirnos en la caja de consultas o hacer click en el botón de solicitar nuevo presupuesto.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- SECCIÓN TITULO Y PROGRESS BAR --- */}
                <div className="bg-zinc-900/30 border border-white/5 p-6 md:p-8 rounded-xl space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-zinc-500 text-[10px] uppercase tracking-widest font-black">Cliente: {project.client_name}</h2>
                        <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tighter text-white">{project.title}</h1>
                    </div>

                    {/* Barra de progreso de estados */}
                    {project.status !== 'rejected' && (
                        <div className="border-t border-white/5 pt-6">
                            <div className="grid grid-cols-5 gap-2 text-center">
                                {statusTrackers.map((track, i) => {
                                    const isDone = track.active.includes(project.status);
                                    return (
                                        <div key={i} className="space-y-2">
                                            <div className={`h-1 rounded-full transition-colors ${isDone ? 'bg-nexo-lime shadow-[0_0_8px_rgba(204,255,0,0.5)]' : 'bg-zinc-800'}`}></div>
                                            <span className={`block text-[8px] md:text-[10px] uppercase tracking-wider font-bold transition-colors ${isDone ? 'text-nexo-lime' : 'text-zinc-500'}`}>
                                                {track.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Resumen de especificaciones del evento (Para estados posteriores a Draft/Review) */}
                    {project.status !== 'draft' && project.status !== 'review' && (project.event_date || project.location) && (
                        <div className="border-t border-white/5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400 no-print">
                            <div>
                                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[9px]">📅 Fecha y Hora</span>
                                <span className="text-zinc-300 font-semibold">{project.event_date || 'A confirmar'} {project.event_time || ''}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[9px]">📍 Locación</span>
                                <span className="text-zinc-300 font-semibold truncate block" title={project.location || ''}>{project.location || 'A confirmar'}</span>
                            </div>
                            <div>
                                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[9px]">🎥 Servicios & Horas</span>
                                <span className="text-zinc-300 font-semibold capitalize">
                                    {project.coverage_types?.join(', ') || '-'} {project.coverage_hours ? `(${project.coverage_hours} hs)` : ''}
                                    {project.guests_count ? ` · ${project.guests_count} invitados` : ''}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Notificaciones activas */}
                    {project.status !== 'draft' && project.status !== 'review' && (
                        <div className="border-t border-white/5 pt-4 text-[10px] text-zinc-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 no-print">
                            <span>🔔 Notificaciones activas vía: <strong className="text-nexo-lime font-bold uppercase">{project.notification_preference === 'both' ? 'WhatsApp y Email' : project.notification_preference === 'whatsapp' ? 'WhatsApp' : 'Email'}</strong></span>
                            <span>Contacto: <strong className="text-zinc-300">+{project.client_phone} · {project.client_email}</strong></span>
                        </div>
                    )}
                </div>

                {/* RENDERIZADO BASADO EN EL ESTADO DEL PROYECTO */}
                
                {/* ESTADO 1: DRAFT O REVIEW (EDICIÓN DE ESPECIFICACIONES) */}
                {/* ESTADO 1: DRAFT O REVIEW (EDICIÓN DE ESPECIFICACIONES) */}
                {(project.status === 'draft' || project.status === 'review') && (
                    (project.status === 'review' && !isEditingSpecs) ? (
                        <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6 no-print">
                            <div className="text-center py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-nexo-lime/10 text-nexo-lime flex items-center justify-center text-3xl mx-auto shadow-[0_0_15px_rgba(204,255,0,0.1)] animate-pulse">
                                    ⏳
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">¡Especificaciones Recibidas!</h2>
                                    <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                                        Hola <span className="text-white font-semibold">{project.client_name}</span>. Ya registramos los detalles de tu evento/producción. El productor está elaborando tu propuesta comercial a medida.
                                    </p>
                                </div>
                            </div>

                            {/* Canal de Notificación Destacado */}
                            <div className="bg-black/30 p-5 rounded-lg border border-white/5 space-y-3">
                                <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">🔔 Medio de Notificación Elegido:</h4>
                                <p className="text-sm font-bold text-nexo-lime">
                                    {notificationPref === 'both' && '💬 WhatsApp y 📧 Correo Electrónico'}
                                    {notificationPref === 'whatsapp' && '💬 Mensaje de WhatsApp'}
                                    {notificationPref === 'email' && '📧 Correo Electrónico'}
                                </p>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    Te enviaremos una notificación automática en cuanto el presupuesto esté listo para revisar en este portal.
                                    {clientPhone && <span className="block mt-1">WhatsApp de contacto: <strong className="text-zinc-300">+{clientPhone}</strong></span>}
                                    <span className="block">Email registrado: <strong className="text-zinc-300">{project.client_email}</strong></span>
                                </p>
                            </div>

                            {/* Resumen de Especificaciones */}
                            <div className="border-t border-white/5 pt-6 space-y-4">
                                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Detalles de la producción solicitada:</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-2 text-zinc-400">
                                        <p>📅 <span className="font-medium text-zinc-500">Fecha tentativa:</span> <span className="text-white">{eventDate || 'A confirmar'}</span></p>
                                        <p>⏱️ <span className="font-medium text-zinc-500">Horario de inicio:</span> <span className="text-white">{eventTime || 'A confirmar'}</span></p>
                                        <p>📍 <span className="font-medium text-zinc-500">Locación / Lugar:</span> <span className="text-white">{location || 'A confirmar'}</span></p>
                                    </div>
                                    <div className="space-y-2 text-zinc-400">
                                        <p>⏳ <span className="font-medium text-zinc-500">Cobertura:</span> <span className="text-white">{coverageHours} horas estimadas</span></p>
                                        <p>🎥 <span className="font-medium text-zinc-500">Servicios:</span> <span className="text-white capitalize">{coverageTypes.join(', ') || '-'}</span></p>
                                        {guestsCount !== '' && <p>👥 <span className="font-medium text-zinc-500">Invitados:</span> <span className="text-white">{guestsCount} personas</span></p>}
                                    </div>
                                </div>
                                {project.client_notes && (
                                    <div className="border-t border-white/5 pt-4 text-xs text-zinc-400">
                                        <p>📝 <span className="font-medium text-zinc-500">Observaciones/Consultas iniciales:</span></p>
                                        <p className="text-white italic mt-1 bg-black/20 p-3 rounded border border-white/5">"{project.client_notes}"</p>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-white/5 pt-6 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setIsEditingSpecs(true)}
                                    className="bg-zinc-850 hover:bg-zinc-800 border border-white/10 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-6 rounded transition-all"
                                >
                                    ✏️ Modificar especificaciones
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6 no-print">
                            <div className="space-y-2 border-b border-white/5 pb-4">
                                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Formulario de Especificaciones</h2>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    Contanos los detalles de tu evento/producción para que el equipo arme la cotización a medida.
                                </p>
                            </div>

                            <form onSubmit={handleUpdateSpecifications} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Nombre / Título del Evento</label>
                                    <input
                                        type="text"
                                        required
                                        value={projectTitle}
                                        onChange={(e) => setProjectTitle(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        placeholder="Ej: Boda de Sofía y Lucas / Lanzamiento Marca X"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Fecha Tentativa</label>
                                        <input
                                            type="date"
                                            required
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Horario de Inicio</label>
                                        <input
                                            type="time"
                                            required
                                            value={eventTime}
                                            onChange={(e) => setEventTime(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        />
                                    </div>
                                </div>

                                {/* Contacto y Preferencias de Notificación */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/5 pt-6">
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tu WhatsApp (para recibir avisos)</label>
                                        <input
                                            type="text"
                                            required
                                            value={clientPhone}
                                            onChange={(e) => setClientPhone(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                            placeholder="Ej: 5491158804711"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tu Correo Electrónico</label>
                                        <input
                                            type="email"
                                            required
                                            value={clientEmail}
                                            onChange={(e) => setClientEmail(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                            placeholder="Ej: juan@correo.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">¿Cómo preferís recibir avisos?</label>
                                        <div className="flex gap-2 pt-1">
                                            {([
                                                { key: 'both', label: 'Ambos' },
                                                { key: 'whatsapp', label: 'WhatsApp' },
                                                { key: 'email', label: 'Email' }
                                            ] as const).map((pref) => (
                                                <button
                                                    key={pref.key}
                                                    type="button"
                                                    onClick={() => setNotificationPref(pref.key)}
                                                    className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${notificationPref === pref.key ? 'bg-nexo-lime text-black border-nexo-lime' : 'bg-black text-zinc-400 border-white/10 hover:border-white/20'}`}
                                                >
                                                    {pref.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Locación / Dirección</label>
                                    <input
                                        type="text"
                                        required
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        placeholder="Ej: Salón Lahusen, CABA"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Horas de Cobertura Estimadas</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={coverageHours}
                                            onChange={(e) => setCoverageHours(parseInt(e.target.value) || 0)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Cantidad de Invitados</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={guestsCount}
                                            onChange={(e) => setGuestsCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                            placeholder="Ej: 150"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">Servicios Requeridos</label>
                                        <div className="flex gap-2 pt-1">
                                            {['foto', 'video', 'streaming'].map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => toggleCoverageType(type)}
                                                    className={`flex-1 py-2 rounded text-[10px] font-bold border capitalize transition-all ${coverageTypes.includes(type) ? 'bg-nexo-lime text-black border-nexo-lime shadow-[0_0_10px_rgba(204,255,0,0.2)]' : 'bg-black text-zinc-400 border-white/10 hover:border-white/20'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Observaciones o Consultas Iniciales</label>
                                    <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime h-20 resize-none"
                                        placeholder="Ej: Contanos detalles especiales del rodaje, cronograma, o cualquier requisito específico..."
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-nexo-lime text-black font-black text-xs uppercase tracking-widest py-3.5 rounded hover:bg-white transition-colors"
                                    >
                                        Guardar y Enviar a Producción
                                    </button>
                                    {project.status === 'review' && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingSpecs(false)}
                                            className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 text-xs font-bold px-6 py-3.5 rounded transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )
                )}

                {/* ESTADO 2: SENT (PRESUPUESTO RECIBIDO, PENDIENTE APROBACIÓN) */}
                {project.status === 'sent' && budget && (
                    <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-8">
                        <div className="space-y-2 border-b border-white/5 pb-4">
                            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Propuesta Comercial</h2>
                            <p className="text-zinc-400 text-xs">
                                Revisá el desglose del presupuesto comercial y las condiciones del servicio.
                            </p>
                        </div>

                        {/* Desglose de ítems */}
                        <div className="overflow-hidden border border-white/10 rounded-lg">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-800/30 text-zinc-400 text-xs tracking-wider uppercase border-b border-white/10">
                                        <th className="px-6 py-4 font-semibold">Descripción del Concepto</th>
                                        <th className="px-6 py-4 font-semibold w-24 text-center">Cant.</th>
                                        <th className="px-6 py-4 font-semibold w-32 text-right">Precio Unit.</th>
                                        <th className="px-6 py-4 font-semibold w-32 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm text-zinc-300">
                                    {budget.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 font-medium text-white">{item.description}</td>
                                            <td className="px-6 py-4 text-center">{item.quantity}</td>
                                            <td className="px-6 py-4 text-right">USD {item.unit_price.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-white">USD {(item.quantity * item.unit_price).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-zinc-850/50 font-bold text-white text-base">
                                        <td colSpan={3} className="px-6 py-5 text-right text-zinc-400 text-sm font-normal">Valor Total de la Propuesta:</td>
                                        <td className="px-6 py-5 text-right text-nexo-lime">USD {budget.total_price.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Condiciones de Pago */}
                        {budget.payment_terms && (
                            <div className="bg-black/30 p-5 rounded-lg border border-white/5 space-y-2">
                                <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Términos de Pago y Condiciones</h4>
                                <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                                    {budget.payment_terms}
                                </p>
                            </div>
                        )}

                        {/* Acciones Comerciales */}
                        {actionView === 'normal' && (
                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5">
                                <button
                                    onClick={handleApproveBudget}
                                    className="flex-1 bg-nexo-lime text-black font-black text-xs uppercase tracking-widest py-4 rounded hover:bg-white transition-colors shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                                >
                                    Aprobar Propuesta
                                </button>
                                <button
                                    onClick={() => setActionView('feedback')}
                                    className="flex-1 bg-zinc-900 border border-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-widest py-4 rounded transition-all"
                                >
                                    Solicitar Modificaciones
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 bg-zinc-900 border border-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-widest py-4 rounded transition-all flex items-center justify-center gap-2"
                                >
                                    📄 Guardar PDF
                                </button>
                                <button
                                    onClick={() => setActionView('reject')}
                                    className="text-zinc-500 hover:text-red-400 text-xs font-bold uppercase py-4 transition-colors px-2"
                                >
                                    Rechazar
                                </button>
                            </div>
                        )}

                        {/* Formulario de Solicitud de Cambios */}
                        {actionView === 'feedback' && (
                            <form onSubmit={handleFeedbackBudget} className="space-y-4 pt-4 border-t border-white/5">
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">Indicanos qué modificaciones necesitás:</label>
                                    <textarea
                                        required
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-nexo-lime h-28"
                                        placeholder="Ej: Necesitaría agregar 2 horas más de cobertura y cambiar el horario a las 18 hs..."
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        className="bg-nexo-lime text-black font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded hover:bg-white transition-colors"
                                    >
                                        Enviar Solicitud
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActionView('normal')}
                                        className="text-zinc-400 hover:text-white text-xs font-bold px-4"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Formulario de Rechazo */}
                        {actionView === 'reject' && (
                            <form onSubmit={handleRejectBudget} className="space-y-4 pt-4 border-t border-white/5">
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">¿Nos podrías dejar el motivo del rechazo para mejorar? (Opcional):</label>
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-nexo-lime h-20"
                                        placeholder="Escribe tu motivo aquí..."
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        Confirmar Rechazo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActionView('normal')}
                                        className="text-zinc-400 hover:text-white text-xs font-bold px-4"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* ESTADO 3: APPROVED O PRODUCTION (PROYECTO APROBADO, EN PROCESO DE PAGO Y RODAJE) */}
                {(project.status === 'approved' || project.status === 'production') && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        
                        {/* Tarjeta de estado de producción y datos de facturación */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6">
                                <div className="w-16 h-16 rounded-full bg-nexo-lime/10 text-nexo-lime flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(204,255,0,0.1)]">
                                    🎬
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Presupuesto Aprobado</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        El equipo de producción de NexoFilm ya tiene agendado tu proyecto. 
                                        {project.status === 'approved' 
                                            ? ' Aguardamos la confirmación del pago inicial de la seña para comenzar.' 
                                            : ' ¡Ya estamos trabajando en el rodaje y edición de tus materiales multimedia!'}
                                    </p>
                                </div>
                                
                                <div className="border-t border-white/5 pt-4 text-xs text-zinc-500 flex justify-between items-center">
                                    <div>
                                        <p>Fecha del evento: <span className="text-zinc-300 font-bold">{project.event_date || 'A confirmar'}</span></p>
                                        <p className="mt-1">Locación: <span className="text-zinc-300 font-bold">{project.location || 'A confirmar'}</span></p>
                                    </div>
                                    <button
                                        onClick={() => window.print()}
                                        className="bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-bold text-xs uppercase py-2 px-4 rounded transition-colors no-print flex items-center gap-1.5"
                                    >
                                        📄 PDF
                                    </button>
                                </div>
                            </div>

                            {/* Formulario de Carga de Datos de Facturación */}
                            <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-4 no-print">
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">🧾 Datos de Facturación</h3>
                                <p className="text-xs text-zinc-400">
                                    Por favor completá los datos con los que necesitás recibir la factura electrónica de AFIP/ARCA (CUIT, Razón Social, Dirección, etc.).
                                </p>
                                <form onSubmit={handleSubmitBillingInfo} className="space-y-4">
                                    <textarea
                                        value={billingInfo}
                                        onChange={(e) => setBillingInfo(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-nexo-lime h-28"
                                        placeholder="Ej: Razón Social: Empresa S.A.&#10;CUIT: 30-12345678-9&#10;Dirección: Av. de Mayo 123, CABA&#10;Tipo de Factura: Factura A o Factura B"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sendingAction}
                                        className="bg-nexo-lime hover:bg-white text-black font-bold text-xs uppercase py-2.5 px-6 rounded transition-all disabled:opacity-50"
                                    >
                                        {sendingAction ? 'Guardando...' : 'Guardar y Enviar Datos'}
                                    </button>
                                </form>
                                {project.client_billing_info && (
                                    <div className="bg-black/20 p-4 border border-white/5 rounded text-xs text-zinc-400">
                                        <span className="font-bold text-zinc-300 block mb-1">Datos cargados actualmente:</span>
                                        <pre className="font-mono text-[10px] whitespace-pre-wrap leading-relaxed text-zinc-300">{project.client_billing_info}</pre>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Módulo de Facturación y Datos Bancarios */}
                        <div className="md:col-span-1 bg-zinc-900/40 border border-white/5 p-6 rounded-xl shadow-2xl flex flex-col justify-between space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Facturación y Pago</h3>
                                
                                {project.bank_details ? (
                                    <div className="space-y-4">
                                        <div className="bg-black p-4 border border-white/10 rounded text-[11px] leading-relaxed font-mono text-zinc-300">
                                            <p className="font-bold text-nexo-lime mb-1.5 uppercase">DATOS DE TRANSFERENCIA:</p>
                                            {project.bank_details}
                                        </div>

                                        <div className="text-xs">
                                            <span className="text-zinc-500">Monto del depósito:</span>
                                            <div className="text-xl font-black text-white mt-0.5">
                                                USD {project.invoice_amount ? project.invoice_amount.toLocaleString() : '0'} 
                                                <span className="text-[10px] text-zinc-500 font-normal ml-1">
                                                    ({project.invoice_type === 'deposit_50' ? '50% Seña' : project.invoice_type === 'total' ? '100% Total' : 'Concepto Asignado'})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-zinc-500 italic">
                                        Aguardá a que el administrador asocie los datos de transferencia.
                                    </p>
                                )}
                            </div>

                            {/* Botón de Descarga de Factura AFIP */}
                            <div>
                                {project.invoice_url ? (
                                    <a
                                        href={project.invoice_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-center bg-nexo-lime text-black font-black text-xs uppercase tracking-widest py-3 rounded hover:bg-white transition-colors"
                                    >
                                        Descargar Factura PDF
                                    </a>
                                ) : (
                                    <div className="text-center bg-white/5 border border-white/10 py-3 rounded text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                        🧾 Factura en preparación
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* ESTADO 4: DELIVERED (ENTREGA FINAL DE MATERIALES - INTEGRACION GOOGLE DRIVE) */}
                {project.status === 'delivered' && (
                    <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-8">
                        <div className="space-y-2 border-b border-white/5 pb-4 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Material Final Finalizado</h2>
                                <p className="text-zinc-400 text-xs">
                                    Previsualizá y descargá el material multimedia de tu producción directamente desde tu portal oficial.
                                </p>
                            </div>
                            <span className="text-2xl">🎉</span>
                        </div>

                        {/* Módulo de descargas directas */}
                        {loadingDrive ? (
                            <div className="text-center py-12 text-zinc-500 space-y-3">
                                <div className="w-8 h-8 border-4 border-nexo-lime border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-xs uppercase tracking-widest font-bold">Obteniendo archivos de entrega...</p>
                            </div>
                        ) : driveError ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-lg text-xs leading-relaxed">
                                <p className="font-bold">Aviso sobre descargas:</p>
                                <p className="mt-1">
                                    No pudimos cargar la grilla interactiva directamente en la página ({driveError}).
                                </p>
                                <p className="mt-2">
                                    Podés descargar tus archivos de forma segura haciendo clic en el enlace del productor.
                                </p>
                            </div>
                        ) : driveFiles.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                📭 No hay archivos visibles en la carpeta de entrega en este momento.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {driveFiles.map((file) => {
                                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                    const isVideo = file.mimeType.includes('video/');

                                    return (
                                        <div key={file.id} className="bg-black/50 border border-white/10 hover:border-nexo-lime/40 rounded-lg p-4 flex gap-4 items-center group transition-all">
                                            {/* Thumbnail o Icono */}
                                            <div className="w-16 h-16 rounded overflow-hidden bg-zinc-900 border border-white/5 flex-shrink-0 flex items-center justify-center relative">
                                                {file.thumbnailLink && !isFolder ? (
                                                    <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                ) : isFolder ? (
                                                    <span className="text-3xl text-amber-500">📁</span>
                                                ) : isVideo ? (
                                                    <span className="text-3xl text-blue-500">🎬</span>
                                                ) : (
                                                    <span className="text-3xl text-zinc-600">📄</span>
                                                )}
                                            </div>

                                            {/* Detalles y descarga */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-white truncate group-hover:text-nexo-lime transition-colors" title={file.name}>
                                                    {file.name}
                                                </h4>
                                                <p className="text-xs text-zinc-500 mt-1 capitalize">
                                                    {isFolder ? 'Carpeta de Archivos' : `${file.mimeType.split('/')[1] || 'Archivo'} · ${formatBytes(file.size)}`}
                                                </p>
                                                <div className="flex gap-3 mt-2">
                                                    <a
                                                        href={file.webViewLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[10px] font-bold text-nexo-lime hover:underline"
                                                    >
                                                        {isFolder ? 'Abrir Carpeta' : 'Previsualizar'}
                                                    </a>
                                                    {file.webContentLink && !isFolder && (
                                                        <a
                                                            href={file.webContentLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] font-bold text-zinc-400 hover:text-white hover:underline"
                                                        >
                                                            Descargar
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ESTADO 5: REJECTED (PRESUPUESTO RECHAZADO) */}
                {project.status === 'rejected' && (
                    <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-3xl mx-auto">
                            ✖
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white uppercase tracking-tight">Presupuesto Rechazado</h3>
                            <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                                Entendemos la decisión. Si deseas replantear el presupuesto comercial o necesitas cambios estructurales en la propuesta, no dudes en escribirnos.
                            </p>
                        </div>
                        <div className="pt-4">
                            <a
                                href="https://wa.me/541158804711"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded transition-colors"
                            >
                                Contactar por WhatsApp
                            </a>
                        </div>
                    </div>
                )}

            </main>

            {/* Caja de Consultas Continuas (Siempre visible si el proyecto está cargado y activo) */}
            {project && project.status !== 'rejected' && project.status !== 'delivered' && (
                <div className="container mx-auto px-6 pb-12 max-w-4xl no-print">
                    <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-white uppercase tracking-tight">📩 ¿Tenés alguna duda o comentario?</h3>
                        <p className="text-xs text-zinc-400">
                            Escribí tu mensaje acá y el equipo de producción de NexoFilm será notificado en el acto.
                        </p>
                        <form onSubmit={handleSubmitNotes} className="flex flex-col sm:flex-row gap-4 items-end">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="w-full sm:flex-1 bg-black border border-white/10 rounded px-4 py-2.5 text-xs text-white focus:outline-none focus:border-nexo-lime h-16 resize-none"
                                placeholder="Escribí tu consulta o comentario aquí..."
                            />
                            <button
                                type="submit"
                                disabled={sendingAction || !noteText.trim()}
                                className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-bold text-xs uppercase py-3.5 px-6 rounded transition-all disabled:opacity-50"
                            >
                                Enviar Mensaje
                            </button>
                        </form>
                        {project.client_notes && (
                            <div className="bg-black/20 p-4 border border-white/5 rounded text-xs text-zinc-400">
                                <span className="font-bold text-zinc-300 block mb-1">Última observación enviada:</span>
                                <span className="italic">"{project.client_notes}"</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Solicitar nuevo presupuesto */}
            {project && (
                <div className="flex justify-center pb-12 no-print">
                    <button
                        type="button"
                        onClick={handleRequestNewProject}
                        className="text-zinc-500 hover:text-nexo-lime text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                        ➕ Solicitar otro presupuesto nuevo
                    </button>
                </div>
            )}

            {/* CONTENEDOR DE IMPRESIÓN (OCULTO EN PANTALLA POR CSS) */}
            {budget && (
                <div id="print-proposal">
                    {/* Membrete Oficial */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.05em', margin: 0, textTransform: 'uppercase' }}>
                                NEXOFILM
                            </h1>
                            <p style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', margin: '2px 0 0 0' }}>Productora Audiovisual</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>Propuesta Comercial</h2>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0' }}>Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                        </div>
                    </div>
                    
                    <div className="print-divider"></div>
                    
                    {/* Información del Cliente y del Proyecto */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <h3 className="print-section-title" style={{ margin: 0 }}>Información del Cliente</h3>
                            <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Nombre:</strong> {project.client_name}</p>
                            <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Email:</strong> {project.client_email}</p>
                            {project.client_phone && <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>WhatsApp:</strong> +{project.client_phone}</p>}
                        </div>
                        <div>
                            <h3 className="print-section-title" style={{ margin: 0 }}>Detalles del Proyecto</h3>
                            <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Título:</strong> {project.title}</p>
                            <p style={{ fontSize: '12px', margin: '4px 0' }}>
                                <strong>Estado:</strong> {
                                    project.status === 'approved' ? 'Aprobado' : 
                                    project.status === 'production' ? 'En Producción' : 
                                    project.status === 'delivered' ? 'Entregado' : 'Pendiente de Aprobación'
                                }
                            </p>
                        </div>
                    </div>
                    
                    {/* Especificaciones del Evento */}
                    {(project.event_date || project.location) && (
                        <div>
                            <h3 className="print-section-title">Especificaciones de la Producción</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    {project.event_date && <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Fecha del Evento:</strong> {project.event_date} {project.event_time || ''}</p>}
                                    {project.location && <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Locación:</strong> {project.location}</p>}
                                </div>
                                <div>
                                    {project.coverage_hours && <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Cobertura contratada:</strong> {project.coverage_hours} hs</p>}
                                    {project.coverage_types && project.coverage_types.length > 0 && (
                                        <p style={{ fontSize: '12px', margin: '4px 0' }}>
                                            <strong>Servicios:</strong> <span style={{ textTransform: 'capitalize' }}>{project.coverage_types.join(', ')}</span>
                                        </p>
                                    )}
                                    {project.guests_count !== null && project.guests_count !== undefined && (
                                        <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Cantidad de Invitados:</strong> {project.guests_count} personas</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Desglose de Presupuesto */}
                    <h3 className="print-section-title">Presupuesto y Desglose</h3>
                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>Descripción de los Servicios</th>
                                <th style={{ textAlign: 'center', width: '80px' }}>Cant.</th>
                                <th style={{ textAlign: 'right', width: '120px' }}>Precio Unit.</th>
                                <th style={{ textAlign: 'right', width: '120px' }}>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {budget.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.description}</td>
                                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>USD {item.unit_price.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right' }}>USD {(item.quantity * item.unit_price).toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="total-row">
                                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Total de la Propuesta:</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>USD {budget.total_price.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    {/* Condiciones de Pago */}
                    {budget.payment_terms && (
                        <div style={{ marginTop: '20px' }}>
                            <h3 className="print-section-title">Términos y Condiciones de Pago</h3>
                            <div className="print-terms">
                                {budget.payment_terms}
                            </div>
                        </div>
                    )}
                    
                    {/* Nota de Confidencialidad */}
                    <div style={{ marginTop: '50px', borderTop: '1px solid #e5e7eb', paddingTop: '15px', textAlign: 'center' }}>
                        <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0 }}>
                            Este documento es de carácter confidencial y para uso exclusivo del destinatario. NexoFilm Productora Audiovisual.
                        </p>
                        <p style={{ fontSize: '9px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                            hola@nexofilm.com · www.nexofilm.com · Buenos Aires, Argentina
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientPortal;
