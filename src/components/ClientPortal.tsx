import React, { useState, useEffect, useRef } from 'react';

interface BudgetItem {
    description: string;
    quantity: number;
    unit_price: number;
    is_optional?: boolean;
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
    contact_name: string;
    client_email: string;
    company_name: string | null;
    ai_extracted_requirements: any | null;
    title: string;
    status: 'draft' | 'sent' | 'review' | 'approved' | 'rejected' | 'production' | 'delivered';
    event_date: string | null;
    event_time: string | null;
    event_end_time?: string | null;
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
    admin_notes?: string | null;
    currency?: 'USD' | 'ARS' | null;
    crew_count?: number | null;
    client_tax_certificate_url?: string | null;
    invoice_sent?: boolean | null;
    drive_folder_id?: string | null;
    invoices_history?: any[] | null;
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

const parsePhone = (phoneStr: string) => {
    if (!phoneStr) return { country: '', local: '' };
    const cleaned = phoneStr.trim();
    if (cleaned.startsWith('+549')) return { country: '+54 9', local: cleaned.substring(4) };
    if (cleaned.startsWith('+54')) return { country: '+54', local: cleaned.substring(3) };
    if (cleaned.startsWith('549')) return { country: '+54 9', local: cleaned.substring(3) };
    if (cleaned.startsWith('54')) return { country: '+54', local: cleaned.substring(2) };
    if (cleaned.startsWith('+598')) return { country: '+598', local: cleaned.substring(4) };
    if (cleaned.startsWith('598')) return { country: '+598', local: cleaned.substring(3) };
    if (cleaned.startsWith('+56')) return { country: '+56', local: cleaned.substring(3) };
    if (cleaned.startsWith('56')) return { country: '+56', local: cleaned.substring(2) };
    if (cleaned.startsWith('+55')) return { country: '+55', local: cleaned.substring(3) };
    if (cleaned.startsWith('55')) return { country: '+55', local: cleaned.substring(2) };
    if (cleaned.startsWith('+34')) return { country: '+34', local: cleaned.substring(3) };
    if (cleaned.startsWith('34')) return { country: '+34', local: cleaned.substring(2) };
    if (cleaned.startsWith('+1')) return { country: '+1', local: cleaned.substring(2) };
    if (cleaned.startsWith('1')) return { country: '+1', local: cleaned.substring(1) };
    if (cleaned.startsWith('+')) return { country: cleaned.substring(0, 4), local: cleaned.substring(4) };
    return { country: '+54 9', local: cleaned };
};

const COUNTRY_CODES = [
    { name: 'Argentina', code: '+54 9' },
    { name: 'Uruguay', code: '+598' },
    { name: 'Chile', code: '+56' },
    { name: 'Brasil', code: '+55' },
    { name: 'Colombia', code: '+57' },
    { name: 'México', code: '+52' },
    { name: 'Perú', code: '+51' },
    { name: 'Paraguay', code: '+595' },
    { name: 'Bolivia', code: '+591' },
    { name: 'Ecuador', code: '+593' },
    { name: 'Venezuela', code: '+58' },
    { name: 'Estados Unidos', code: '+1' },
    { name: 'España', code: '+34' },
    { name: 'Italia', code: '+39' },
    { name: 'Reino Unido', code: '+44' },
    { name: 'Alemania', code: '+49' },
    { name: 'Francia', code: '+33' }
];
const formatDateAR = (dateStr: string | null) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};

/**
 * Renderiza la descripción de un item de presupuesto con jerarquía visual:
 * - La primera línea no-vacía se muestra como título en bold
 * - Las líneas que empiezan con 'o ' se muestran como bullets con ○
 * - El resto como texto normal
 */
const renderDescription = (text: string, forPrint = false) => {
    if (!text) return null;
    const lines = text.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return null;

    const result: React.ReactNode[] = [];
    let firstNonBullet = true;

    lines.forEach((line, i) => {
        const isBullet = line.trimStart().startsWith('o ');
        const content = isBullet ? line.trimStart().substring(2) : line;

        if (!isBullet && firstNonBullet) {
            // Primera línea = título
            firstNonBullet = false;
            result.push(
                <div key={i} style={{
                    fontWeight: '700',
                    fontSize: forPrint ? '11px' : '13px',
                    color: '#ffffff',
                    marginBottom: '6px',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    letterSpacing: forPrint ? '0px' : '0.01em',
                    lineHeight: '1.4'
                }}>{content}</div>
            );
        } else if (isBullet) {
            result.push(
                <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    fontSize: forPrint ? '10px' : '11.5px',
                    color: forPrint ? '#d0d0d0' : '#c4c4c4',
                    lineHeight: '1.6',
                    marginBottom: '3px',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                }}>
                    <span style={{ color: '#e1f937', fontSize: forPrint ? '9px' : '10px', marginTop: '3px', flexShrink: 0, fontWeight: '900' }}>○</span>
                    <span>{content}</span>
                </div>
            );
        } else {
            result.push(
                <div key={i} style={{
                    fontSize: forPrint ? '10px' : '11.5px',
                    color: forPrint ? '#cccccc' : '#b0b0b0',
                    lineHeight: '1.6',
                    marginBottom: '3px',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                }}>{content}</div>
            );
        }
    });
    return <div style={{ display: 'flex', flexDirection: 'column' }}>{result}</div>;
};

