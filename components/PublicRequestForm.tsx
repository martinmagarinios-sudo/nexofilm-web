import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 4;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = h2 - h1 + (m2 - m1) / 60;
    if (diff < 0) diff += 24;
    return Math.max(1, Math.round(diff));
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

const AVAILABLE_SERVICES = [
    { id: 'video', label: 'Video Comercial / Corp.', icon: '🎬' },
    { id: 'foto', label: 'Fotografía Profesional', icon: '📸' },
    { id: 'streaming', label: 'Streaming en Vivo', icon: '📡' },
    { id: 'ia_video', label: 'Producción con IA', icon: '⚡' },
    { id: 'tecnica', label: 'Técnica & Pantallas', icon: '🎛️' },
    { id: 'otros', label: 'Otros Servicios', icon: '✨' },
];

const PublicRequestForm: React.FC = () => {
    const { t } = useTranslation();
    const [projectTitle, setProjectTitle] = useState('');
    const [contactName, setContactName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventEndTime, setEventEndTime] = useState('');
    const [location, setLocation] = useState('');
    const [coverageHours, setCoverageHours] = useState<number>(4);
    const [coverageTypes, setCoverageTypes] = useState<string[]>([]);
    const [guestsCount, setGuestsCount] = useState<number | ''>('');
    const [phoneCountryCode, setPhoneCountryCode] = useState('+54 9');
    const [phoneLocalNumber, setPhoneLocalNumber] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientNotes, setClientNotes] = useState('');

    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const [dragActive, setDragActive] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<any>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
    const [phoneSearch, setPhoneSearch] = useState('');

    // Carga dinámica de Google Maps
    useEffect(() => {
        const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
        if (!apiKey) {
            console.warn("VITE_GOOGLE_MAPS_API_KEY no configurada. Desactivando sugerencias de mapa.");
            return;
        }

        if ((window as any).google && (window as any).google.maps) {
            setIsGoogleLoaded(true);
            return;
        }

        const scriptId = 'google-maps-places-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
            script.async = true;
            script.defer = true;

            (window as any).initGoogleMapsCallback = () => {
                setIsGoogleLoaded(true);
            };

            document.head.appendChild(script);
        } else {
            const interval = setInterval(() => {
                if ((window as any).google && (window as any).google.maps) {
                    clearInterval(interval);
                    setIsGoogleLoaded(true);
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, []);

    useEffect(() => {
        if (isGoogleLoaded && inputRef.current) {
            const google = (window as any).google;
            if (!google || !google.maps || !google.maps.places) return;

            try {
                const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
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
                        if (place.geometry && place.geometry.location && mapRef.current) {
                            mapRef.current.setCenter(place.geometry.location);
                            if (markerRef.current) {
                                markerRef.current.setPosition(place.geometry.location);
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
        }
    }, [isGoogleLoaded]);

    useEffect(() => {
        if (isGoogleLoaded && location) {
            const timer = setTimeout(() => {
                updateMap(location);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [location, isGoogleLoaded]);

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
                        { elementType: "geometry", stylers: [{ color: "#121212" }] },
                        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#777777" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#121212" }] },
                        { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#444444" }] },
                        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#181818" }] },
                        { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#222222" }] },
                        { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
                        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0a0a" }] }
                    ]
                });

                markerRef.current = new google.maps.Marker({
                    map: mapRef.current,
                    icon: {
                        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                        fillColor: '#bfe023',
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

    const toggleCoverageType = (type: string) => {
        setCoverageTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleFileSelect = (file: File) => {
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

        setUploadError('');
        setSelectedFile(file);
        setUploadSuccess('Archivo seleccionado: ' + file.name);
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
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileUpload = async (file: File, token: string) => {
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64String = (reader.result as string).split(',')[1];
                try {
                    const res = await fetch('/api/comercial/client', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-client-token': token
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
                    resolve();
                } catch (err: any) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('sending');
        setErrorMsg('');

        try {
            if (coverageTypes.length === 0) {
                setFormStatus('idle');
                setErrorMsg('Por favor seleccioná al menos un servicio requerido.');
                return;
            }

            const combinedPhone = phoneCountryCode && phoneLocalNumber ? `${phoneCountryCode} ${phoneLocalNumber}` : phoneLocalNumber || '';

            const res = await fetch('/api/comercial/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_public_lead',
                    specifications: {
                        title: projectTitle,
                        contact_name: contactName,
                        event_date: eventDate,
                        event_time: eventTime,
                        event_end_time: eventEndTime,
                        location: location,
                        coverage_types: coverageTypes,
                        coverage_hours: coverageHours,
                        client_phone: combinedPhone,
                        client_email: clientEmail,
                        guests_count: guestsCount === '' ? null : guestsCount,
                        client_notes: clientNotes
                    }
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Error al enviar la solicitud');
            }

            if (selectedFile && data.project && data.project.access_token) {
                try {
                    await handleFileUpload(selectedFile, data.project.access_token);
                } catch (uploadErr) {
                    console.error("Error al subir el archivo:", uploadErr);
                }
            }

            setFormStatus('success');
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || 'Error de conexión. Inténtalo más tarde.');
            setFormStatus('error');
        }
    };

    if (formStatus === 'success') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 pt-16 font-sans">
                <a 
                    href="/" 
                    className="mb-8 inline-block hover:opacity-80 transition-all duration-300 transform hover:scale-105"
                    aria-label="Volver al Inicio"
                >
                    <Logo size="lg" />
                </a>
                <div className="bg-zinc-950 border border-nexo-lime/40 p-10 md:p-12 rounded-2xl shadow-[0_0_60px_rgba(191,224,35,0.15)] text-center max-w-lg w-full">
                    <div className="w-16 h-16 rounded-full bg-nexo-lime/10 border border-nexo-lime flex items-center justify-center mx-auto mb-6 text-nexo-lime text-2xl">
                        ✓
                    </div>
                    <h2 className="text-3xl font-extrabold text-white uppercase tracking-tight mb-4">¡Solicitud Recibida!</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                        Muchas gracias <span className="text-white font-semibold">{contactName}</span>. Registramos tu proyecto <span className="text-nexo-lime">"{projectTitle}"</span> en nuestro sistema.
                        <br/><br/>
                        Nuestro equipo comercial revisará tus requerimientos y te enviará una propuesta detallada a la brevedad.
                    </p>
                    <a 
                        href="/" 
                        className="inline-block bg-nexo-lime hover:bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(191,224,35,0.3)] hover:shadow-white/20"
                    >
                        Volver a NexoFilm
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex justify-center p-6 pt-12 md:pt-16 pb-24 font-sans text-white">
            <div className="w-full max-w-3xl">
                {/* Cabecera Principal */}
                <div className="mb-10 text-center flex flex-col items-center">
                    <a 
                        href="/" 
                        className="inline-block hover:opacity-80 transition-all duration-300 transform hover:scale-105 mb-6"
                        aria-label="Volver al Inicio - NexoFilm"
                    >
                        <Logo size="lg" />
                    </a>
                    <p className="text-nexo-lime text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] mb-2">
                        Cotizador Online
                    </p>
                    <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-3">
                        Contanos tu idea y la cotizamos
                    </h1>
                    <p className="text-zinc-400 text-sm md:text-base font-light max-w-xl mx-auto leading-relaxed">
                        Completá esta información clave y te armamos un presupuesto detallado y personalizado para tu proyecto.
                    </p>
                </div>

                {/* Tarjeta del Formulario */}
                <div className="bg-zinc-950/80 border border-white/10 p-6 md:p-10 rounded-2xl shadow-2xl backdrop-blur-xl space-y-8">
                    {formStatus === 'error' && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm text-center font-medium">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Bloque 1: Identificación y Contacto */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                                <span className="text-nexo-lime text-xs font-black tracking-widest uppercase">01.</span>
                                <h3 className="text-white text-xs font-bold uppercase tracking-wider">Información de Contacto</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                                        Tu Nombre / Contacto <span className="text-nexo-lime">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all placeholder:text-zinc-600"
                                        placeholder="Ej: Sofía o Juan"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                                        Nombre del Evento / Empresa <span className="text-nexo-lime">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={projectTitle}
                                        onChange={(e) => setProjectTitle(e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all placeholder:text-zinc-600"
                                        placeholder="Ej: Lanzamiento Marca X / Evento Anual"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                                        Tu Correo Electrónico <span className="text-nexo-lime">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={clientEmail}
                                        onChange={(e) => setClientEmail(e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all placeholder:text-zinc-600"
                                        placeholder="Ej: juan@empresa.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                                        Tu WhatsApp <span className="text-nexo-lime">*</span>
                                    </label>
                                    <div className="flex gap-2 relative">
                                        <div className="relative shrink-0">
                                            <div 
                                                onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
                                                className="bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime hover:border-white/20 w-[95px] flex items-center justify-between cursor-pointer transition-all"
                                            >
                                                <span className={phoneCountryCode ? "text-white font-medium text-xs" : "text-zinc-500"}>
                                                    {phoneCountryCode || 'Cód.'}
                                                </span>
                                                <span className="text-[9px] text-zinc-500">▼</span>
                                            </div>
                                            
                                            {showPhoneDropdown && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setShowPhoneDropdown(false)}></div>
                                                    <div className="absolute top-full left-0 mt-1.5 w-[220px] bg-zinc-950 border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden">
                                                        <div className="p-2 border-b border-white/10 relative z-50">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Buscar país..." 
                                                                value={phoneSearch}
                                                                onChange={(e) => setPhoneSearch(e.target.value)}
                                                                className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
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
                                                                    className="px-3 py-2 text-xs text-zinc-300 hover:bg-nexo-lime hover:text-black cursor-pointer flex justify-between items-center transition-colors"
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
                                            className="flex-1 min-w-0 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all placeholder:text-zinc-600"
                                            placeholder="11 5892 2379"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bloque 2: Servicios Requeridos */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-nexo-lime text-xs font-black tracking-widest uppercase">02.</span>
                                    <h3 className="text-white text-xs font-bold uppercase tracking-wider">
                                        Servicios Requeridos <span className="text-nexo-lime">*</span>
                                    </h3>
                                </div>
                                <span className="text-zinc-500 text-[11px]">Podés elegir múltiples</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {AVAILABLE_SERVICES.map((srv) => {
                                    const isSelected = coverageTypes.includes(srv.id);
                                    return (
                                        <button
                                            key={srv.id}
                                            type="button"
                                            onClick={() => toggleCoverageType(srv.id)}
                                            className={`p-3.5 rounded-xl text-left border flex items-center gap-3 transition-all cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-nexo-lime/10 border-nexo-lime text-nexo-lime shadow-[0_0_15px_rgba(191,224,35,0.2)] scale-[1.02]' 
                                                    : 'bg-black/50 border-white/10 text-zinc-300 hover:border-white/25 hover:text-white'
                                            }`}
                                        >
                                            <span className="text-lg">{srv.icon}</span>
                                            <span className="text-xs font-bold tracking-tight">{srv.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Bloque 3: Fechas, Horas y Escala del Proyecto */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                                <span className="text-nexo-lime text-xs font-black tracking-widest uppercase">03.</span>
                                <h3 className="text-white text-xs font-bold uppercase tracking-wider">Tiempos y Escala</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                                        Fecha Tentativa
                                    </label>
                                    <input
                                        type="date"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                                        Horario de Inicio
                                    </label>
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
                                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs font-semibold uppercase tracking-wider block">
                                        Horario de Fin
                                    </label>
                                    <input
                                        type="time"
                                        value={eventEndTime}
                                        onChange={(e) => {
                                            const end = e.target.value;
                                            setEventEndTime(end);
                                            setCoverageHours(calculateHours(eventTime, end));
                                        }}
                                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all"
                                    />
                                </div>
                            </div>

                            {/* Cajas Armónicas de Horas e Invitados */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 bg-black/40 border border-white/10 p-4 rounded-xl">
                                    <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <span>⏱️</span> Horas Estimadas de Cobertura
                                        </span>
                                        <span className="text-nexo-lime font-mono text-xs">{coverageHours} hs</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="72"
                                        value={coverageHours}
                                        onChange={(e) => setCoverageHours(parseInt(e.target.value) || 1)}
                                        className="w-full bg-black/80 border border-white/10 rounded-lg px-4 py-2.5 text-base font-bold text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all"
                                    />
                                    <p className="text-[11px] text-zinc-500">
                                        Jornada o duración aproximada del rodaje/cobertura.
                                    </p>
                                </div>

                                <div className="space-y-2 bg-black/40 border border-white/10 p-4 rounded-xl">
                                    <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <span>👥</span> Invitados / Audiencia (Opcional)
                                        </span>
                                        <span className="text-zinc-500 text-[10px]">Si aplica</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={guestsCount}
                                        onChange={(e) => setGuestsCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                                        className="w-full bg-black/80 border border-white/10 rounded-lg px-4 py-2.5 text-base font-medium text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all placeholder:text-zinc-700"
                                        placeholder="Ej: 150 (Para eventos presenciales)"
                                    />
                                    <p className="text-[11px] text-zinc-500">
                                        Ayuda a dimensionar la cantidad de cámaras y equipo.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Bloque 4: Locación / Dirección */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                                <span className="text-nexo-lime text-xs font-black tracking-widest uppercase">04.</span>
                                <h3 className="text-white text-xs font-bold uppercase tracking-wider">Locación o Espacio</h3>
                            </div>

                            <div className="space-y-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime transition-all placeholder:text-zinc-600"
                                    placeholder="Ej: Salón Lahusen, CABA (Opcional si es en estudio o remoto)"
                                />
                                {/* Mapa Preview con Estilo Dark Minimalista */}
                                <div className={`rounded-xl overflow-hidden border transition-all duration-500 ${location ? 'h-[200px] border-white/10 mt-3' : 'h-0 border-transparent'}`}>
                                    <div id="map-preview" className="w-full h-full bg-zinc-900/50 flex items-center justify-center">
                                        <span className="text-zinc-500 text-xs">Cargando visualización del mapa...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bloque 5: Detalles y Notas */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                                <span className="text-nexo-lime text-xs font-black tracking-widest uppercase">05.</span>
                                <h3 className="text-white text-xs font-bold uppercase tracking-wider">Detalles Adicionales</h3>
                            </div>

                            <textarea
                                value={clientNotes}
                                onChange={(e) => setClientNotes(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-nexo-lime focus:ring-1 focus:ring-nexo-lime h-28 resize-none transition-all placeholder:text-zinc-600"
                                placeholder="Contanos cualquier detalle sobre el estilo, objetivo comercial, referencias o necesidades particulares..."
                            />
                        </div>

                        {/* Bloque 6: Ingesta de Briefing / Pliego */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                                <span className="text-nexo-lime text-xs font-black tracking-widest uppercase">06.</span>
                                <h3 className="text-white text-xs font-bold uppercase tracking-wider">¿Tenés un Brief o Pliego Técnico?</h3>
                            </div>
                            
                            <div 
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                                    dragActive 
                                        ? 'border-nexo-lime bg-nexo-lime/10 shadow-[0_0_20px_rgba(191,224,35,0.15)]' 
                                        : 'border-white/10 hover:border-white/25 bg-black/30'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="text-3xl opacity-70 mb-1">📄</div>
                                    <p className="text-sm text-white font-medium">
                                        Arrastrá tu archivo acá o{' '}
                                        <label className="text-nexo-lime font-bold hover:underline cursor-pointer">
                                            examiná en tu equipo
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleFileSelect(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </p>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                        Formatos admitidos: PDF, DOC, DOCX (Hasta 5MB)
                                    </p>
                                </div>
                            </div>
                            
                            {uploadError && (
                                <p className="text-red-400 text-xs text-center mt-2 font-medium">{uploadError}</p>
                            )}
                            {uploadSuccess && (
                                <p className="text-nexo-lime text-xs text-center mt-2 font-medium flex items-center justify-center gap-1">
                                    <span>✓</span> {uploadSuccess}
                                </p>
                            )}
                        </div>

                        {/* Botón de Envío */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={formStatus === 'sending'}
                                className="w-full bg-nexo-lime hover:bg-white text-black font-extrabold uppercase tracking-widest text-sm py-4 rounded-xl transition-all shadow-[0_0_25px_rgba(191,224,35,0.3)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 cursor-pointer"
                            >
                                {formStatus === 'sending' ? 'Procesando Solicitud...' : 'Solicitar Presupuesto'}
                            </button>
                            <p className="text-center text-[11px] text-zinc-500 mt-3">
                                Respuesta garantizada en 24 horas hábiles con asesoramiento técnico directo.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PublicRequestForm;
