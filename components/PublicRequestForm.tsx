import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
                    // Seguimos igual para mostrar éxito del lead, aunque falló el archivo.
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
            <div className="min-h-screen bg-black flex items-center justify-center p-6 pt-24">
                <div className="bg-zinc-900/40 border border-nexo-lime/30 p-10 rounded-2xl shadow-[0_0_50px_rgba(204,255,0,0.1)] text-center max-w-lg w-full">
                    <div className="text-6xl mb-6 animate-bounce">🎬</div>
                    <h2 className="text-3xl font-bold text-white uppercase tracking-tight mb-4">¡Solicitud Enviada!</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                        Muchas gracias <span className="text-white font-semibold">{contactName}</span>. Hemos recibido tu solicitud para "{projectTitle}". 
                        <br/><br/>
                        Nuestro equipo se pondrá en contacto a la brevedad para armar tu propuesta a medida.
                    </p>
                    <a href="/" className="inline-block bg-nexo-lime hover:bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-4 rounded-lg transition-all shadow-lg hover:shadow-nexo-lime/20">
                        Volver al Inicio
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex justify-center p-6 pt-32 pb-24">
            <div className="w-full max-w-3xl">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-tighter mb-4">
                        Armá tu presupuesto a medida
                    </h1>
                    <p className="text-zinc-400 max-w-xl mx-auto">
                        Completá los detalles de tu evento o producción para que el equipo de NexoFilm prepare tu cotización.
                    </p>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-xl shadow-2xl space-y-6">
                    {formStatus === 'error' && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded text-sm text-center">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tu Nombre / Contacto <span className="text-nexo-lime">*</span></label>
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
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Nombre del Evento / Proyecto <span className="text-nexo-lime">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={projectTitle}
                                    onChange={(e) => setProjectTitle(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                    placeholder="Ej: Boda de Sofía / Comercial Marca X"
                                />
                            </div>
                        </div>

                        {/* Contacto */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-6">
                            <div className="space-y-2">
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tu Correo Electrónico <span className="text-nexo-lime">*</span></label>
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
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tu WhatsApp <span className="text-nexo-lime">*</span></label>
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
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/5 pt-6">
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

                        <div className="space-y-2">
                            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Locación / Dirección</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded px-4 py-2.5 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                placeholder="Ej: Salón Lahusen, CABA (Opcional si no lo tenés definido)"
                            />
                            {/* Mapa Preview */}
                            <div className={`mt-2 rounded-xl overflow-hidden border transition-all duration-500 ${location ? 'h-[200px] border-white/10' : 'h-0 border-transparent'}`}>
                                <div id="map-preview" className="w-full h-full bg-zinc-900/50 flex items-center justify-center">
                                    <span className="text-zinc-600 text-sm">Buscando locación...</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                <label className="text-amber-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <span>⏱️</span> Horas de Cobertura Estimadas <span className="text-amber-500">*</span>
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

                        <div className="space-y-2 border-t border-white/5 pt-6">
                            <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Cuentanos más detalles sobre tu idea</label>
                            <textarea
                                value={clientNotes}
                                onChange={(e) => setClientNotes(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-nexo-lime h-24 resize-none"
                                placeholder="Cualquier información adicional que nos ayude a armar la cotización ideal..."
                            ></textarea>
                        </div>

                        {/* Zona de Ingesta de Documentos */}
                        <div className="border-t border-white/5 pt-6 space-y-3">
                            <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">⚡ ¿Ya tenés tu solicitud armada?</h3>
                            <p className="text-zinc-500 text-[11px]">
                                Subí tu pliego, briefing técnico o documento en formato PDF o Word para adjuntarlo a tu solicitud.
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
                                <div className="space-y-3">
                                    <div className="text-3xl opacity-50 mb-2">📄</div>
                                    <p className="text-sm text-white font-medium">
                                        Arrastrá tu archivo acá o{' '}
                                        <label className="text-nexo-lime hover:underline cursor-pointer">
                                            examiná
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
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">PDF, DOC, DOCX (Max 5MB)</p>
                                </div>
                            </div>
                            
                            {uploadError && (
                                <p className="text-red-400 text-xs text-center mt-2">{uploadError}</p>
                            )}
                            {uploadSuccess && (
                                <p className="text-nexo-lime text-xs text-center mt-2">{uploadSuccess}</p>
                            )}
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={formStatus === 'sending'}
                                className="w-full bg-nexo-lime hover:bg-white text-black font-bold uppercase tracking-widest text-sm py-4 rounded-lg transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {formStatus === 'sending' ? 'Enviando...' : 'Solicitar Presupuesto'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PublicRequestForm;