const ClientPortal: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [budget, setBudget] = useState<Budget | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    // Especificaciones Form
    const [projectTitle, setProjectTitle] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [contactName, setContactName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventEndTime, setEventEndTime] = useState('');
    const [location, setLocation] = useState('');
    const [coverageHours, setCoverageHours] = useState<number>(4);
    const [coverageTypes, setCoverageTypes] = useState<string[]>([]);
    const [guestsCount, setGuestsCount] = useState<number | ''>('');
    const [clientPhone, setClientPhone] = useState('');
    const [phoneCountryCode, setPhoneCountryCode] = useState('');
    const [phoneLocalNumber, setPhoneLocalNumber] = useState('');
    const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
    const [phoneSearch, setPhoneSearch] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [notificationPref, setNotificationPref] = useState<'both' | 'email' | 'whatsapp'>('both');
    const [isEditingSpecs, setIsEditingSpecs] = useState(false);
    
    // Estados adicionales de facturación y observaciones
    const [billingInfo, setBillingInfo] = useState('');
    const [taxCertificateUrl, setTaxCertificateUrl] = useState('');
    const [noteText, setNoteText] = useState('');
    const [sendingAction, setSendingAction] = useState(false);
    const [uploadingCertificate, setUploadingCertificate] = useState(false);

    // Acciones de presupuesto
    const [feedbackText, setFeedbackText] = useState('');
    const [actionView, setActionView] = useState<'normal' | 'feedback' | 'reject' | 'approve_confirm'>('normal');
    const [selectedOptionals, setSelectedOptionals] = useState<number[]>([]);

    // Drive Bridge
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [loadingDrive, setLoadingDrive] = useState(false);
    const [driveError, setDriveError] = useState('');

    // Encuesta de Satisfacción (Sprint 2)
    const [hasReviewed, setHasReviewed] = useState(false);
    const [surveyRating, setSurveyRating] = useState<number>(5);
    const [surveyHover, setSurveyHover] = useState<number>(0);
    const [surveyText, setSurveyText] = useState('');
    const [surveyNps, setSurveyNps] = useState<number | ''>('');
    const [surveyCoverageType, setSurveyCoverageType] = useState('');
    const [surveyEventType, setSurveyEventType] = useState('');
    const [surveySuccess, setSurveySuccess] = useState(false);

    // Ingesta de Documentos (IA)
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [otherProjects, setOtherProjects] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'dashboard' | 'detail'>('dashboard');

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

    // Carga dinámica de Google Maps - usa polling para evitar conflictos con otros componentes
    useEffect(() => {
        const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
        if (!apiKey) {
            console.warn("VITE_GOOGLE_MAPS_API_KEY no configurada. Desactivando sugerencias de mapa.");
            return;
        }

        // Si ya está cargado, setear directamente
        if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
            setIsGoogleLoaded(true);
            return;
        }

        // Cargar el script si no existe todavía
        const scriptId = 'google-maps-places-script-portal';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        // Polling hasta que google.maps.places esté disponible
        const interval = setInterval(() => {
            if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
                clearInterval(interval);
                setIsGoogleLoaded(true);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    // Inicializar Autocomplete cuando se activa la edición y Google está listo
    useEffect(() => {
        if (isEditingSpecs && isGoogleLoaded && viewMode === 'detail') {
            const timer = setTimeout(() => {
                initAutocomplete();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isEditingSpecs, isGoogleLoaded, viewMode]);

    // Limpiar referencias al cerrar el editor de especificaciones
    useEffect(() => {
        if (!isEditingSpecs) {
            mapRef.current = null;
            markerRef.current = null;
            autocompleteRef.current = null; // limpiar para que se re-inicialice al volver
        }
    }, [isEditingSpecs]);

    // Actualizar el mapa cuando cambia la dirección con un breve debounce (800ms)
    useEffect(() => {
        if (isGoogleLoaded && location && isEditingSpecs) {
            const timer = setTimeout(() => {
                updateMap(location);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [location, isGoogleLoaded, isEditingSpecs]);

    const initAutocomplete = () => {
        if (!inputRef.current) return;
        const google = (window as any).google;
        if (!google || !google.maps || !google.maps.places) return;

        // Si ya fue inicializado, no hacer nada
        if (autocompleteRef.current) return;

        try {
            // Importante: No usar value controlado en el input.
            // El autocomplete de Google necesita manejar el DOM directamente.
            // Sincronizamos via el evento 'input' del elemento.
            const inputEl = inputRef.current;

            const autocomplete = new google.maps.places.Autocomplete(inputEl, {
                types: ['geocode', 'establishment'],
                fields: ['formatted_address', 'geometry', 'name'],
                componentRestrictions: { country: 'ar' }
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                let newAddr = '';
                if (place && place.formatted_address) {
                    newAddr = place.formatted_address;
                } else if (place && place.name) {
                    newAddr = place.name;
                }

                if (newAddr) {
                    setLocation(newAddr);
                    if (place.geometry && place.geometry.location) {
                        if (mapRef.current) {
                            mapRef.current.setCenter(place.geometry.location);
                            mapRef.current.setZoom(15);
                            if (markerRef.current) {
                                markerRef.current.setPosition(place.geometry.location);
                            }
                        } else {
                            updateMap(newAddr);
                        }
                    } else {
                        updateMap(newAddr);
                    }
                }
            });

            autocompleteRef.current = autocomplete;
        } catch (e) {
            console.warn("Falla al inicializar Autocomplete:", e);
        }
    };

    const updateMap = (address: string) => {
        const google = (window as any).google;
        if (!google || !google.maps || !address) return;

        try {
            const mapContainer = document.getElementById('map-preview');
            if (!mapContainer) return;

            if (!mapRef.current) {
                mapRef.current = new google.maps.Map(mapContainer, {
                    center: { lat: -34.6037, lng: -58.3816 },
                    zoom: 15,
                    disableDefaultUI: true,
                    styles: [
                        { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
                        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#888888" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
                        {
                            featureType: "administrative",
                            elementType: "geometry",
                            stylers: [{ color: "#555555" }]
                        },
                        {
                            featureType: "poi",
                            elementType: "geometry",
                            stylers: [{ color: "#121212" }]
                        },
                        {
                            featureType: "road",
                            elementType: "geometry.fill",
                            stylers: [{ color: "#252525" }]
                        },
                        {
                            featureType: "road.highway",
                            elementType: "geometry.fill",
                            stylers: [{ color: "#333333" }]
                        },
                        {
                            featureType: "water",
                            elementType: "geometry",
                            stylers: [{ color: "#0d0d0d" }]
                        }
                    ]
                });

                markerRef.current = new google.maps.Marker({
                    map: mapRef.current,
                    icon: {
                        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                        fillColor: '#ccff00',
                        fillOpacity: 1,
                        strokeWeight: 1.5,
                        strokeColor: '#000000',
                        scale: 6
                    }
                });
            }

            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address }, (results: any, status: any) => {
                if (status === 'OK' && results[0] && mapRef.current) {
                    const latLng = results[0].geometry.location;
                    mapRef.current.setCenter(latLng);
                    if (markerRef.current) {
                        markerRef.current.setPosition(latLng);
                    }
                }
            });
        } catch (e) {
            console.warn("Falla al actualizar mapa:", e);
        }
    };

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
            const res = await fetch(`/api/comercial/client?token=${token}`, {
                headers: { 'x-client-token': token || '' }
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'Falla al conectar con el servidor');
            }

            let proj = data.project;
            if (proj && proj.status === 'approved' && proj.event_date) {
                try {
                    const eventDate = new Date(proj.event_date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    // Adjust for timezone if the date string is YYYY-MM-DD
                    eventDate.setMinutes(eventDate.getMinutes() + eventDate.getTimezoneOffset());
                    
                    if (eventDate <= today) {
                        proj = { ...proj, status: 'production' };
                    }
                } catch (e) {
                    console.error('Error parsing event_date:', e);
                }
            }

            setProject(proj);
            setBudget(data.budget);
            if (data.budget && data.budget.items) {
                // Los opcionales arrancan SIN seleccionar: el cliente elige cuáles agregar
                setSelectedOptionals([]);
            }
            setHasReviewed(data.hasReviewed || false);
            setOtherProjects(data.otherProjects || []);

            // Decidir modo de vista inicial
            const urlParams = new URLSearchParams(window.location.search);
            const viewParam = urlParams.get('view');
            if (viewParam === 'detail') {
                setViewMode('detail');
            } else if (viewParam === 'dashboard') {
                setViewMode('dashboard');
            } else {
                const hasOthers = data.otherProjects && data.otherProjects.length > 0;
                if (hasOthers) {
                    setViewMode('dashboard');
                } else {
                    setViewMode('detail');
                }
            }
            
            // Cargar specs si existen
            if (data.project) {
                setProjectTitle(['Propuesta Comercial', 'Nueva Propuesta Comercial'].includes(data.project.title) ? '' : (data.project.title || ''));
                if (data.project.status === 'draft') {
                    setIsEditingSpecs(true);
                }
                setContactName(data.project.contact_name || '');
                setEventDate(data.project.event_date || '');
                setEventTime(data.project.event_time || '');
                setEventEndTime(data.project.event_end_time || '');
                setLocation(data.project.location || '');
                setCoverageHours(data.project.coverage_hours || 4);
                setCoverageTypes(data.project.coverage_types || []);
                setGuestsCount(data.project.guests_count || '');
                setClientPhone(data.project.client_phone || '');
                const parsed = parsePhone(data.project.client_phone || '');
                setPhoneCountryCode(parsed.country);
                setPhoneLocalNumber(parsed.local);
                setClientEmail(data.project.client_email || '');
                setNotificationPref(data.project.notification_preference || 'both');
                setBillingInfo(data.project.client_billing_info || '');
                setTaxCertificateUrl(data.project.client_tax_certificate_url || '');
                setNoteText(''); // Dejar vacío por defecto para nuevas consultas
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al validar credenciales');
        } finally {
            setLoading(false);
        }
    };

    const goBackToDashboard = () => {
        setViewMode('dashboard');
        const url = new URL(window.location.href);
        url.searchParams.delete('view');
        window.history.pushState({}, '', url.toString());
    };

    const enterProjectDetail = (projectToken: string) => {
        if (projectToken === token) {
            setViewMode('detail');
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'detail');
            window.history.pushState({}, '', url.toString());
        } else {
            window.location.href = `/portal?token=${projectToken}&view=detail`;
        }
    };

    const fetchDriveFiles = async () => {
        setLoadingDrive(true);
        setDriveError('');
        try {
            const res = await fetch(`/api/comercial/client?action=drive&token=${token}`, {
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
            const countryPrefix = phoneCountryCode.trim() !== '' ? phoneCountryCode : '+54 9';
            const combinedPhone = `${countryPrefix.replace(/\s+/g, '')}${phoneLocalNumber.replace(/\D/g, '')}`.replace(/^\++/, '');
            setClientPhone(combinedPhone);

            const res = await fetch('/api/comercial/client', {
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
                        contact_name: contactName,
                        event_date: eventDate,
                        event_time: eventTime,
                        event_end_time: eventEndTime,
                        location,
                        coverage_types: coverageTypes,
                        coverage_hours: coverageHours,
                        client_phone: combinedPhone,
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
            const res = await fetch('/api/comercial/client', {
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
            const res = await fetch('/api/comercial/client', {
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
            const res = await fetch('/api/comercial/client', {
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
                window.location.href = `/portal?token=${data.redirectToken}&view=detail`;
            }
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handlePrintPDF = () => {
        const originalTitle = document.title;
        const eventName = project?.title || 'Evento';
        const clientName = project?.contact_name || 'Cliente';
        document.title = `Propuesta Comercial - ${clientName} - ${eventName} - NexoFilm`;
        window.print();
        document.title = originalTitle;
    };

    // Aprobar Presupuesto - Muestra el panel interactivo de aprobación
    const handleApproveBudget = () => {
        setActionView('approve_confirm');
    };

    // Confirmación final de la aprobación con opcionales y facturación
    const handleConfirmApproval = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/client', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({ 
                    token, 
                    action: 'approve',
                    billing_info: billingInfo,
                    tax_certificate_url: taxCertificateUrl,
                    selected_optional_indices: selectedOptionals
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al aprobar presupuesto');

            setSuccessMsg('¡Presupuesto Aprobado con éxito! Gracias por confiar en NexoFilm. En breve nos pondremos en contacto.');
            setActionView('normal');
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
            const res = await fetch('/api/comercial/client', {
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
            const res = await fetch('/api/comercial/client', {
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

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!surveyRating) return;
        setSendingAction(true);
        setError('');
        try {
            const res = await fetch('/api/comercial/client', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-client-token': token || ''
                },
                body: JSON.stringify({
                    token,
                    action: 'submit_review',
                    rating: surveyRating,
                    feedback_text: surveyText,
                    recommendation_score: surveyNps === '' ? null : Number(surveyNps),
                    coverage_type: surveyCoverageType || null,
                    event_type: surveyEventType || null
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar feedback');
            setSurveySuccess(true);
            setHasReviewed(true);
            setSuccessMsg('¡Muchas gracias por tu opinión! Nos ayuda un montón a seguir mejorando.');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al enviar feedback');
        } finally {
            setSendingAction(false);
        }
    };

    const handleTaxCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('El archivo es demasiado grande (máximo 5MB).');
            return;
        }

        setUploadingCertificate(true);
        setError('');
        setSuccessMsg('');

        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64String = (reader.result as string).split(',')[1];
                
                try {
                    const res = await fetch('/api/comercial/client', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-client-token': token || ''
                        },
                        body: JSON.stringify({
                            token,
                            action: 'upload_tax_certificate',
                            fileBase64: base64String,
                            filename: file.name
                        })
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Error al procesar el archivo');

                    setSuccessMsg('¡Constancia de CUIT/CUIL adjuntada correctamente!');
                    fetchPortalData();
                } catch (err: any) {
                    console.error(err);
                    setError(err.message || 'Error al subir constancia.');
                } finally {
                    setUploadingCertificate(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (err: any) {
            console.error(err);
            setError('Error al leer el archivo.');
            setUploadingCertificate(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('El archivo es demasiado grande (máximo 5MB).');
            return;
        }
        
        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(extension)) {
            setUploadError('Formato no soportado. Por favor, subí un archivo PDF o Word (.docx).');
            return;
        }

        setUploadingDoc(true);
        setUploadError('');
        setUploadSuccess('');

        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64String = (reader.result as string).split(',')[1];
                
                try {
                    const res = await fetch('/api/comercial/client', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-client-token': token || ''
                        },
                        body: JSON.stringify({
                            token,
                            action: 'upload_document',
                            fileBase64: base64String,
                            filename: file.name
                        })
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Error al procesar el documento');

                    setUploadSuccess('📁 ¡Archivo adjuntado correctamente! Se ha guardado en tu solicitud.');
                    await fetchPortalData();
                } catch (err: any) {
                    console.error(err);
                    setUploadError(err.message || 'Error al procesar el documento.');
                } finally {
                    setUploadingDoc(false);
                }
            };
            reader.readAsDataURL(file);
        } catch (err: any) {
            console.error(err);
            setUploadError('Error al leer el archivo.');
            setUploadingDoc(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
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

    const renderBudgetSection = () => {
        if (!budget) return null;

        const isEditable = project.status === 'sent';
        // Base = SOLO items[0]. Extras = TODO items.slice(1)
        const baseItem = budget.items[0];
        const baseTotal = baseItem ? (baseItem.quantity * baseItem.unit_price) : 0;
        const extraItems = budget.items.slice(1);
        const optionalItems = extraItems.filter(item => item.is_optional);
        const selectedOptionalsTotal = optionalItems
            .filter((_, idx) => selectedOptionals.includes(idx))
            .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const finalCalculatedTotal = baseTotal + selectedOptionalsTotal;

        return (
            <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-8 no-print mt-6">
                <div className="space-y-2 border-b border-white/5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Presupuesto de Servicios Detallado</h2>
                        <p className="text-zinc-400 text-xs mt-1">
                            Desglose del presupuesto comercial y las condiciones de pago acordadas.
                        </p>
                    </div>
                    {project.status !== 'draft' && project.status !== 'review' && (
                        <button
                            onClick={handlePrintPDF}
                            className="bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-bold text-xs uppercase py-2.5 px-5 rounded transition-colors no-print flex items-center gap-2 shrink-0"
                        >
                            📄 Descargar PDF
                        </button>
                    )}
                </div>

                {/* Desglose de ítems */}
                <div className="space-y-4">
                    {/* Vista Desktop (Tabla) */}
                    <div className="hidden lg:block overflow-x-auto border border-white/10 rounded-lg">
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
                                {baseItem && (
                                    <tr>
                                        <td className="px-6 py-4 align-top" style={{ minWidth: '260px' }}>{renderDescription(baseItem.description)}</td>
                                        <td className="px-6 py-4 text-center align-top">{baseItem.quantity}</td>
                                        <td className="px-6 py-4 text-right align-top text-zinc-400">{project.currency || 'USD'} {baseItem.unit_price.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right align-top text-white font-bold">{project.currency || 'USD'} {baseTotal.toLocaleString()}</td>
                                    </tr>
                                )}
                                <tr className="bg-zinc-900/60 border-t-2 border-white/10">
                                    <td colSpan={3} className="px-6 py-3 text-right text-zinc-400 text-xs font-normal">Presupuesto Base (Monto a Aprobar):</td>
                                    <td className="px-6 py-3 text-right text-nexo-lime text-sm font-black whitespace-nowrap">{project.currency || 'USD'} {baseTotal.toLocaleString()}</td>
                                </tr>
                                {optionalItems.length > 0 && (
                                    <tr className="bg-[#00e5ff]/5">
                                        <td colSpan={3} className="px-6 py-2.5 text-right text-zinc-400 text-xs font-normal">Adicionales seleccionados:</td>
                                        <td className="px-6 py-2.5 text-right text-[#00e5ff] text-sm font-black whitespace-nowrap">
                                            {selectedOptionalsTotal > 0 ? `+ ${project.currency || 'USD'} ${selectedOptionalsTotal.toLocaleString()}` : `${project.currency || 'USD'} 0`}
                                        </td>
                                    </tr>
                                )}
                                {selectedOptionalsTotal > 0 && (
                                    <tr className="bg-white/5 border-t-2 border-white/20">
                                        <td colSpan={3} className="px-6 py-3 text-right text-zinc-300 text-xs font-semibold uppercase tracking-wide">🎯 Total con adicionales incluidos:</td>
                                        <td className="px-6 py-3 text-right text-white text-sm font-black whitespace-nowrap">{project.currency || 'USD'} {finalCalculatedTotal.toLocaleString()}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista Móvil (Tarjetas Stacked) */}
                    <div className="block lg:hidden space-y-4">
                        {baseItem && (
                            <div className="bg-black/40 border border-white/5 p-5 rounded-xl space-y-3 shadow-lg">
                                <div className="leading-relaxed">
                                    {renderDescription(baseItem.description)}
                                </div>
                                <div className="flex justify-between items-center gap-2 pt-3 border-t border-white/5 text-xs text-zinc-400">
                                    <div><span>Cant: </span><strong className="text-white">{baseItem.quantity}</strong></div>
                                    <div><span>Precio U: </span><strong className="text-white">{project.currency || 'USD'} {baseItem.unit_price.toLocaleString()}</strong></div>
                                    <div className="text-right"><span>Subtotal: </span><strong className="text-nexo-lime font-bold">{project.currency || 'USD'} {baseTotal.toLocaleString()}</strong></div>
                                </div>
                            </div>
                        )}

                        {/* Totales en Móvil */}
                        <div className="bg-zinc-900/60 p-4 rounded-xl border border-nexo-lime/20 flex flex-col gap-2.5 shadow-lg">
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold shrink-0">Total base</span>
                                <span className="text-sm font-black text-nexo-lime whitespace-nowrap">{project.currency || 'USD'} {baseTotal.toLocaleString()}</span>
                            </div>
                            {optionalItems.length > 0 && (
                                <div className="flex justify-between items-center gap-4 border-t border-white/5 pt-2.5">
                                    <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold shrink-0">Adicionales</span>
                                    <span className="text-sm font-black text-[#00e5ff] whitespace-nowrap">
                                        {selectedOptionalsTotal > 0 ? `+ ${project.currency || 'USD'} ${selectedOptionalsTotal.toLocaleString()}` : `${project.currency || 'USD'} 0`}
                                    </span>
                                </div>
                            )}
                            {selectedOptionalsTotal > 0 && (
                                <div className="flex justify-between items-center gap-4 border-t-2 border-white/20 pt-2.5">
                                    <span className="text-zinc-200 text-[10px] uppercase tracking-wider font-black shrink-0">🎯 Total final</span>
                                    <span className="text-base font-black text-white whitespace-nowrap">{project.currency || 'USD'} {finalCalculatedTotal.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Servicios Opcionales / Extras Sugeridos: TODOS los items desde el [1] en adelante */}
                {extraItems.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                            <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                                Adicionales recomendados / pedidos (Opcionales)
                            </h4>
                            {isEditable && (
                                <span className="text-[10px] text-zinc-500 font-medium italic">
                                    *(Tildá o destildá para incluir o excluir del presupuesto)
                                </span>
                            )}
                        </div>
                        
                        {/* Vista Desktop (Tabla) */}
                        <div className="hidden lg:block overflow-x-auto border border-[#00e5ff]/20 rounded-lg bg-[#00e5ff]/5">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-800/20 text-[#00e5ff] text-xs tracking-wider uppercase border-b border-[#00e5ff]/20">
                                        {isEditable && <th className="px-6 py-3 font-semibold w-16 text-center">Incluir</th>}
                                        <th className="px-6 py-3 font-semibold">Servicio Opcional</th>
                                        <th className="px-6 py-3 font-semibold w-24 text-center">Cant.</th>
                                        <th className="px-6 py-3 font-semibold w-32 text-right">Precio Unit.</th>
                                        <th className="px-6 py-3 font-semibold w-32 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm text-zinc-300">
                                    {extraItems.map((item, idx) => {
                                        const isOptionalSelectable = item.is_optional;
                                        const optIdx = optionalItems.indexOf(item);
                                        const isChecked = isEditable 
                                            ? (isOptionalSelectable && selectedOptionals.includes(optIdx))
                                            : (item.approved_by_client !== false);
                                        
                                        const showStrikeThrough = !isEditable && item.approved_by_client === false;

                                        return (
                                            <tr key={idx} className={isChecked ? "bg-nexo-lime/5" : showStrikeThrough ? "opacity-35 line-through text-zinc-500 bg-zinc-950/20" : ""}>
                                                {isEditable && (
                                                    <td className="px-6 py-3 text-center">
                                                        {isOptionalSelectable ? (
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    if (isChecked) {
                                                                        setSelectedOptionals(selectedOptionals.filter(i => i !== optIdx));
                                                                    } else {
                                                                        setSelectedOptionals([...selectedOptionals, optIdx]);
                                                                    }
                                                                }}
                                                                className="accent-nexo-lime w-4 h-4 cursor-pointer"
                                                            />
                                                        ) : (
                                                            <span className="text-zinc-600 text-[9px]">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-6 py-3 align-top" style={{ minWidth: '220px' }}>
                                                    <div style={{ display:'flex', alignItems:'flex-start', gap:'6px' }}>
                                                        <span className="text-xs mt-1 shrink-0">
                                                            {!isEditable ? (item.approved_by_client === false ? "❌" : "✅") : "➕"}
                                                        </span>
                                                        <div>
                                                            {renderDescription(item.description)}
                                                            {!isEditable && item.approved_by_client === false && (
                                                                <span className="text-[10px] text-red-400 font-bold ml-2 font-mono">(No seleccionado)</span>
                                                            )}
                                                            {!isEditable && (item.approved_by_client === true || item.approved_by_client === undefined) && (
                                                                <span className="text-[10px] text-nexo-lime font-bold ml-2 font-mono">(Aprobado / Incluido)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-center">{item.quantity}</td>
                                                <td className="px-6 py-3 text-right">{project.currency || 'USD'} {item.unit_price.toLocaleString()}</td>
                                                <td className="px-6 py-3 text-right text-[#00e5ff]">
                                                    {showStrikeThrough 
                                                        ? <span className="text-zinc-500 line-through">No incl.</span>
                                                        : `${project.currency || 'USD'} ${(item.quantity * item.unit_price).toLocaleString()}`
                                                    }
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista Móvil (Tarjetas Stacked) */}
                        <div className="block lg:hidden space-y-3">
                            {extraItems.map((item, idx) => {
                                const isOptionalSelectable = item.is_optional;
                                const optIdx = optionalItems.indexOf(item);
                                const isChecked = isEditable 
                                    ? (isOptionalSelectable && selectedOptionals.includes(optIdx))
                                    : (item.approved_by_client !== false);
                                
                                const showStrikeThrough = !isEditable && item.approved_by_client === false;
                                
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => {
                                            if (!isEditable || !isOptionalSelectable) return;
                                            if (isChecked) {
                                                setSelectedOptionals(selectedOptionals.filter(i => i !== optIdx));
                                            } else {
                                                setSelectedOptionals([...selectedOptionals, optIdx]);
                                            }
                                        }}
                                        className={`border p-5 rounded-xl space-y-3 shadow-md transition-all ${
                                            isEditable && isOptionalSelectable ? 'cursor-pointer' : ''
                                        } ${
                                            isChecked
                                                ? 'bg-nexo-lime/10 border-nexo-lime/40' 
                                                : showStrikeThrough
                                                    ? 'opacity-35 line-through bg-zinc-950/20 border-white/5'
                                                    : 'bg-[#00e5ff]/5 border-[#00e5ff]/20'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3 justify-between">
                                            <div className="leading-relaxed flex-1 text-xs">
                                                <span className="mr-1">{!isEditable ? (item.approved_by_client === false ? "❌" : "✅") : "➕"}</span>
                                                {renderDescription(item.description)}
                                                {!isEditable && item.approved_by_client === false && (
                                                    <span className="text-[10px] text-red-400 font-bold block mt-1">(No seleccionado)</span>
                                                )}
                                                {!isEditable && (item.approved_by_client === true || item.approved_by_client === undefined) && (
                                                    <span className="text-[10px] text-nexo-lime font-bold block mt-1">(Aprobado / Incluido)</span>
                                                )}
                                            </div>
                                            {isEditable && isOptionalSelectable && (
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked}
                                                    readOnly
                                                    className="accent-nexo-lime w-4 h-4 shrink-0 mt-0.5"
                                                />
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center gap-2 pt-3 border-t border-white/5 text-xs text-zinc-400">
                                            <div><span>Cant: </span><strong className="text-white">{item.quantity}</strong></div>
                                            <div><span>Precio U: </span><strong className="text-white">{project.currency || 'USD'} {item.unit_price.toLocaleString()}</strong></div>
                                            <div className="text-right">
                                                <span>Subtotal: </span>
                                                <strong className={showStrikeThrough ? "text-zinc-500 line-through" : "text-[#00e5ff] font-bold"}>
                                                    {showStrikeThrough ? "No incl." : `${project.currency || 'USD'} ${(item.quantity * item.unit_price).toLocaleString()}`}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Condiciones de Pago */}
                {budget.payment_terms && (
                    <div className="bg-black/30 p-5 rounded-lg border border-white/5 space-y-2">
                        <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Términos de Pago y Condiciones</h4>
                        <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                            {budget.payment_terms}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    if (!project) return null;

    // Colores de estado
    const statusTrackers = [
        { key: 'draft', label: 'Especificaciones', shortLabel: 'Specs', active: ['draft', 'review', 'sent', 'approved', 'rejected', 'production', 'delivered'] },
        { key: 'sent', label: 'Presupuesto', shortLabel: 'Propuesta', active: ['sent', 'approved', 'production', 'delivered'] },
        { key: 'approved', label: 'Facturación / Pago', shortLabel: 'Pago', active: ['approved', 'production', 'delivered'] },
        { key: 'production', label: 'Rodaje / Edición', shortLabel: 'Producción', active: ['production', 'delivered'] },
        { key: 'delivered', label: 'Entrega Material', shortLabel: 'Entrega', active: ['delivered'] }
    ];

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-nexo-lime selection:text-black">
            
            {/* Header de Portal Seguro */}
            <header className="border-b border-white/5 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/img/logo.png" alt="NexoFilm" className="h-5 md:h-6 brightness-0 invert" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider">
                        <span>🔒 Portal Seguro</span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 md:px-6 py-6 md:py-10 max-w-4xl space-y-5 md:space-y-8">
                
                {/* Alertas Premium Toast */}
                {successMsg && (
                    <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
                        <div className="bg-gradient-to-r from-zinc-900 to-black border border-nexo-lime/30 p-5 rounded-xl flex items-center gap-4 shadow-[0_10px_40px_-10px_rgba(206,255,26,0.3)]">
                            <div className="w-10 h-10 rounded-full bg-nexo-lime/10 border border-nexo-lime/20 flex items-center justify-center shrink-0">
                                <span className="text-xl text-nexo-lime">✓</span>
                            </div>
                            <p className="text-sm font-medium text-white max-w-sm">{successMsg}</p>
                            <button 
                                onClick={() => setSuccessMsg('')} 
                                className="ml-2 text-zinc-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Navegación del Portal */}
                {viewMode === 'detail' && otherProjects.length > 0 && (
                    <div className="no-print pb-2">
                        <button
                            type="button"
                            onClick={goBackToDashboard}
                            className="inline-flex items-center gap-2 text-zinc-500 hover:text-nexo-lime font-bold text-xs uppercase tracking-wider transition-colors focus:outline-none cursor-pointer"
                        >
                            ← Volver a mis proyectos
                        </button>
                    </div>
                )}

                {viewMode === 'dashboard' ? (
                    <div className="space-y-6 md:space-y-8 animate-fade-in">
                        {/* Banner de Bienvenida Premium */}
                        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-nexo-lime/20 p-6 md:p-8 rounded-xl shadow-[0_0_30px_rgba(204,255,0,0.03)] relative overflow-hidden no-print">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-nexo-lime/5 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="flex flex-col items-start gap-3 md:gap-4 relative z-10">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-nexo-lime/10 text-nexo-lime border border-nexo-lime/25 rounded-md text-[9px] font-black uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-nexo-lime animate-pulse"></span>
                                    Portal de Clientes
                                </div>
                                <h2 className="text-lg md:text-3xl font-extrabold text-white tracking-tight uppercase leading-tight">
                                    {getWelcomeGreeting(project.contact_name)}, <span className="text-nexo-lime">{project.contact_name}{project.company_name ? ` (${project.company_name})` : ''}</span>
                                </h2>
                                <p className="text-zinc-400 text-xs leading-relaxed max-w-2xl">
                                    Desde tu portal seguro podés gestionar todas tus producciones, revisar presupuestos comerciales, cargar datos de facturación y descargar los materiales terminados.
                                </p>
                            </div>
                        </div>

                        {/* Listado de Proyectos */}
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Mis Proyectos & Presupuestos</h3>
                                    <button
                                        type="button"
                                        onClick={handleRequestNewProject}
                                        className="bg-nexo-lime/10 hover:bg-nexo-lime/20 border border-nexo-lime/30 text-nexo-lime text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <span>➕</span> Nuevo Presupuesto
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <input 
                                        type="text" 
                                        placeholder="Buscar proyecto, locación, fecha..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-zinc-900/80 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime w-full sm:w-64"
                                    />
                                    <span className="text-[9px] md:text-[10px] text-zinc-500 font-bold bg-zinc-900 px-2.5 py-1.5 rounded border border-white/5 uppercase whitespace-nowrap">
                                        Total: {1 + otherProjects.length}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                {(() => {
                                    const allProjects = [
                                        {
                                            id: project.id,
                                            title: project.title,
                                            access_token: token || '',
                                            status: project.status,
                                            event_date: project.event_date,
                                            location: project.location,
                                            company_name: project.company_name,
                                            created_at: (project as any).created_at || new Date().toISOString()
                                        },
                                        ...otherProjects.map(p => ({
                                            id: p.id,
                                            title: p.title,
                                            access_token: p.access_token,
                                            status: p.status,
                                            event_date: p.event_date,
                                            location: p.location,
                                            company_name: p.company_name,
                                            created_at: p.created_at || new Date().toISOString()
                                        }))
                                    ];

                                    // Ordenar: primero los 'sent' (presupuesto a revisar), luego por created_at desc
                                    const sorted = [...allProjects].sort((a, b) => {
                                        const priority: Record<string, number> = { sent: 0, review: 1, approved: 2, production: 3, delivered: 4, rejected: 5, draft: 6 };
                                        const pa = priority[a.status] ?? 9;
                                        const pb = priority[b.status] ?? 9;
                                        if (pa !== pb) return pa - pb;
                                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                    });

                                    const filtered = sorted.filter(p => {
                                        const term = searchTerm.toLowerCase();
                                        return (p.title?.toLowerCase() || '').includes(term) ||
                                               (p.company_name?.toLowerCase() || '').includes(term) ||
                                               (p.location?.toLowerCase() || '').includes(term) ||
                                               (p.event_date?.toLowerCase() || '').includes(term) ||
                                               (p.status?.toLowerCase() || '').includes(term);
                                    });

                                    return filtered.map((proj) => {
                                        let badgeColor = "bg-zinc-800 text-zinc-400 border-zinc-700/50";
                                        let statusText = proj.status;

                                        if (proj.status === 'draft') {
                                            badgeColor = "bg-zinc-900 text-zinc-400 border-white/10";
                                            statusText = "Especificaciones";
                                        } else if (proj.status === 'review') {
                                            badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                                            statusText = "En Revisión";
                                        } else if (proj.status === 'sent') {
                                            badgeColor = "bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/20 animate-pulse";
                                            statusText = "Revisar Presupuesto";
                                        } else if (proj.status === 'approved') {
                                            badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                                            statusText = "Aprobado / Pago";
                                        } else if (proj.status === 'production') {
                                            badgeColor = "bg-nexo-lime/10 text-nexo-lime border-nexo-lime/20";
                                            statusText = "En Producción";
                                        } else if (proj.status === 'delivered') {
                                            badgeColor = "bg-green-500/20 text-green-400 border-green-500/20";
                                            statusText = "Entregado";
                                        } else if (proj.status === 'rejected') {
                                            badgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
                                            statusText = "Rechazado";
                                        }

                                        return (
                                            <div
                                                key={proj.id}
                                                onClick={() => enterProjectDetail(proj.access_token)}
                                                className={`border rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between transition-all cursor-pointer group relative overflow-hidden gap-4 ${
                                                    proj.status === 'sent'
                                                        ? 'bg-[#00e5ff]/5 border-[#00e5ff]/30 hover:border-[#00e5ff]/60 shadow-[0_0_15px_rgba(0,229,255,0.05)]'
                                                        : proj.status === 'approved' || proj.status === 'production'
                                                        ? 'bg-nexo-lime/5 border-nexo-lime/20 hover:border-nexo-lime/50 shadow-[0_0_15px_rgba(204,255,0,0.04)]'
                                                        : proj.status === 'delivered'
                                                        ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                                                        : proj.status === 'rejected'
                                                        ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                                                        : 'bg-zinc-900/30 border-white/5 hover:border-nexo-lime/30'
                                                }`}
                                            >
                                                {/* Accent strip on the left */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                                                    proj.status === 'sent' ? 'bg-[#00e5ff]' :
                                                    proj.status === 'approved' ? 'bg-emerald-400' :
                                                    proj.status === 'production' ? 'bg-nexo-lime' :
                                                    proj.status === 'delivered' ? 'bg-green-400' :
                                                    proj.status === 'rejected' ? 'bg-red-400' :
                                                    proj.status === 'review' ? 'bg-amber-400' :
                                                    'bg-zinc-700'
                                                }`}></div>

                                                <div className="flex-1 space-y-2 pl-2">
                                                    {/* Row 1: Status badge + date */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badgeColor}`}>
                                                            {statusText}
                                                        </span>
                                                        {proj.event_date && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-nexo-lime/90 bg-nexo-lime/10 border border-nexo-lime/20 px-2 py-0.5 rounded-full">
                                                                📅 {formatDateAR(proj.event_date)}
                                                            </span>
                                                        )}
                                                        {!proj.event_date && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded-full">
                                                                📅 Fecha a confirmar
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Row 2: Title */}
                                                    <h4 className="font-extrabold text-sm md:text-base text-white group-hover:text-nexo-lime transition-colors uppercase tracking-tight" title={proj.title}>
                                                        {proj.title}
                                                        {proj.company_name && <span className="text-zinc-500 text-xs font-normal normal-case ml-2">({proj.company_name})</span>}
                                                    </h4>
                                                    {/* Row 3: Location */}
                                                    {proj.location ? (
                                                        <p className="text-[10px] text-zinc-400 flex items-center gap-1 truncate" title={proj.location}>
                                                            📍 <span className="truncate max-w-xs">{proj.location}</span>
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] text-zinc-600 italic">📍 Locación sin definir</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center shrink-0 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 mt-1 md:mt-0">
                                                    <span className={`text-xs font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform flex items-center gap-1.5 px-4 py-2 rounded-lg border ${
                                                        proj.status === 'sent'
                                                            ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/30'
                                                            : 'bg-nexo-lime/10 text-nexo-lime border-nexo-lime/20'
                                                    }`}>
                                                        {proj.status === 'sent' ? '⚡ Ver Propuesta' : proj.status === 'delivered' ? '📦 Ver Entregas' : 'Ingresar →'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5 md:space-y-8 animate-fade-in">
                        {/* Banner de Bienvenida Premium */}
                        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-nexo-lime/20 p-4 md:p-8 rounded-xl shadow-[0_0_30px_rgba(204,255,0,0.03)] relative overflow-hidden no-print">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-nexo-lime/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex flex-col items-start gap-3 md:gap-4 relative z-10">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-nexo-lime/10 text-nexo-lime border border-nexo-lime/25 rounded-md text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-nexo-lime animate-pulse"></span>
                            Portal de Autogestión
                        </div>
                        <h2 className="text-lg md:text-3xl font-extrabold text-white tracking-tight uppercase leading-tight">
                            {getWelcomeGreeting(project.contact_name)}, <span className="text-nexo-lime">{project.contact_name}{project.company_name ? ` (${project.company_name})` : ''}</span>
                        </h2>
                        {(project.status === 'draft' || !budget) ? (
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                Completá el <strong>Formulario de Especificaciones</strong> a continuación con los datos de tu evento o producción para que podamos armar tu cotización.
                            </p>
                        ) : project.status === 'review' ? (
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                Ya recibimos tus especificaciones. Nuestro equipo está elaborando la propuesta comercial. Te notificaremos cuando el presupuesto esté listo.
                            </p>
                        ) : (project.status === 'sent' && budget) ? (
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                ¡Tu propuesta comercial ya está disponible! Revisá el desglose, descargá el PDF y aprobalo o solicitá modificaciones desde aquí.
                            </p>
                        ) : project.status === 'approved' ? (
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                ¡Presupuesto aprobado! Completá los <strong>datos de facturación</strong> para que podamos emitir el comprobante.
                            </p>
                        ) : project.status === 'production' ? (
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                ¡Estamos en producción! El equipo trabaja en el rodaje o edición. Seguí el estado en la barra de progreso.
                            </p>
                        ) : project.status === 'delivered' ? (
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                ¡Tu material ya está listo! <strong>Descargá todas las entregas finales</strong> desde el panel a continuación.
                            </p>
                        ) : (
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                Portal de autogestión comercial seguro de NexoFilm.
                            </p>
                        )}
                    </div>
                </div>

                {/* --- SECCIÓN TITULO Y PROGRESS BAR --- */}
                <div className="bg-zinc-900/30 border border-white/5 p-4 md:p-6 rounded-xl space-y-4 md:space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1">
                            <h2 className="text-zinc-500 text-[9px] uppercase tracking-widest font-black">{project.contact_name}{project.company_name ? ` (${project.company_name})` : ''}</h2>
                            <h1 className="text-2xl md:text-4xl font-extrabold uppercase tracking-tighter text-white leading-tight">{project.title}</h1>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 no-print mt-2 md:mt-0">
                            <button
                                type="button"
                                onClick={handleRequestNewProject}
                                className="bg-nexo-lime/10 hover:bg-nexo-lime/20 border border-nexo-lime/30 text-nexo-lime text-[10px] font-bold uppercase tracking-wider py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                            >
                                <span>➕</span> Nuevo Presupuesto
                            </button>
                            {otherProjects.length > 0 && (
                                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 shrink-0 w-full sm:w-auto">
                                    <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">Cambiar Proyecto:</span>
                                    <select 
                                        onChange={(e) => {
                                            const selectedToken = e.target.value;
                                            if (selectedToken) {
                                                window.location.href = `/portal?token=${selectedToken}`;
                                            }
                                        }}
                                        className="bg-black border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-nexo-lime cursor-pointer flex-1"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Ver otro proyecto...</option>
                                        {otherProjects.map((p: any) => (
                                            <option key={p.id} value={p.access_token}>
                                                {p.title} ({p.status.toUpperCase()})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
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
                                                <span className="hidden md:block">{track.label}</span>
                                                <span className="block md:hidden text-[7px] leading-tight break-all">{track.shortLabel}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Resumen de especificaciones del evento (Para estados posteriores a Draft/Review) */}
                    {project.status !== 'draft' && project.status !== 'review' && (project.event_date || project.location) && (
                        <div className="border-t border-white/5 pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-zinc-400 no-print">
                            <div>
                                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[9px]">📅 Fecha y Hora</span>
                                <span className="text-zinc-300 font-semibold">{project.event_date ? formatDateAR(project.event_date) : 'A confirmar'} {project.event_time || ''}</span>
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
                            <div>
                                <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[9px]">🎥 Personal Cobertura</span>
                                <span className="text-zinc-300 font-semibold">
                                    {project.crew_count ? `${project.crew_count} ${project.crew_count === 1 ? 'persona' : 'personas'}` : 'A confirmar'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Notificaciones activas */}
                    {project.status !== 'draft' && project.status !== 'review' && (
                        <div className="border-t border-white/5 pt-4 text-[10px] text-zinc-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 no-print">
                            <span>🔔 Notificaciones activas vía: <strong className="text-nexo-lime font-bold uppercase">{project.notification_preference === 'both' ? 'WhatsApp y Email' : project.notification_preference === 'whatsapp' ? 'WhatsApp' : 'Email'}</strong></span>
                            <span>Contacto: <strong className="text-zinc-300">+{project.client_phone?.replace(/^\++/, '')} · {project.client_email}</strong></span>
                        </div>
                    )}
                </div>

                {/* RENDERIZADO BASADO EN EL ESTADO DEL PROYECTO */}
                
                {/* ESTADO 1: DRAFT O REVIEW (EDICIÓN DE ESPECIFICACIONES) */}
                {/* ESTADO 1: DRAFT O REVIEW (EDICIÓN DE ESPECIFICACIONES) */}
                {(project.status === 'draft' || project.status === 'review' || !budget) && (
                    (project.status === 'review' && !isEditingSpecs) ? (
                        <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6 no-print">
                            <div className="text-center py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-nexo-lime/10 text-nexo-lime flex items-center justify-center text-3xl mx-auto shadow-[0_0_15px_rgba(204,255,0,0.1)] animate-pulse">
                                    ⏳
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">¡Especificaciones Recibidas!</h2>
                                    <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                                        Hola <span className="text-white font-semibold">{project.contact_name}</span>. Ya registramos los detalles de tu evento/producción. El productor está elaborando tu propuesta comercial a medida.
                                    </p>
                                </div>
                            </div>

                            {/* Banner de solicitud del productor */}
                            {project.admin_notes && (
                                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 flex gap-4 items-start animate-pulse-slow">
                                    <div className="text-2xl shrink-0">📋</div>
                                    <div className="space-y-1">
                                        <p className="text-amber-400 font-bold text-sm uppercase tracking-wide">Solicitud del Productor</p>
                                        <p className="text-amber-200 text-sm leading-relaxed whitespace-pre-wrap">{project.admin_notes}</p>
                                        <button
                                            onClick={() => setIsEditingSpecs(true)}
                                            className="mt-2 inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-lg transition-colors"
                                        >
                                            ✏️ Actualizar mis datos
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="bg-black/30 p-5 rounded-lg border border-white/5 space-y-3">
                                <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">🔔 Medio de Notificación Elegido:</h4>
                                <p className="text-sm font-bold text-nexo-lime">
                                    {notificationPref === 'both' && '💬 WhatsApp y 📧 Correo Electrónico'}
                                    {notificationPref === 'whatsapp' && '💬 Mensaje de WhatsApp'}
                                    {notificationPref === 'email' && '📧 Correo Electrónico'}
                                </p>
                                <p className="text-zinc-400 text-xs leading-relaxed">
                                    Te enviaremos una notificación automática en cuanto el presupuesto esté listo para revisar en este portal.
                                    {clientPhone && <span className="block mt-1">WhatsApp de contacto: <strong className="text-zinc-300">+{clientPhone.replace(/^\++/, '')}</strong></span>}
                                    <span className="block">Email registrado: <strong className="text-zinc-300">{project.client_email}</strong></span>
                                </p>
                            </div>

                            {/* Resumen de Especificaciones */}
                            <div className="border-t border-white/5 pt-6 space-y-4">
                                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Detalles de la producción solicitada:</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-2 text-zinc-400">
                                        <p>📅 <span className="font-medium text-zinc-500">Fecha tentativa:</span> <span className="text-white">{eventDate ? formatDateAR(eventDate) : 'A confirmar'}</span></p>
                                        <p>⏱️ <span className="font-medium text-zinc-500">Horario:</span> <span className="text-white">{eventTime || 'A confirmar'}{eventEndTime ? ` a ${eventEndTime}` : ''}</span></p>
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
                                    Contanos los detalles de tu evento/producción para que el equipo arme la cotización a medida. <br />
                                    <span className="text-nexo-lime font-medium mt-1 inline-block">* Los campos marcados con asterisco son obligatorios.</span>
                                </p>
                            </div>

                            {/* Banner de solicitud del productor (si existe) */}
                            {project.admin_notes && (
                                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-5 flex gap-4 items-start">
                                    <div className="text-2xl shrink-0">📋</div>
                                    <div className="space-y-1">
                                        <p className="text-amber-400 font-bold text-sm uppercase tracking-wide">Solicitud del Productor</p>
                                        <p className="text-amber-200 text-sm leading-relaxed whitespace-pre-wrap">{project.admin_notes}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleUpdateSpecifications} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tu Nombre / Contacto *</label>
                                        <input
                                            type="text"
                                            required
                                            value={contactName}
                                            onChange={(e) => setContactName(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                            placeholder="Ej: Sofía o Juan"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Nombre / Título del Evento *</label>
                                        <input
                                            type="text"
                                            required
                                            value={projectTitle}
                                            onChange={(e) => setProjectTitle(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                            placeholder="Ej: Boda de Sofía y Lucas / Lanzamiento Marca X"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Fecha Tentativa</label>
                                        <input
                                            type="date"
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Horario de Inicio</label>
                                        <input
                                            type="time"
                                            value={eventTime}
                                            onChange={(e) => {
                                                const start = e.target.value;
                                                setEventTime(start);
                                                if (eventEndTime) {
                                                    setCoverageHours(calculateHours(start, eventEndTime));
                                                }
                                            }}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Horario de Fin</label>
                                        <input
                                            type="time"
                                            value={eventEndTime}
                                            onChange={(e) => {
                                                const end = e.target.value;
                                                setEventEndTime(end);
                                                setCoverageHours(calculateHours(eventTime, end));
                                            }}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        />
                                    </div>
                                </div>

                                {/* Contacto y Preferencias de Notificación */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/5 pt-6">
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tu WhatsApp (para recibir avisos) *</label>
                                        <div className="flex gap-2 relative">
                                            <div className="relative shrink-0">
                                                <div 
                                                    onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
                                                    className="bg-black border border-white/10 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime w-[90px] flex items-center justify-between cursor-pointer"
                                                >
                                                    <span className={phoneCountryCode ? "text-white" : "text-zinc-500"}>{phoneCountryCode || 'Cód.'}</span>
                                                    <span className="text-[10px] text-zinc-500">▼</span>
                                                </div>
                                                
                                                {showPhoneDropdown && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setShowPhoneDropdown(false)}></div>
                                                        <div className="absolute top-full left-0 mt-1 w-[200px] bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                                            <div className="p-2 border-b border-white/10 relative z-50">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Buscar país o cód..." 
                                                                    value={phoneSearch}
                                                                    onChange={(e) => setPhoneSearch(e.target.value)}
                                                                    className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto relative z-50">
                                                                {COUNTRY_CODES.filter(c => c.name.toLowerCase().includes(phoneSearch.toLowerCase()) || c.code.includes(phoneSearch)).map((country, idx) => (
                                                                    <div 
                                                                        key={idx}
                                                                        onClick={() => {
                                                                            setPhoneCountryCode(country.code);
                                                                            setShowPhoneDropdown(false);
                                                                            setPhoneSearch('');
                                                                        }}
                                                                        className="px-3 py-2 text-xs text-zinc-300 hover:bg-nexo-lime hover:text-black cursor-pointer flex justify-between items-center"
                                                                    >
                                                                        <span>{country.name}</span>
                                                                        <span className="font-bold opacity-70">{country.code}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={phoneLocalNumber}
                                                onChange={(e) => setPhoneLocalNumber(e.target.value)}
                                                className="flex-1 min-w-0 bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                                placeholder="11 5892 2379"
                                            />
                                        </div>
                                        <span className="text-[10px] text-zinc-500 block mt-1">Ej: Código de país (tipo +54 9) y celular (11 5892 2379)</span>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tu Correo Electrónico *</label>
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
                                        ref={inputRef}
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        autoComplete="off"
                                        className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        placeholder="Ej: Salón Lahusen, CABA"
                                    />
                                    {/* Mapa: siempre renderizado para que Google Maps pueda inicializar */}
                                    <div className={`space-y-1 mt-2 ${isGoogleLoaded ? '' : 'hidden'}`}>
                                        <div id="map-preview" className="w-full h-44 rounded border border-white/10 overflow-hidden bg-zinc-950"></div>
                                        <p className="text-zinc-500 text-[10px] italic">📍 Mapa de referencia cargado mediante Google Maps</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                        <label className="text-amber-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                            <span>⏱️</span> Horas de Cobertura Estimadas
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={coverageHours}
                                            onChange={(e) => setCoverageHours(parseInt(e.target.value) || 0)}
                                            className="w-full bg-black/50 border border-amber-500/50 rounded px-4 py-2.5 text-lg font-bold text-amber-400 focus:outline-none focus:border-amber-400 shadow-inner"
                                        />
                                        <span className="text-[10px] text-amber-500/70 block mt-1 leading-tight">Obligatorio. Podés estimarlo e ir ajustándolo luego.</span>
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

                            {/* Zona de Ingesta de Documentos (IA) */}
                            <div className="mt-6 border-t border-white/5 pt-6 space-y-3">
                                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">⚡ ¿Tenés un pliego o briefing técnico?</h3>
                                <p className="text-zinc-500 text-[11px]">
                                    Subí tu pliego o briefing técnico en formato PDF o Word para adjuntarlo a tu solicitud de presupuesto.
                                </p>
                                
                                <div 
                                    onDragEnter={handleDrag}
                                    onDragOver={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                                        dragActive 
                                            ? 'border-nexo-lime bg-nexo-lime/5 shadow-[0_0_15px_rgba(204,255,0,0.1)]' 
                                            : 'border-white/10 hover:border-white/20 bg-black/20'
                                    }`}
                                >
                                    {uploadingDoc ? (
                                        <div className="space-y-3 py-2">
                                            <div className="w-8 h-8 border-4 border-nexo-lime border-t-transparent rounded-full animate-spin mx-auto"></div>
                                            <p className="text-xs text-nexo-lime font-bold uppercase tracking-widest animate-pulse">Subiendo pliego...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <span className="text-2xl block">📁</span>
                                            <p className="text-xs text-zinc-300">
                                                Arrastrá y soltá tu archivo PDF o Word acá, o{" "}
                                                <label className="text-nexo-lime cursor-pointer font-bold hover:underline">
                                                    buscalo en tu equipo
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept=".pdf,.doc,.docx"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                handleFileUpload(e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </p>
                                            <p className="text-[10px] text-zinc-500">PDF, DOC, DOCX (Máx. 5MB)</p>
                                        </div>
                                    )}
                                </div>
                                {uploadError && (
                                    <p className="text-red-400 text-[11px] mt-1 font-semibold">⚠️ {uploadError}</p>
                                )}
                                {uploadSuccess && (
                                    <p className="text-nexo-lime text-[11px] mt-1 font-semibold">✓ {uploadSuccess}</p>
                                )}

                                {/* Visualizador de pliego activo */}
                                {project.ai_extracted_requirements && project.ai_extracted_requirements.filename && (
                                    <div className="mt-4 bg-zinc-950 p-4 rounded-lg border border-white/5 flex items-center space-x-3 text-left">
                                        <span className="text-3xl shrink-0">📄</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-nexo-lime uppercase tracking-wider">Pliego Técnico Activo</p>
                                            <p className="text-xs text-white truncate font-medium mt-0.5">{project.ai_extracted_requirements.filename}</p>
                                            {project.ai_extracted_requirements.file_url && (
                                                <a 
                                                    href={project.ai_extracted_requirements.file_url} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="text-[10px] text-zinc-400 hover:text-white underline mt-1 block"
                                                >
                                                    Descargar archivo original
                                                </a>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">Cargado</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                )}

                {/* ESTADO 2: SENT (PRESUPUESTO RECIBIDO, PENDIENTE APROBACIÓN) */}
                {project.status === 'sent' && budget && (
                    actionView === 'approve_confirm' ? (
                        <form onSubmit={handleConfirmApproval} className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6 no-print">
                            <div className="space-y-2 border-b border-white/5 pb-4">
                                <h3 className="text-xl font-bold text-white uppercase tracking-tight">🧾 Confirmación de Aprobación</h3>
                                <p className="text-zinc-400 text-xs">
                                    Revisá los valores finales aprobados y cargá tus datos de facturación (opcionales) para finalizar la confirmación.
                                </p>
                            </div>

                            {/* Recálculo de Total en Tiempo Real (Resaltado) */}
                            {(() => {
                                const optionalItems = budget.items.filter(item => item.is_optional);
                                const selectedOptionalsTotal = optionalItems
                                    .filter((_, idx) => selectedOptionals.includes(idx))
                                    .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
                                const finalCalculatedTotal = budget.total_price + selectedOptionalsTotal;

                                return (
                                    <div className="bg-nexo-lime/10 border-2 border-nexo-lime p-6 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-center sm:text-left shadow-[0_0_20px_rgba(225,249,55,0.1)]">
                                        <div className="text-left space-y-1">
                                            <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black block">Monto Total Final a Facturar:</span>
                                            <span className="text-3xl font-black text-nexo-lime block">{project.currency || 'USD'} {finalCalculatedTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="text-xs text-zinc-400 max-w-xs leading-relaxed sm:text-right font-medium">
                                            {selectedOptionals.length > 0 
                                                ? `Incluye el servicio base y ${selectedOptionals.length} adicionales seleccionados.` 
                                                : "Incluye únicamente los servicios del presupuesto base."
                                            }
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Datos de Facturación (Opcional) */}
                            <div className="space-y-4 bg-black/20 p-5 rounded-lg border border-white/5 text-left">
                                <h4 className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">🧾 Datos de Facturación (Opcionales)</h4>
                                <p className="text-[11px] text-zinc-500 leading-normal">
                                    Si necesitás factura A o B, ingresá los datos fiscales y la constancia de CUIT/CUIL a continuación:
                                </p>
                                <textarea
                                    value={billingInfo}
                                    onChange={(e) => setBillingInfo(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-nexo-lime h-24"
                                    placeholder="Ej: Razón Social: Empresa S.A.&#10;CUIT: 30-12345678-9&#10;Dirección: Av. de Mayo 123, CABA"
                                />
                                <div className="space-y-2 border-t border-white/5 pt-3">
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">Adjuntar Constancia de CUIT/CUIL (Opcional - PDF, JPG, PNG)</label>
                                    <input
                                        type="file"
                                        onChange={handleTaxCertificateUpload}
                                        className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    {uploadingCertificate && (
                                        <p className="text-[10px] text-nexo-lime animate-pulse mt-1">Subiendo archivo...</p>
                                    )}
                                    {project.client_tax_certificate_url && (
                                        <p className="text-[10px] text-nexo-lime font-bold mt-1 flex items-center gap-1">
                                            <span>✓ Archivo cargado correctamente:</span>
                                            <a href={project.client_tax_certificate_url} target="_blank" rel="noreferrer" className="underline hover:text-white">Ver archivo actual</a>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-4 pt-4 border-t border-white/5">
                                <button
                                    type="submit"
                                    disabled={sendingAction || uploadingCertificate}
                                    className="flex-1 bg-nexo-lime text-black font-black text-xs uppercase tracking-widest py-4 rounded hover:bg-white transition-colors shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-50"
                                >
                                    {sendingAction ? 'Aprobando...' : 'Confirmar y Aprobar Propuesta'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActionView('normal')}
                                    className="flex-1 bg-zinc-950 border border-white/10 hover:border-white/20 text-white font-bold text-xs uppercase tracking-widest py-4 rounded transition-all"
                                >
                                    Volver
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {renderBudgetSection()}
                            
                            {/* Acciones Comerciales */}
                            {actionView === 'normal' && (
                                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5 no-print">
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
                                        onClick={handlePrintPDF}
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
                                <form onSubmit={handleFeedbackBudget} className="space-y-4 pt-4 border-t border-white/5 no-print">
                                    <div className="space-y-2 text-left">
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
                                <form onSubmit={handleRejectBudget} className="space-y-4 pt-4 border-t border-white/5 no-print text-left">
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
                    )
                )}

                {/* ESTADO 3: APPROVED O PRODUCTION (PROYECTO APROBADO, EN PROCESO DE PAGO Y RODAJE) */}
                {(project.status === 'approved' || project.status === 'production') && (
                    <div className="space-y-8">
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
                                            : project.status === 'production' 
                                                ? ' ¡Ya estamos trabajando en el rodaje y edición de tus materiales multimedia!'
                                                : ' El material ya ha sido finalizado y entregado.'}
                                    </p>
                                </div>
                                
                                <div className="border-t border-white/5 pt-4 text-xs text-zinc-500 flex justify-between items-center">
                                    <div>
                                        <p>Fecha del evento: <span className="text-zinc-300 font-bold">{project.event_date ? formatDateAR(project.event_date) : 'A confirmar'}</span></p>
                                        <p className="mt-1">Locación: <span className="text-zinc-300 font-bold">{project.location || 'A confirmar'}</span></p>
                                    </div>
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
                                    <div className="space-y-2 bg-black/20 p-4 rounded-lg border border-white/5">
                                        <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">Adjuntar Constancia de CUIT/CUIL (Opcional - PDF, JPG, PNG)</label>
                                        <input
                                            type="file"
                                            onChange={handleTaxCertificateUpload}
                                            className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-850 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                        />
                                        {uploadingCertificate && (
                                            <p className="text-[10px] text-nexo-lime animate-pulse mt-1">Subiendo archivo...</p>
                                        )}
                                        {project.client_tax_certificate_url && (
                                            <p className="text-[10px] text-nexo-lime font-bold mt-1.5 flex items-center gap-1">
                                                <span>✓ Constancia cargada:</span>
                                                <a href={project.client_tax_certificate_url} target="_blank" rel="noreferrer" className="underline hover:text-white">Ver archivo actual</a>
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={sendingAction}
                                        className="bg-nexo-lime hover:bg-white text-black font-bold text-xs uppercase py-2.5 px-6 rounded transition-all disabled:opacity-50 cursor-pointer"
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
                                
                                {project.bank_details && project.invoice_sent ? (
                                    <div className="space-y-4">
                                        <div className="bg-black p-4 border border-white/10 rounded text-[11px] leading-relaxed font-mono text-zinc-300">
                                            <p className="font-bold text-nexo-lime mb-1.5 uppercase">DATOS DE TRANSFERENCIA:</p>
                                            {project.bank_details}
                                        </div>

                                        <div className="text-xs">
                                            <span className="text-zinc-500">Monto del depósito:</span>
                                            <div className="text-xl font-black text-white mt-0.5">
                                                {project.currency || 'USD'} {project.invoice_amount ? project.invoice_amount.toLocaleString() : '0'} 
                                                <span className="text-[10px] text-zinc-500 font-normal ml-1">
                                                    ({project.invoice_type === 'deposit_50' ? '50% Seña' : project.invoice_type === 'total' ? '100% Total' : 'Concepto Asignado'})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-zinc-500 italic">
                                        La factura y los datos de pago se habilitarán una vez que el productor emita el comprobante.
                                    </p>
                                )}
                            </div>

                            {/* Botón de Descarga de Facturas y Notas de Crédito AFIP */}
                            <div>
                                {(() => {
                                    const rawHistory = Array.isArray(project.invoices_history) ? project.invoices_history : [];
                                    const history = rawHistory.filter((inv: any) => inv && inv.invoice_url);
                                    const fallbackList = project.invoice_url ? [{
                                        invoice_url: project.invoice_url,
                                        fc_number: project.invoice_fc_number,
                                        type: project.invoice_type || 'custom',
                                        amount: project.invoice_amount || 0
                                    }] : [];

                                    const docsToDisplay = history.length > 0 ? history : fallbackList;

                                    if (docsToDisplay.length === 0 || !project.invoice_sent) {
                                        return (
                                            <div className="text-center bg-white/5 border border-white/10 py-3 rounded text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                🧾 Factura en preparación
                                            </div>
                                        );
                                    }

                                    if (docsToDisplay.length === 1) {
                                        const inv = docsToDisplay[0];
                                        const isNC = inv.type === 'credit_note';
                                        const label = isNC ? 'Descargar Nota de Crédito PDF' : 'Descargar Factura PDF';
                                        return (
                                            <a
                                                href={inv.invoice_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`block text-center font-black text-xs uppercase tracking-widest py-3 rounded transition-colors ${
                                                    isNC
                                                        ? 'bg-amber-500 text-black hover:bg-white'
                                                        : 'bg-nexo-lime text-black hover:bg-white'
                                                }`}
                                            >
                                                {label} {inv.fc_number ? `(FC ${inv.fc_number})` : ''}
                                            </a>
                                        );
                                    }

                                    // Si hay múltiples comprobantes (ej: Factura + Nota de Crédito)
                                    return (
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                                                📄 Comprobantes Emitidos ({docsToDisplay.length}):
                                            </span>
                                            {docsToDisplay.map((inv: any, idx: number) => {
                                                const isNC = inv.type === 'credit_note';
                                                const typeLabel = isNC ? 'Nota de Crédito' : inv.type === 'deposit_50' ? 'Factura Seña 50%' : inv.type === 'total' ? 'Factura 100% Total' : 'Factura';
                                                const fcText = inv.fc_number ? `FC ${inv.fc_number}` : `Comprobante #${idx + 1}`;
                                                return (
                                                    <a
                                                        key={idx}
                                                        href={inv.invoice_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`flex items-center justify-between px-4 py-2.5 rounded font-extrabold text-xs uppercase tracking-wider transition-all border ${
                                                            isNC 
                                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' 
                                                                : 'bg-nexo-lime text-black border-nexo-lime hover:bg-white'
                                                        }`}
                                                    >
                                                        <span>📄 {typeLabel} ({fcText})</span>
                                                        <span className="text-[10px] font-mono">↗ Abrir PDF</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                    {renderBudgetSection()}
                </div>
                )}

                {/* ESTADO 4: DELIVERED (ENTREGA FINAL DE MATERIALES - INTEGRACION GOOGLE DRIVE) */}
                {project.status === 'delivered' && (
                    <div className="space-y-8">
                        {/* 1. Módulo de descargas directas (Material Finalizado) */}
                        <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6">
                            <div className="space-y-2 border-b border-white/5 pb-4 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">Material Final Finalizado</h2>
                                    <p className="text-zinc-400 text-xs">
                                        Previsualizá y descargá el material multimedia de tu producción directamente desde tu portal oficial.
                                    </p>
                                </div>
                                <span className="text-2xl">🎉</span>
                            </div>
                            {project.drive_folder_id ? (
                                <div className="bg-nexo-lime/5 border border-nexo-lime/20 hover:border-nexo-lime/50 rounded-xl p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-center group transition-all text-center sm:text-left">
                                    <div className="w-20 h-20 rounded-full bg-nexo-lime/10 flex-shrink-0 flex items-center justify-center relative shadow-[0_0_15px_rgba(204,255,0,0.1)]">
                                        <span className="text-4xl">📁</span>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <h4 className="font-extrabold text-xl text-white group-hover:text-nexo-lime transition-colors">
                                            Carpeta Principal de Entregas
                                        </h4>
                                        <p className="text-xs md:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                                            Aquí vas a encontrar todo el material final (videos, fotos, recursos) organizado en subcarpetas. Podés ingresar para <strong>previsualizar</strong> los archivos, <strong>descargarlos</strong> directamente o <strong>compartir este enlace</strong> con tu equipo y clientes.
                                        </p>
                                        <div className="flex flex-wrap gap-3 mt-4 justify-center sm:justify-start">
                                            <a
                                                href={`https://drive.google.com/drive/folders/${project.drive_folder_id}?usp=drive_link`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-nexo-lime text-black font-extrabold uppercase tracking-widest text-[10px] md:text-xs px-6 py-3 rounded-lg hover:bg-[#b3ff00] hover:scale-105 transition-all shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                                            >
                                                🔗 Abrir Carpeta en Drive
                                            </a>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(`https://drive.google.com/drive/folders/${project.drive_folder_id}?usp=drive_link`);
                                                    const btn = e.currentTarget;
                                                    const originalText = btn.innerHTML;
                                                    btn.innerHTML = '¡Enlace Copiado!';
                                                    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                                                }}
                                                className="bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider text-[10px] md:text-xs px-6 py-3 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all"
                                            >
                                                Copiar Enlace
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-zinc-500 text-xs font-bold uppercase tracking-wider border border-white/5 bg-black/20 rounded-xl">
                                    📭 Aún no se ha vinculado la carpeta de entrega para este proyecto.
                                </div>
                            )}
                        </div>

                        {/* 2. Módulo de Encuesta de Satisfacción Opcional (Oculto si ya respondió) */}
                        {!hasReviewed && !surveySuccess && (
                            <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6">
                                <div className="space-y-2 border-b border-white/5 pb-4">
                                    <h3 className="text-lg font-bold text-white uppercase tracking-tight">⭐ Tu opinión nos ayuda a mejorar</h3>
                                    <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                                        ¡Gracias por confiar en NexoFilm! Tu feedback nos ayuda a seguir perfeccionando nuestras producciones. Esta encuesta es totalmente opcional y te llevará menos de un minuto.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmitReview} className="space-y-6 bg-black/30 p-5 rounded-lg border border-white/5">
                                    {/* Estrellas */}
                                    <div className="space-y-2">
                                        <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider">Calificación General</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setSurveyRating(star)}
                                                    onMouseEnter={() => setSurveyHover(star)}
                                                    onMouseLeave={() => setSurveyHover(0)}
                                                    className="text-2xl transition-all hover:scale-110 cursor-pointer focus:outline-none"
                                                >
                                                    <span className={star <= (surveyHover || surveyRating) ? 'text-nexo-lime' : 'text-zinc-700'}>
                                                        ★
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* NPS (0-10) */}
                                    <div className="space-y-2">
                                        <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider">¿Qué tan probable es que nos recomiendes con un colega o amigo? (0 al 10)</label>
                                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                                <button
                                                    key={num}
                                                    type="button"
                                                    onClick={() => setSurveyNps(num)}
                                                    className={`w-8 h-8 rounded text-xs font-bold transition-all border ${
                                                        surveyNps === num 
                                                            ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.3)]' 
                                                            : 'bg-black text-zinc-400 border-white/10 hover:border-white/20'
                                                    }`}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-[9px] text-zinc-500 max-w-sm pt-1">
                                            <span>Extremadamente improbable</span>
                                            <span>Muy probable</span>
                                        </div>
                                    </div>

                                    {/* Tipo de Cobertura */}
                                    <div className="space-y-2">
                                        <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider">¿Qué tipo de cobertura contrataste? <span className="text-zinc-600 font-normal normal-case">(Opcional)</span></label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Fotografía', 'Video', 'Streaming en Vivo', 'Foto + Video', 'Foto + Video + Streaming', 'Notas / Testimonios', 'Otro'].map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => setSurveyCoverageType(surveyCoverageType === opt ? '' : opt)}
                                                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${
                                                        surveyCoverageType === opt
                                                            ? 'bg-nexo-lime text-black border-nexo-lime shadow-[0_0_12px_rgba(204,255,0,0.3)]'
                                                            : 'bg-black text-zinc-400 border-white/10 hover:border-nexo-lime/40 hover:text-white'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tipo de Evento */}
                                    <div className="space-y-2">
                                        <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider">¿Qué tipo de evento fue? <span className="text-zinc-600 font-normal normal-case">(Opcional)</span></label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Corporativo', 'Campaña Publicitaria', 'Evento Social', 'Presentación de Producto', 'Cobertura Deportiva', 'Cobertura de Exposiciones', 'Otro'].map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => setSurveyEventType(surveyEventType === opt ? '' : opt)}
                                                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${
                                                        surveyEventType === opt
                                                            ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                                                            : 'bg-black text-zinc-400 border-white/10 hover:border-[#00e5ff]/40 hover:text-white'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Comentarios */}
                                    <div className="space-y-2">
                                        <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider">¿Querés dejarnos algún comentario o sugerencia? (Opcional)</label>
                                        <textarea
                                            value={surveyText}
                                            onChange={(e) => setSurveyText(e.target.value)}
                                            className="w-full bg-black border border-white/10 rounded px-4 py-2 text-xs text-white focus:outline-none focus:border-nexo-lime h-20 resize-none"
                                            placeholder="Tu experiencia con el rodaje, edición, puntualidad..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={sendingAction}
                                        className="bg-nexo-lime text-black font-black text-xs uppercase tracking-widest py-3 px-6 rounded hover:bg-white transition-colors disabled:opacity-50"
                                    >
                                        {sendingAction ? 'Enviando...' : 'Enviar opinión'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* 3. Módulo de Facturación, Saldos y Datos de Pago */}
                        <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6">
                            <div className="space-y-2 border-b border-white/5 pb-4">
                                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Estado de Facturación y Pago</h3>
                                <p className="text-xs text-zinc-400">
                                    Resumen de las facturas emitidas, saldos pendientes y datos para realizar transferencias.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Historial de Facturas y Saldos */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Historial y Saldos</h4>
                                    
                                    {(() => {
                                        const totalBudget = budget ? budget.total_price : 0;
                                        const history = project.invoices_history || [];
                                        
                                        // Support legacy invoice if history is empty but there's a main invoice
                                        const displayInvoices = history.length > 0 ? history : (
                                            project.invoice_url ? [{
                                                amount: project.invoice_amount || 0,
                                                type: project.invoice_type || 'custom',
                                                invoice_url: project.invoice_url,
                                                date_sent: new Date().toISOString()
                                            }] : []
                                        );

                                        const totalInvoiced = displayInvoices.reduce((sum: number, inv: any) => {
                                            const amt = Number(inv.amount) || 0;
                                            return inv.type === 'credit_note' ? sum - amt : sum + amt;
                                        }, 0);
                                        const remaining = Math.max(0, totalBudget - totalInvoiced);
                                        const currency = project.currency || 'ARS';

                                        return (
                                            <div className="bg-black/40 border border-white/5 rounded-lg p-4 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Resumen de Cuenta</span>
                                                    {totalBudget > 0 && (
                                                        <span className="text-[10px] text-zinc-500">Cotización Total: <span className="text-zinc-300 font-bold">{currency} {totalBudget.toLocaleString()}</span></span>
                                                    )}
                                                </div>

                                                {displayInvoices.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {displayInvoices.map((inv: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between text-[11px] py-1.5 border-b border-white/5 last:border-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-zinc-500">#{idx + 1}</span>
                                                                    {inv.fc_number && <span className="font-mono text-nexo-lime font-bold">FC {inv.fc_number}</span>}
                                                                    <span className="text-zinc-400">
                                                                        {inv.type === 'credit_note' ? 'Nota de Crédito' : inv.type === 'deposit_50' ? '50% Seña' : inv.type === 'total' ? '100% Total' : 'Concepto Asignado'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`font-bold ${inv.type === 'credit_note' ? 'text-amber-400 font-mono' : 'text-white'}`}>
                                                                        {inv.type === 'credit_note' ? '-' : ''}{currency} {(inv.amount || 0).toLocaleString()}
                                                                    </span>
                                                                    {inv.invoice_url && (
                                                                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wide transition-colors">
                                                                            📄 Descargar PDF
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        
                                                        <div className="flex justify-between items-center pt-3 mt-2 border-t border-white/10">
                                                            <span className="text-[10px] font-bold uppercase text-zinc-400">Total facturado:</span>
                                                            <span className="text-white font-black text-sm">{currency} {totalInvoiced.toLocaleString()}</span>
                                                        </div>
                                                        
                                                        {totalBudget > 0 && (
                                                            <div className={`flex justify-between items-center rounded px-3 py-2 mt-2 ${remaining > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                                                                <span className={`text-[10px] font-bold uppercase ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                                    {remaining > 0 ? '⏳ Saldo pendiente a facturar:' : '✅ Totalmente facturado'}
                                                                </span>
                                                                {remaining > 0 && (
                                                                    <span className="text-amber-300 font-black text-sm">{currency} {remaining.toLocaleString()}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 text-zinc-500 text-xs italic border border-white/5 rounded">
                                                        Aún no se han emitido facturas.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Datos Bancarios y de Pago */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Datos para Pagos</h4>
                                    {project.bank_details ? (
                                        <div className="bg-black p-4 border border-white/10 rounded text-xs leading-relaxed font-mono text-zinc-300">
                                            <p className="font-bold text-nexo-lime mb-2 uppercase tracking-wider">Datos de transferencia:</p>
                                            <div className="whitespace-pre-wrap">{project.bank_details}</div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-zinc-500 italic bg-black/40 p-4 rounded border border-white/5">
                                            Los datos bancarios no han sido especificados o la factura está en preparación.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 4. Presupuesto Detallado */}
                        {renderBudgetSection()}
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
            </div>
        )}

            </main>

            {/* === CAJA DE CONSULTAS + WHATSAPP === */}
            {/* Visible en TODOS los estados excepto rejected */}
            {viewMode === 'detail' && project && project.status !== 'rejected' && (
                <div className="container mx-auto px-4 md:px-6 pb-10 max-w-4xl no-print">
                    <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-white/10 p-6 md:p-8 rounded-2xl shadow-2xl space-y-5 overflow-hidden">
                        {/* Glow decorativo */}
                        <div className="absolute top-0 left-0 w-48 h-48 bg-nexo-lime/3 rounded-full blur-3xl pointer-events-none"></div>

                        {/* Header */}
                        <div className="relative flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-nexo-lime/10 border border-nexo-lime/20 flex items-center justify-center shrink-0 text-lg">
                                💬
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tight">¿Tenés alguna consulta u observación?</h3>
                                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                                    Escribinos acá y te respondemos a la brevedad. El equipo de producción recibe tu mensaje al instante por email.
                                </p>
                            </div>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleSubmitNotes} className="relative space-y-3">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime/50 focus:shadow-[0_0_15px_rgba(204,255,0,0.08)] h-24 resize-none placeholder:text-zinc-600 transition-all"
                                placeholder="Ej: ¿Cuándo tendremos la propuesta lista? / Quiero agregar un servicio extra / Tengo una consulta sobre la fecha..."
                            />
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={sendingAction || !noteText.trim()}
                                    className="flex-1 sm:flex-none bg-nexo-lime hover:bg-white text-black font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-[0_0_25px_rgba(204,255,0,0.3)]"
                                >
                                    {sendingAction ? 'Enviando...' : '📨 Enviar Consulta'}
                                </button>

                                {/* Botón WhatsApp — al lado del formulario */}
                                {(() => {
                                    const coverageLabel = project.coverage_types && project.coverage_types.length > 0
                                        ? project.coverage_types.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' + ')
                                        : 'Servicio por confirmar';
                                    const dateLabel = project.event_date ? `📅 ${formatDateAR(project.event_date)}` : '📅 Fecha por confirmar';
                                    const statusLabels: Record<string, string> = {
                                        draft: 'completando detalles',
                                        review: 'en revisión por producción',
                                        sent: 'presupuesto enviado para revisión',
                                        approved: 'aprobado, en coordinación',
                                        production: 'en producción / rodaje',
                                        delivered: 'entregado'
                                    };
                                    const waMessage = [
                                        `¡Hola Martín! Te escribe ${project.contact_name} desde el portal de NexoFilm.`,
                                        ``,
                                        `📋 Proyecto: ${project.title || 'Nueva solicitud'}`,
                                        `🎬 Servicio: ${coverageLabel}`,
                                        dateLabel,
                                        project.location ? `📍 Lugar: ${project.location}` : '',
                                        `📊 Estado: ${statusLabels[project.status] || project.status}`,
                                        ``,
                                        `Mi consulta es:`
                                    ].filter(Boolean).join('\n');
                                    const waUrl = `https://wa.me/5491151191964?text=${encodeURIComponent(waMessage)}`;
                                    return (
                                        <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1da851] text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(37,211,102,0.25)] hover:shadow-[0_0_30px_rgba(37,211,102,0.45)] no-print"
                                            aria-label="Consultar por WhatsApp"
                                        >
                                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.539 2.016 2.126-.54c1.029.563 2.025.873 3.162.873h.001c3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.766-5.769-5.766zm3.446 8.212c-.149.427-.853.793-1.182.844-.33.051-.739.065-1.196-.082-.321-.102-.732-.249-1.25-.472-2.189-.941-3.605-3.111-3.715-3.26-.111-.148-.901-1.189-.901-2.285 0-1.096.579-1.636.786-1.859.207-.223.452-.279.601-.279.15 0 .301.001.433.007.145.007.337-.056.527.391.197.464.673 1.636.732 1.756.06.119.098.258.02.417-.079.158-.119.258-.237.396-.118.138-.248.309-.354.415-.119.119-.244.249-.105.487.139.238.618 1.017 1.328 1.647.915.811 1.687 1.061 1.925 1.179.238.119.377.099.516-.06.138-.159.595-.694.754-.933.159-.238.317-.198.536-.119.217.079 1.373.648 1.611.767.238.119.396.178.455.277.06.101.06.58-.089 1.008z"/>
                                            </svg>
                                            Consultar por WhatsApp
                                        </a>
                                    );
                                })()}
                            </div>
                        </form>

                        {/* Última consulta enviada */}
                        {project.client_notes && (
                            <div className="relative bg-black/30 p-4 border border-nexo-lime/10 rounded-xl text-xs text-zinc-400">
                                <span className="text-[9px] font-black text-nexo-lime/70 uppercase tracking-widest block mb-1.5">📋 Última consulta enviada</span>
                                <span className="italic text-zinc-300">"{project.client_notes}"</span>
                            </div>
                        )}
                    </div>
                </div>
            )}



            {/* CONTENEDOR DE IMPRESIÓN (OCULTO EN PANTALLA POR CSS) */}
            {budget && (
                <div id="print-proposal" style={{ fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: '#000000', color: '#ffffff', padding: '36px 44px', boxSizing: 'border-box', maxWidth: '780px', margin: '0 auto' }}>
                    
                    {/* ── MEMBRETE ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e1f937', paddingBottom: '18px', marginBottom: '24px' }}>
                        <div>
                            <img src="/img/logo.png" alt="NexoFilm" style={{ height: '32px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
                            <p style={{ fontSize: '9px', color: '#888888', fontWeight: '600', margin: '5px 0 0 0', textTransform: 'uppercase', letterSpacing: '2.5px', fontFamily: 'Arial, Helvetica, sans-serif' }}>Productora Audiovisual</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#e1f937', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Arial, Helvetica, sans-serif' }}>Propuesta Comercial</h2>
                            <p style={{ fontSize: '10px', color: '#a0a0a0', margin: 0, fontFamily: 'Arial, Helvetica, sans-serif' }}>Fecha de Emisión: {new Date().toLocaleDateString('es-AR')}</p>
                        </div>
                    </div>

                    {/* ── CLIENTE + PROYECTO ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '14px 16px', borderRadius: '4px' }}>
                            <h3 style={{ fontSize: '9px', fontWeight: '700', color: '#e1f937', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #222222', paddingBottom: '6px', marginTop: 0, marginBottom: '10px', fontFamily: 'Arial, Helvetica, sans-serif' }}>Datos del Cliente</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr><td style={{ fontSize: '10px', color: '#888', paddingBottom: '4px', width: '70px', fontFamily: 'Arial, Helvetica, sans-serif', verticalAlign: 'top' }}>Contacto</td><td style={{ fontSize: '10px', color: '#fff', paddingBottom: '4px', fontWeight: '600', fontFamily: 'Arial, Helvetica, sans-serif' }}>{project.contact_name}</td></tr>
                                    {project.company_name && <tr><td style={{ fontSize: '10px', color: '#888', paddingBottom: '4px', fontFamily: 'Arial, Helvetica, sans-serif', verticalAlign: 'top' }}>Empresa</td><td style={{ fontSize: '10px', color: '#fff', paddingBottom: '4px', fontWeight: '600', fontFamily: 'Arial, Helvetica, sans-serif' }}>{project.company_name}</td></tr>}
                                    <tr><td style={{ fontSize: '10px', color: '#888', paddingBottom: '4px', fontFamily: 'Arial, Helvetica, sans-serif', verticalAlign: 'top' }}>Email</td><td style={{ fontSize: '10px', color: '#a0a0a0', paddingBottom: '4px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{project.client_email}</td></tr>
                                    {project.client_phone && <tr><td style={{ fontSize: '10px', color: '#888', fontFamily: 'Arial, Helvetica, sans-serif', verticalAlign: 'top' }}>WhatsApp</td><td style={{ fontSize: '10px', color: '#a0a0a0', fontFamily: 'Arial, Helvetica, sans-serif' }}>+{project.client_phone.replace(/^\++/, '')}</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '14px 16px', borderRadius: '4px' }}>
                            <h3 style={{ fontSize: '9px', fontWeight: '700', color: '#e1f937', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #222222', paddingBottom: '6px', marginTop: 0, marginBottom: '10px', fontFamily: 'Arial, Helvetica, sans-serif' }}>Detalles de Propuesta</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr><td style={{ fontSize: '10px', color: '#888', paddingBottom: '4px', width: '80px', fontFamily: 'Arial, Helvetica, sans-serif', verticalAlign: 'top' }}>Proyecto</td><td style={{ fontSize: '10px', color: '#fff', paddingBottom: '4px', fontWeight: '600', fontFamily: 'Arial, Helvetica, sans-serif' }}>{project.title}</td></tr>
                                    <tr><td style={{ fontSize: '10px', color: '#888', paddingBottom: '4px', fontFamily: 'Arial, Helvetica, sans-serif', verticalAlign: 'top' }}>Estado</td><td style={{ fontSize: '10px', color: '#fff', paddingBottom: '4px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{project.status === 'approved' ? 'Aprobado' : project.status === 'production' ? 'En Producción' : project.status === 'delivered' ? 'Entregado' : 'Pendiente de Aprobación'}</td></tr>
                                    <tr><td style={{ fontSize: '10px', color: '#888', fontFamily: 'Arial, Helvetica, sans-serif', verticalAlign: 'top' }}>N° Proyecto</td><td style={{ fontSize: '10px', color: '#a0a0a0', fontFamily: 'Arial, Helvetica, sans-serif' }}>#{project.id.slice(0, 8).toUpperCase()}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── ESPECIFICACIONES DEL RODAJE ── */}
                    {(project.event_date || project.location) && (
                        <div style={{ background: '#0d0d0d', border: '1px solid #2a2a2a', padding: '14px 16px', borderRadius: '4px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '9px', fontWeight: '700', color: '#e1f937', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #222222', paddingBottom: '6px', marginTop: 0, marginBottom: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                                Especificaciones del Rodaje / Cobertura
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 30px' }}>
                                {project.event_date && <div style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif' }}><span style={{ color: '#888' }}>Fecha: </span><span style={{ color: '#fff', fontWeight: '600' }}>{formatDateAR(project.event_date)}</span></div>}
                                {project.event_time && <div style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif' }}><span style={{ color: '#888' }}>Horario: </span><span style={{ color: '#fff', fontWeight: '600' }}>{project.event_time}{project.event_end_time ? ` a ${project.event_end_time}` : ''}</span></div>}
                                {project.coverage_hours != null && <div style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif' }}><span style={{ color: '#888' }}>Jornada: </span><span style={{ color: '#fff', fontWeight: '600' }}>{project.coverage_hours} hs</span></div>}
                                {project.guests_count != null && <div style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif' }}><span style={{ color: '#888' }}>Invitados: </span><span style={{ color: '#fff', fontWeight: '600' }}>{project.guests_count} personas</span></div>}
                                {project.location && <div style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', gridColumn: '1 / -1', marginTop: '2px' }}><span style={{ color: '#888' }}>Locación: </span><span style={{ color: '#fff', fontWeight: '600' }}>{project.location}</span></div>}
                                {project.coverage_types && project.coverage_types.length > 0 && <div style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', gridColumn: '1 / -1' }}><span style={{ color: '#888' }}>Servicios: </span><span style={{ color: '#fff', fontWeight: '600', textTransform: 'capitalize' }}>{project.coverage_types.join(', ')}</span></div>}
                            </div>
                        </div>
                    )}

                    {/* ── TABLA DE PRESUPUESTO ── */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '9px', fontWeight: '700', color: '#e1f937', textTransform: 'uppercase', letterSpacing: '1.5px', paddingBottom: '6px', marginTop: 0, marginBottom: '0', fontFamily: 'Arial, Helvetica, sans-serif', borderBottom: '1px solid #2a2a2a' }}>
                            Presupuesto de Servicios
                        </h3>

                        {/* BASE — solo items[0] */}
                        {budget.items[0] && (() => {
                            const bi = budget.items[0];
                            const baseAmt = bi.quantity * bi.unit_price;
                            return (
                                <div style={{ background: 'rgba(225,249,55,0.03)', border: '1px solid rgba(225,249,55,0.12)', borderTop: 'none' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: 'auto' }} />
                                            <col style={{ width: '48px' }} />
                                            <col style={{ width: '120px' }} />
                                            <col style={{ width: '120px' }} />
                                        </colgroup>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                                                <th style={{ fontSize: '9px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '9px 12px', textAlign: 'left', fontFamily: 'Arial, Helvetica, sans-serif' }}>Descripción del Concepto</th>
                                                <th style={{ fontSize: '9px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '9px 6px', textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif' }}>Cant.</th>
                                                <th style={{ fontSize: '9px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '9px 12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif' }}>Precio Unit.</th>
                                                <th style={{ fontSize: '9px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '9px 12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif' }}>Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ padding: '14px 12px', verticalAlign: 'top', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                                                    <div style={{ marginBottom: '7px' }}>
                                                        <span style={{ display: 'inline-block', fontSize: '7px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', color: '#000', background: '#e1f937', padding: '2px 7px', borderRadius: '2px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                                                            Presupuesto Base
                                                        </span>
                                                    </div>
                                                    {renderDescription(bi.description, true)}
                                                </td>
                                                <td style={{ fontSize: '11px', color: '#fff', padding: '14px 6px', textAlign: 'center', verticalAlign: 'top', fontFamily: 'Arial, Helvetica, sans-serif' }}>{bi.quantity}</td>
                                                <td style={{ fontSize: '11px', color: '#aaa', padding: '14px 12px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'Arial, Helvetica, sans-serif', wordBreak: 'keep-all' }}>{project.currency || 'ARS'} {bi.unit_price.toLocaleString('es-AR')}</td>
                                                <td style={{ fontSize: '13px', color: '#e1f937', padding: '14px 12px', textAlign: 'right', verticalAlign: 'top', fontWeight: '900', fontFamily: 'Arial, Helvetica, sans-serif', wordBreak: 'keep-all' }}>{project.currency || 'ARS'} {baseAmt.toLocaleString('es-AR')}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '2px solid #e1f937', padding: '10px 12px', gap: '16px', background: 'rgba(225,249,55,0.05)' }}>
                                        <span style={{ fontSize: '10px', color: '#ccc', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px', fontFamily: 'Arial, Helvetica, sans-serif' }}>Presupuesto Base (Monto a Aprobar):</span>
                                        <span style={{ fontSize: '15px', color: '#e1f937', fontWeight: '900', fontFamily: 'Arial, Helvetica, sans-serif', whiteSpace: 'nowrap' }}>{project.currency || 'ARS'} {baseAmt.toLocaleString('es-AR')}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ADICIONALES — items.slice(1) */}
                        {budget.items.slice(1).length > 0 && (
                            <div style={{ marginTop: '22px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }}></div>
                                    <span style={{ fontSize: '8px', color: '#888', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700', fontFamily: 'Arial, Helvetica, sans-serif', whiteSpace: 'nowrap' }}>Adicionales Sugeridos (Opcionales)</span>
                                    <div style={{ flex: 1, height: '1px', background: '#2a2a2a' }}></div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #2a2a2a', tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col style={{ width: 'auto' }} />
                                        <col style={{ width: '48px' }} />
                                        <col style={{ width: '120px' }} />
                                        <col style={{ width: '120px' }} />
                                    </colgroup>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #2a2a2a', background: '#0d0d0d' }}>
                                            <th style={{ fontSize: '9px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 12px', textAlign: 'left', fontFamily: 'Arial, Helvetica, sans-serif' }}>Servicio Opcional</th>
                                            <th style={{ fontSize: '9px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 6px', textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif' }}>Cant.</th>
                                            <th style={{ fontSize: '9px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif' }}>Precio Unit.</th>
                                            <th style={{ fontSize: '9px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif' }}>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {budget.items.slice(1).map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: idx < budget.items.slice(1).length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                                                <td style={{ padding: '12px 12px', verticalAlign: 'top', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                                                    {renderDescription(item.description, true)}
                                                </td>
                                                <td style={{ fontSize: '11px', color: '#ccc', padding: '12px 6px', textAlign: 'center', verticalAlign: 'top', fontFamily: 'Arial, Helvetica, sans-serif' }}>{item.quantity}</td>
                                                <td style={{ fontSize: '11px', color: '#aaa', padding: '12px 12px', textAlign: 'right', verticalAlign: 'top', fontFamily: 'Arial, Helvetica, sans-serif', wordBreak: 'keep-all' }}>{project.currency || 'ARS'} {item.unit_price.toLocaleString('es-AR')}</td>
                                                <td style={{ fontSize: '11px', color: '#e1f937', padding: '12px 12px', textAlign: 'right', verticalAlign: 'top', fontWeight: '700', fontFamily: 'Arial, Helvetica, sans-serif', wordBreak: 'keep-all' }}>{project.currency || 'ARS'} {(item.quantity * item.unit_price).toLocaleString('es-AR')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── CONDICIONES DE PAGO ── */}
                    {budget.payment_terms && (
                        <div style={{ marginBottom: '28px' }}>
                            <h3 style={{ fontSize: '9px', fontWeight: '700', color: '#e1f937', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid #2a2a2a', paddingBottom: '6px', marginTop: 0, marginBottom: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                                Términos y Condiciones de Pago
                            </h3>
                            <div style={{ borderLeft: '3px solid #e1f937', backgroundColor: '#0d0d0d', padding: '12px 16px', borderRadius: '0 4px 4px 0', fontSize: '10px', color: '#cccccc', lineHeight: '1.7', whiteSpace: 'pre-line', fontFamily: 'Arial, Helvetica, sans-serif', wordBreak: 'break-word' }}>
                                {budget.payment_terms}
                            </div>
                        </div>
                    )}

                    {/* ── PIE DE PÁGINA ── */}
                    <div style={{ marginTop: '36px', borderTop: '1px solid #2a2a2a', paddingTop: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '10px', fontSize: '10px', color: '#888888', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>🌐 www.nexofilm.com</span>
                            <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>✉ hola@nexofilm.com</span>
                            <span style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>📸 @nexofilm.co</span>
                        </div>
                        <p style={{ fontSize: '8px', color: '#555555', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                            Cotización comercial confidencial · Uso exclusivo del destinatario
                        </p>
                        <p style={{ fontSize: '8px', color: '#555555', margin: '3px 0 0 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                            NexoFilm Productora Audiovisual · Buenos Aires, Argentina
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const getWelcomeGreeting = (fullName: string) => {
    if (!fullName) return 'Bienvenido';
    const firstName = fullName.trim().split(/[\s,.-]+/)[0].toLowerCase();
    
    // Nombres femeninos comunes que no terminan en 'a' en español
    const femaleExceptions = [
        'sol', 'belen', 'belén', 'ines', 'inés', 'luz', 'flor', 'carmen', 
        'pilar', 'mercedes', 'consuelo', 'rosario', 'rocio', 'rocío', 'abril', 
        'azul', 'marian', 'raquel', 'ruth', 'esther', 'noemi', 'noemí', 'iris',
        'natally', 'nataly', 'natali', 'natalie'
    ];
    
    // Nombres masculinos comunes que terminan en 'a' en español
    const maleExceptions = [
        'luca', 'lucas', 'bautista', 'tomas', 'tomás', 'matias', 'matías', 
        'nicolas', 'nicolás', 'elias', 'elías', 'josias', 'josías', 'zacarias', 'zacarías'
    ];

    if (maleExceptions.includes(firstName)) {
        return 'Bienvenido';
    }
    
    if (firstName.endsWith('a') || femaleExceptions.includes(firstName)) {
        return 'Bienvenida';
    }
    
    return 'Bienvenido';
};

const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 4;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 4;
    
    let diffMs = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMs < 0) {
        diffMs += 24 * 60; // cruce de medianoche
    }
    const hours = diffMs / 60;
    return Number(hours.toFixed(1));
};

export default ClientPortal;
