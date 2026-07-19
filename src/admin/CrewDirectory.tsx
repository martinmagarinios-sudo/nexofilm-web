import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface CrewMember {
    id: string;
    name: string;
    role: string; // Guardado como lista separada por comas, ej: "Filmmaker, Editor"
    email: string | null;
    phone: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    dni?: string | null;
    birth_date?: string | null;
    address?: string | null;
    dni_url?: string | null;
}

export const CREW_ROLES: string[] = [
    'Fotógrafo', 'Filmmaker', 'Drone', 'Editor', 'Sonidista', 'Asistente', 'Productor', 'Otro'
];

export const ROLE_ICONS: Record<string, string> = {
    'Fotógrafo': '📷',
    'Filmmaker': '🎬',
    'Drone': '🚁',
    'Editor': '💻',
    'Sonidista': '🎙️',
    'Asistente': '🤝',
    'Productor': '🎯',
    'Otro': '👤',
};

interface CrewDirectoryProps {
    password: string;
    crewMembers: CrewMember[];
    onCrewUpdated: () => void;
}

const CrewDirectory: React.FC<CrewDirectoryProps> = ({ password, crewMembers, onCrewUpdated }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Form fields
    const [formName, setFormName] = useState('');
    const [formLastName, setFormLastName] = useState('');
    const [formRoles, setFormRoles] = useState<string[]>(['Fotógrafo']);
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formDni, setFormDni] = useState('');
    const [formBirthDate, setFormBirthDate] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formDniUrl, setFormDniUrl] = useState('');
    const [uploadingDni, setUploadingDni] = useState(false);

    const resetForm = () => {
        setFormName('');
        setFormLastName('');
        setFormRoles(['Fotógrafo']);
        setFormEmail('');
        setFormPhone('');
        setFormNotes('');
        setFormDni('');
        setFormBirthDate('');
        setFormAddress('');
        setFormDniUrl('');
        setEditingId(null);
        setShowForm(false);
    };

    const startEdit = (cm: CrewMember) => {
        const parts = cm.name.split(' ');
        setFormName(parts[0] || '');
        setFormLastName(parts.slice(1).join(' ') || '');
        
        // Parsear roles desde string separado por comas
        const rolesList = cm.role ? cm.role.split(',').map(r => r.trim()).filter(Boolean) : ['Otro'];
        setFormRoles(rolesList);
        
        setFormEmail(cm.email || '');
        setFormPhone(cm.phone || '');
        setFormNotes(cm.notes || '');
        setFormDni(cm.dni || '');
        setFormBirthDate(cm.birth_date || '');
        setFormAddress(cm.address || '');
        setFormDniUrl(cm.dni_url || '');
        
        setEditingId(cm.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleFormRole = (r: string) => {
        if (r === 'Otro') {
            setFormRoles(['Otro']);
            return;
        }

        let newRoles = formRoles.filter(x => x !== 'Otro');
        if (newRoles.includes(r)) {
            newRoles = newRoles.filter(x => x !== r);
            if (newRoles.length === 0) newRoles = ['Otro'];
        } else {
            newRoles.push(r);
        }
        setFormRoles(newRoles);
    };

    const handleDniUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !supabase) return;

        setUploadingDni(true);
        setErrorMsg('');
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `dni_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            
            const { data, error: uploadErr } = await supabase.storage
                .from('crew-dni')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage
                .from('crew-dni')
                .getPublicUrl(fileName);

            setFormDniUrl(publicUrl);
            setSuccessMsg('✅ Foto de DNI subida con éxito.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
            setErrorMsg('Error al subir DNI: ' + err.message);
        } finally {
            setUploadingDni(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) { setErrorMsg('El nombre es obligatorio.'); return; }
        if (formRoles.length === 0) { setErrorMsg('Debe seleccionar al menos un rol.'); return; }
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const fullName = `${formName.trim()} ${formLastName.trim()}`.trim();
            const action = editingId ? 'updateCrewMember' : 'createCrewMember';
            const body: Record<string, any> = {
                action, password,
                name: fullName,
                role: formRoles.join(', '),
                email: formEmail.trim() || null,
                phone: formPhone.trim() || null,
                notes: formNotes.trim() || null,
                dni: formDni.trim() || null,
                birth_date: formBirthDate || null,
                address: formAddress.trim() || null,
                dni_url: formDniUrl.trim() || null
            };
            if (editingId) body.crew_member_id = editingId;

            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al guardar');

            setSuccessMsg(editingId ? '✅ Crew actualizado correctamente.' : '✅ Persona agregada al directorio.');
            resetForm();
            onCrewUpdated();
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (cm: CrewMember) => {
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateCrewMember',
                    password,
                    crew_member_id: cm.id,
                    name: cm.name,
                    role: cm.role,
                    email: cm.email,
                    phone: cm.phone,
                    notes: cm.notes,
                    is_active: !cm.is_active
                })
            });
            if (!res.ok) throw new Error('Error al actualizar');
            onCrewUpdated();
        } catch (err: any) {
            setErrorMsg(err.message);
        }
    };

    const filtered = crewMembers.filter(cm => {
        const matchRole = filterRole === 'all' || 
            (cm.role || '').split(',').map(r => r.trim()).includes(filterRole);
        const matchSearch = !searchTerm ||
            cm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cm.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            cm.role.toLowerCase().includes(searchTerm.toLowerCase());
        return matchRole && matchSearch;
    });

    const active = filtered.filter(c => c.is_active);
    const inactive = filtered.filter(c => !c.is_active);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-white">👥 Directorio de Crew</h2>
                    <p className="text-zinc-500 text-xs mt-0.5">
                        {crewMembers.filter(c => c.is_active).length} personas activas · Uso interno
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="bg-nexo-lime text-black font-bold text-xs px-4 py-2 rounded hover:bg-white transition-colors flex items-center gap-1.5 shrink-0"
                >
                    <span className="text-base leading-none">+</span> Agregar persona
                </button>
            </div>

            {/* Alerts */}
            {successMsg && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs p-3 rounded">
                    {successMsg}
                </div>
            )}
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded">
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* Form panel */}
            {showForm && (
                <div className="bg-zinc-900 border border-nexo-lime/20 rounded-xl p-5 shadow-lg shadow-nexo-lime/5">
                    <h3 className="text-sm font-bold text-white mb-4">
                        {editingId ? '✏️ Editar persona del equipo' : '➕ Nueva persona del equipo'}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        {/* Name fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Nombre *</label>
                                <input
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="Juan"
                                    required
                                    className="w-full bg-black border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-nexo-lime focus:outline-none placeholder-zinc-600"
                                />
                            </div>
                            <div>
                                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Apellido</label>
                                <input
                                    value={formLastName}
                                    onChange={e => setFormLastName(e.target.value)}
                                    placeholder="García"
                                    className="w-full bg-black border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-nexo-lime focus:outline-none placeholder-zinc-600"
                                />
                            </div>
                        </div>

                        {/* Role selector */}
                        <div>
                            <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-2">Rol / Especialidad * (Podés seleccionar varios)</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {CREW_ROLES.map(r => {
                                    const isSelected = formRoles.includes(r);
                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => toggleFormRole(r)}
                                            className={`py-2.5 px-2 rounded text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
                                                isSelected
                                                    ? 'bg-nexo-lime text-black border-nexo-lime'
                                                    : 'bg-black text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                                            }`}
                                        >
                                            <span className="text-lg">{ROLE_ICONS[r]}</span>
                                            <span>{r}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                                    📧 Email (para notificaciones)
                                </label>
                                <input
                                    type="email"
                                    value={formEmail}
                                    onChange={e => setFormEmail(e.target.value)}
                                    placeholder="juan@email.com"
                                    className="w-full bg-black border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-nexo-lime focus:outline-none placeholder-zinc-600"
                                />
                            </div>
                            <div>
                                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                                    📱 WhatsApp (con código de país)
                                </label>
                                <input
                                    type="tel"
                                    value={formPhone}
                                    onChange={e => setFormPhone(e.target.value)}
                                    placeholder="+5491112345678"
                                    className="w-full bg-black border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-nexo-lime focus:outline-none placeholder-zinc-600"
                                />
                            </div>
                        </div>

                        {/* Datos Administrativos / Seguros */}
                        <div className="border-t border-white/5 pt-3">
                            <p className="text-nexo-lime text-[10px] font-bold uppercase tracking-wider mb-2">📋 Datos para Seguros / Administrativos</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">DNI / Documento</label>
                                    <input
                                        value={formDni}
                                        onChange={e => setFormDni(e.target.value)}
                                        placeholder="Ej: 38.123.456"
                                        className="w-full bg-black border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-nexo-lime focus:outline-none placeholder-zinc-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Fecha de Nacimiento</label>
                                    <input
                                        type="date"
                                        value={formBirthDate}
                                        onChange={e => setFormBirthDate(e.target.value)}
                                        className="w-full bg-black border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-nexo-lime focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Dirección</label>
                                    <input
                                        value={formAddress}
                                        onChange={e => setFormAddress(e.target.value)}
                                        placeholder="Ej: Av. Santa Fe 1234, CABA"
                                        className="w-full bg-black border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-nexo-lime focus:outline-none placeholder-zinc-600"
                                    />
                                </div>
                            </div>
                            
                            {/* File Upload for DNI */}
                            <div className="mt-3">
                                <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Foto / PDF de DNI</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleDniUpload}
                                        className="hidden"
                                        id="dni-file-upload"
                                    />
                                    <label
                                        htmlFor="dni-file-upload"
                                        className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-3 py-2 rounded text-xs text-zinc-300 font-bold transition-all inline-block"
                                    >
                                        📷 {uploadingDni ? 'Subiendo...' : formDniUrl ? 'Reemplazar DNI' : 'Subir foto/PDF DNI'}
                                    </label>
                                    {formDniUrl && (
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={formDniUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline"
                                            >
                                                📄 Ver archivo subido
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => setFormDniUrl('')}
                                                className="text-red-500 hover:text-red-400 text-xs font-bold"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                                📝 Notas internas (solo vos las ves)
                            </label>
                            <textarea
                                value={formNotes}
                                onChange={e => setFormNotes(e.target.value)}
                                placeholder="Ej: Tiene cámara propia. Solo fines de semana. Requiere viáticos..."
                                className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-nexo-lime focus:outline-none h-16 resize-none placeholder-zinc-600"
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-nexo-lime text-black font-bold text-xs px-5 py-2.5 rounded hover:bg-white transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : editingId ? '💾 Guardar cambios' : '➕ Agregar al directorio'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-zinc-800 text-zinc-300 text-xs px-4 py-2.5 rounded hover:bg-zinc-700 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="🔍 Buscar por nombre, email o rol..."
                    className="bg-zinc-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:border-nexo-lime focus:outline-none w-64 placeholder-zinc-600"
                />
                <div className="flex gap-1 flex-wrap">
                    <button
                        onClick={() => setFilterRole('all')}
                        className={`text-xs px-3 py-1.5 rounded font-bold transition-all border ${
                            filterRole === 'all'
                                ? 'bg-nexo-lime text-black border-nexo-lime'
                                : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30'
                        }`}
                    >
                        Todos ({crewMembers.filter(c => c.is_active).length})
                    </button>
                    {CREW_ROLES.map(r => {
                        const count = crewMembers.filter(c => 
                            c.is_active && (c.role || '').split(',').map(x => x.trim()).includes(r)
                        ).length;
                        if (count === 0 && filterRole !== r) return null;
                        return (
                            <button
                                key={r}
                                onClick={() => setFilterRole(r)}
                                className={`text-xs px-2.5 py-1.5 rounded font-bold transition-all border ${
                                    filterRole === r
                                        ? 'bg-nexo-lime text-black border-nexo-lime'
                                        : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30'
                                }`}
                            >
                                {ROLE_ICONS[r]} {r} {count > 0 ? `(${count})` : ''}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Empty state */}
            {active.length === 0 && inactive.length === 0 && (
                <div className="text-center py-20 text-zinc-600 border border-white/5 rounded-xl">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-sm font-medium text-zinc-500">No hay personas en el directorio todavía</p>
                    <p className="text-xs mt-1">Agregá tu primer colaborador con el botón de arriba</p>
                </div>
            )}

            {/* Active crew grid */}
            {active.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {active.map(cm => (
                        <CrewCard key={cm.id} cm={cm} onEdit={startEdit} onToggle={handleToggleActive} />
                    ))}
                </div>
            )}

            {/* Archived crew */}
            {inactive.length > 0 && (
                <div>
                    <p className="text-zinc-600 text-xs font-bold uppercase tracking-wider mb-3 mt-4">
                        🗂️ Archivados ({inactive.length})
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-40 hover:opacity-60 transition-opacity">
                        {inactive.map(cm => (
                            <CrewCard key={cm.id} cm={cm} onEdit={startEdit} onToggle={handleToggleActive} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CrewCard: React.FC<{
    cm: CrewMember;
    onEdit: (cm: CrewMember) => void;
    onToggle: (cm: CrewMember) => void;
}> = ({ cm, onEdit, onToggle }) => {
    const rolesList = cm.role ? cm.role.split(',').map(r => r.trim()).filter(Boolean) : ['Otro'];
    const [openingDni, setOpeningDni] = useState(false);

    const handleViewDni = async (fullUrl: string) => {
        if (!supabase) return;
        setOpeningDni(true);
        try {
            const fileName = fullUrl.split('/').pop();
            if (!fileName) throw new Error('Nombre de archivo inválido');
            
            const { data, error } = await supabase.storage
                .from('crew-dni')
                .createSignedUrl(fileName, 300); // 5 minutes validity
                
            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (err: any) {
            alert('Error al abrir DNI privado: ' + err.message);
        } finally {
            setOpeningDni(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-white/8 rounded-xl p-4 hover:border-white/20 transition-all group relative overflow-hidden">
            {/* Hover accent */}
            <div className="absolute inset-0 bg-nexo-lime/0 group-hover:bg-nexo-lime/2 transition-colors pointer-events-none" />

            {/* Action buttons */}
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    onClick={() => onEdit(cm)}
                    title="Editar"
                    className="text-xs bg-white/5 hover:bg-white/15 border border-white/10 w-7 h-7 rounded flex items-center justify-center transition-colors"
                >✏️</button>
                <button
                    onClick={() => onToggle(cm)}
                    title={cm.is_active ? 'Archivar' : 'Reactivar'}
                    className="text-xs bg-white/5 hover:bg-white/15 border border-white/10 w-7 h-7 rounded flex items-center justify-center transition-colors"
                >{cm.is_active ? '🗄️' : '♻️'}</button>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <div className="flex gap-1 shrink-0">
                    {rolesList.map((r, idx) => (
                        <div key={idx} className="w-8 h-8 bg-nexo-lime/10 border border-nexo-lime/20 rounded-lg flex items-center justify-center text-sm" title={r}>
                            {ROLE_ICONS[r] || '👤'}
                        </div>
                    ))}
                </div>
                <div className="min-w-0 pr-14">
                    <p className="font-bold text-white text-sm leading-tight truncate">{cm.name}</p>
                    <span className="text-nexo-lime text-[10px] font-bold uppercase tracking-wide truncate block">{cm.role}</span>
                </div>
            </div>

            <div className="space-y-1.5 border-t border-white/5 pt-3">
                {cm.email ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="text-zinc-600 shrink-0">📧</span>
                        <a href={`mailto:${cm.email}`} className="hover:text-white truncate transition-colors">{cm.email}</a>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-zinc-600 italic">
                        <span>📧</span><span>Sin email cargado</span>
                    </div>
                )}
                {cm.phone ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="text-zinc-600 shrink-0">📱</span>
                        <a
                            href={`https://wa.me/${cm.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-green-400 transition-colors"
                        >{cm.phone}</a>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-zinc-600 italic">
                        <span>📱</span><span>Sin WhatsApp cargado</span>
                    </div>
                )}

                {/* Datos para Seguros */}
                {(cm.dni || cm.birth_date || cm.address || cm.dni_url) && (
                    <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 mt-2 space-y-1 text-[11px] leading-relaxed">
                        <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider mb-1">🛡️ Datos para Seguros</p>
                        {cm.dni && (
                            <div>
                                <span className="text-zinc-500">Documento:</span> <span className="text-zinc-300 font-bold">{cm.dni}</span>
                            </div>
                        )}
                        {cm.birth_date && (
                            <div>
                                <span className="text-zinc-500">Nacimiento:</span> <span className="text-zinc-300 font-bold">{
                                    (() => {
                                        try {
                                            const [y, m, d] = cm.birth_date.split('-');
                                            return `${d}/${m}/${y}`;
                                        } catch (e) {
                                            return cm.birth_date;
                                        }
                                    })()
                                }</span>
                            </div>
                        )}
                        {cm.address && (
                            <div className="truncate" title={cm.address}>
                                <span className="text-zinc-500">Dirección:</span> <span className="text-zinc-300 font-medium">{cm.address}</span>
                            </div>
                        )}
                        {cm.dni_url && (
                            <div className="pt-1.5 flex items-center justify-between border-t border-white/5 mt-1.5">
                                <button
                                    onClick={() => handleViewDni(cm.dni_url!)}
                                    disabled={openingDni}
                                    className="text-nexo-lime hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 text-left bg-transparent border-0 p-0"
                                >
                                    📄 {openingDni ? 'Abriendo seguro...' : 'Ver archivo DNI'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {cm.notes && (
                    <div className="flex items-start gap-2 text-xs text-zinc-500 mt-2 pt-2 border-t border-white/5">
                        <span className="shrink-0 mt-0.5">📝</span>
                        <span className="line-clamp-2 leading-relaxed">{cm.notes}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrewDirectory;
