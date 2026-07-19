import React, { useState, useMemo } from 'react';
import { CrewMember, ROLE_ICONS } from './CrewDirectory';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Budget {
    id: string;
    project_id: string;
    total_price: number;
    is_active?: boolean;
}

interface CrewAssignment {
    crew_member_id: string;
    name: string;
    role: string;
    fee: number;
    fee_currency: 'USD' | 'ARS';
    notified: boolean;
    notified_at: string | null;
}

interface Project {
    id: string;
    title: string;
    contact_name: string;
    company_name: string | null;
    client_email: string;
    client_phone?: string | null;
    status: string;
    event_date: string | null;
    event_time: string | null;
    event_end_time?: string | null;
    location: string | null;
    coverage_types: string[] | null;
    coverage_hours: number | null;
    crew_count?: number | null;
    crew_assignments?: CrewAssignment[] | null;
    currency?: 'USD' | 'ARS' | null;
    guests_count?: number | null;
}

interface CalendarViewProps {
    projects: Project[];
    budgets: Budget[];
    crewMembers: CrewMember[];
    password: string;
    onDataRefresh: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTHS_ES_LOWER = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const DAYS_ES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    approved:   { bg: 'bg-green-500/15 border-green-500/30',  text: 'text-green-400',  label: 'Confirmado', dot: 'bg-green-400' },
    production: { bg: 'bg-blue-500/15 border-blue-500/30',    text: 'text-blue-400',   label: 'En producción', dot: 'bg-blue-400' },
    delivered:  { bg: 'bg-zinc-600/15 border-zinc-600/30',    text: 'text-zinc-400',   label: 'Entregado', dot: 'bg-zinc-400' },
    sent:       { bg: 'bg-yellow-500/15 border-yellow-500/30',text: 'text-yellow-400', label: 'Ppto. enviado', dot: 'bg-yellow-400' },
    draft:      { bg: 'bg-zinc-700/15 border-zinc-700/30',    text: 'text-zinc-500',   label: 'Borrador', dot: 'bg-zinc-500' },
    review:     { bg: 'bg-orange-500/15 border-orange-500/30',text: 'text-orange-400', label: 'En revisión', dot: 'bg-orange-400' },
    rejected:   { bg: 'bg-red-500/15 border-red-500/30',      text: 'text-red-400',    label: 'Rechazado', dot: 'bg-red-500' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `${days[date.getDay()]} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
}

function buildGoogleCalendarLink(project: Project): string {
    if (!project.event_date) return '';
    const dateOnly = project.event_date.replace(/-/g, '');
    const startTime = project.event_time ? project.event_time.replace(':', '') + '00' : '080000';
    const endTime = project.event_end_time ? project.event_end_time.replace(':', '') + '00' : '';
    const dates = endTime
        ? `${dateOnly}T${startTime}/${dateOnly}T${endTime}`
        : `${dateOnly}T${startTime}/${dateOnly}T${String(Number(startTime.substring(0, 2)) + 4).padStart(2, '0')}0000`;

    const details = [
        `Cliente: ${project.contact_name}${project.company_name ? ` (${project.company_name})` : ''}`,
        project.coverage_types?.length ? `Cobertura: ${project.coverage_types.join(', ')}` : '',
        project.coverage_hours ? `Horas: ${project.coverage_hours}hs` : '',
    ].filter(Boolean).join('\n');

    return `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(project.title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(project.location || '')}`;
}

function buildGoogleMapsLink(location: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function getDaysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr + 'T12:00:00');
    return Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Export to CSV/Excel ──────────────────────────────────────────────────────

function exportToCSV(projects: Project[], budgets: Budget[], period: 'all' | 'month' | 'year') {
    const now = new Date();
    const filtered = projects.filter(p => {
        if (!p.event_date) return false;
        const d = new Date(p.event_date + 'T12:00:00');
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === 'year') return d.getFullYear() === now.getFullYear();
        return true;
    }).filter(p => ['approved', 'production', 'delivered'].includes(p.status));

    const rows = [
        ['Fecha', 'Evento', 'Cliente', 'Estado', 'Lugar', 'Horas', 'Moneda', 'Ingreso (Presupuesto)', 'Costo Crew', 'Margen Bruto', 'Crew Asignado']
    ];

    filtered.forEach(p => {
        const budget = budgets.find(b => b.project_id === p.id);
        const income = budget?.total_price || 0;
        const crewCost = (p.crew_assignments || []).reduce((sum, a) => sum + (a.fee || 0), 0);
        const margin = income - crewCost;
        const crewNames = (p.crew_assignments || []).map(a => `${a.name} (${a.role})`).join('; ');

        rows.push([
            p.event_date || '',
            p.title,
            p.contact_name,
            STATUS_STYLES[p.status]?.label || p.status,
            p.location || '',
            String(p.coverage_hours || ''),
            p.currency || 'ARS',
            String(income),
            String(crewCost),
            String(margin),
            crewNames
        ]);
    });

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const periodLabel = period === 'month' ? `${MONTHS_ES[now.getMonth()]}_${now.getFullYear()}` : period === 'year' ? String(now.getFullYear()) : 'completo';
    a.href = url;
    a.download = `nexofilm_eventos_${periodLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const KPIBar: React.FC<{ projects: Project[]; budgets: Budget[] }> = ({ projects, budgets }) => {
    const now = new Date();
    const confirmed = projects.filter(p => ['approved', 'production', 'delivered'].includes(p.status) && p.event_date);
    const upcoming = confirmed.filter(p => {
        if (!p.event_date) return false;
        return getDaysUntil(p.event_date) >= 0;
    }).sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());

    const thisYear = confirmed.filter(p => p.event_date && new Date(p.event_date + 'T12:00:00').getFullYear() === now.getFullYear());
    const thisMonth = confirmed.filter(p => {
        if (!p.event_date) return false;
        const d = new Date(p.event_date + 'T12:00:00');
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });

    const yearIncome = thisYear.reduce((sum, p) => {
        const b = budgets.find(bud => bud.project_id === p.id);
        return sum + (b?.total_price || 0);
    }, 0);
    const yearCrewCost = thisYear.reduce((sum, p) => {
        return sum + (p.crew_assignments || []).reduce((s, a) => s + (a.fee || 0), 0);
    }, 0);

    const nextEvent = upcoming[0];
    const daysUntilNext = nextEvent?.event_date ? getDaysUntil(nextEvent.event_date) : null;

    const monthCounts = MONTHS_ES.map((_, i) => ({
        count: thisYear.filter(p => {
            if (!p.event_date) return false;
            return new Date(p.event_date + 'T12:00:00').getMonth() === i;
        }).length
    }));
    const busiestMonthIdx = monthCounts.reduce((maxIdx, m, i, arr) => m.count > arr[maxIdx].count ? i : maxIdx, 0);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {/* Próximo evento */}
            <div className="bg-zinc-900 border border-white/8 rounded-xl p-4">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">⏱ Próximo evento</p>
                {nextEvent ? (
                    <>
                        <p className="text-white font-bold text-sm leading-tight truncate">{nextEvent.title}</p>
                        <p className={`text-xs mt-1 font-bold ${
                            daysUntilNext === 0 ? 'text-red-400' :
                            daysUntilNext! <= 7 ? 'text-orange-400' : 'text-nexo-lime'
                        }`}>
                            {daysUntilNext === 0 ? '¡Hoy!' : daysUntilNext === 1 ? '¡Mañana!' : `Faltan ${daysUntilNext} días`}
                        </p>
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                            {formatEventDate(nextEvent.event_date!).split(' ').slice(0, 4).join(' ')}
                        </p>
                    </>
                ) : (
                    <p className="text-zinc-600 text-xs">Sin eventos próximos</p>
                )}
            </div>

            {/* Eventos este mes */}
            <div className="bg-zinc-900 border border-white/8 rounded-xl p-4">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">📅 Este mes</p>
                <p className="text-white font-bold text-2xl">{thisMonth.length}</p>
                <p className="text-zinc-500 text-xs">{MONTHS_ES[now.getMonth()]} {now.getFullYear()}</p>
            </div>

            {/* Eventos este año */}
            <div className="bg-zinc-900 border border-white/8 rounded-xl p-4">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">🗓 Año {now.getFullYear()}</p>
                <p className="text-white font-bold text-2xl">{thisYear.length}</p>
                <p className="text-zinc-500 text-xs">
                    Mes más activo: <span className="text-nexo-lime font-bold">{MONTHS_ES[busiestMonthIdx]} ({monthCounts[busiestMonthIdx].count})</span>
                </p>
            </div>

            {/* Margen anual */}
            <div className="bg-zinc-900 border border-white/8 rounded-xl p-4">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">💰 Margen anual est.</p>
                <p className="text-nexo-lime font-bold text-sm">
                    ${(yearIncome - yearCrewCost).toLocaleString('es-AR')}
                </p>
                <p className="text-zinc-600 text-[10px] mt-0.5">
                    Ingresos: ${yearIncome.toLocaleString()} · Crew: ${yearCrewCost.toLocaleString()}
                </p>
            </div>
        </div>
    );
};

// ─── Event Card (used in List view) ──────────────────────────────────────────

const EventCard: React.FC<{
    project: Project;
    budget: Budget | undefined;
    password: string;
    crewMembers: CrewMember[];
    onNotified: () => void;
}> = ({ project, budget, password, crewMembers, onNotified }) => {
    const [notifying, setNotifying] = useState(false);
    const [notifyMsg, setNotifyMsg] = useState('');
    const [showCrewNotifyModal, setShowCrewNotifyModal] = useState(false);
    const [sendingSingleCrewEmailId, setSendingSingleCrewEmailId] = useState<string | null>(null);
    const [crewNotificationNote, setCrewNotificationNote] = useState('');

    const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.draft;
    const calLink = buildGoogleCalendarLink(project);
    const assignments = project.crew_assignments || [];
    const crewCost = assignments.reduce((sum, a) => sum + (a.fee || 0), 0);
    const income = budget?.total_price || 0;
    const margin = income - crewCost;
    const canNotify = ['approved', 'production'].includes(project.status) && assignments.some(a => a.name);
    const allNotified = assignments.length > 0 && assignments.every(a => a.notified);

    const daysUntil = project.event_date ? getDaysUntil(project.event_date) : null;

    const handleNotifyAll = async () => {
        setNotifying(true);
        setNotifyMsg('');
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'notifyCrewAll',
                    project_id: project.id,
                    password
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al notificar');
            setNotifyMsg(`✅ Emails de confirmación enviados a ${data.notified || assignments.length} personas.`);
            setShowCrewNotifyModal(false);
            setTimeout(() => { setNotifyMsg(''); onNotified(); }, 3000);
        } catch (err: any) {
            setNotifyMsg('❌ ' + err.message);
        } finally {
            setNotifying(false);
        }
    };

    const handleMarkAsNotifiedLocal = async (crewMemberId: string) => {
        const updatedAssignments = assignments.map(a => {
            if (a.crew_member_id === crewMemberId) {
                return { ...a, wa_notified: true, notified: true, notified_at: new Date().toISOString() };
            }
            return a;
        });
        
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateCrewAssignments',
                    project_id: project.id,
                    crew_assignments: updatedAssignments,
                    password
                })
            });
            if (!res.ok) throw new Error('Error al actualizar');
            onNotified();
        } catch (err) {
            console.error('Error al marcar notificado:', err);
        }
    };

    const handleNotifyCrewSingleEmail = async (crewMemberId: string) => {
        setSendingSingleCrewEmailId(crewMemberId);
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'notifyCrewSingle',
                    project_id: project.id,
                    crew_member_id: crewMemberId,
                    custom_note: crewNotificationNote,
                    password
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar email');
            onNotified();
        } catch (err: any) {
            alert('Error al enviar email al miembro del crew: ' + err.message);
        } finally {
            setSendingSingleCrewEmailId(null);
        }
    };

    // Formatear datos del evento para preview
    const eventDateObj = project.event_date ? new Date(project.event_date + 'T12:00:00') : null;
    const dateStr = eventDateObj
        ? `${DAYS_ES_FULL[eventDateObj.getDay()]} ${eventDateObj.getDate()} de ${MONTHS_ES_LOWER[eventDateObj.getMonth()]} ${eventDateObj.getFullYear()}`
        : 'Fecha a confirmar';

    const timeStr = project.event_time
        ? `${project.event_time}${project.event_end_time ? ' → ' + project.event_end_time : ''}${project.coverage_hours ? ' (' + project.coverage_hours + 'hs de cobertura)' : ''}`
        : '';
    const locationStr = project.location || 'No especificada';
    const mapsLink = locationStr && locationStr !== 'No especificada' ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationStr)}` : '';

    return (
        <div className="bg-zinc-900 border border-white/8 rounded-xl overflow-hidden hover:border-white/15 transition-all">
            {/* Top bar with status color */}
            <div className={`h-1 w-full ${statusStyle.dot}`} />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-base leading-tight truncate">{project.title}</h3>
                            {daysUntil !== null && daysUntil >= 0 && daysUntil <= 14 && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    daysUntil === 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                    daysUntil <= 3 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                }`}>
                                    {daysUntil === 0 ? '¡HOY!' : daysUntil === 1 ? '¡MAÑANA!' : `En ${daysUntil} días`}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${statusStyle.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {statusStyle.label}
                            </span>
                            {project.coverage_types?.length && (
                                <span className="text-zinc-600 text-[10px]">· {project.coverage_types.join(' + ')}</span>
                            )}
                        </div>
                    </div>
                    {calLink && (
                        <a
                            href={calLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Agregar a Google Calendar"
                            className="shrink-0 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/30 text-zinc-400 hover:text-blue-400 text-xs px-2.5 py-1.5 rounded transition-all flex items-center gap-1"
                        >
                            📅 <span className="hidden sm:inline">Mi Calendar</span>
                        </a>
                    )}
                </div>

                {/* Event details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-4">
                    {project.event_date && (
                        <div className="flex items-start gap-2 text-xs">
                            <span className="text-zinc-600 mt-0.5 shrink-0">📆</span>
                            <span className="text-zinc-300 font-medium">{formatEventDate(project.event_date)}</span>
                        </div>
                    )}
                    {(project.event_time || project.coverage_hours) && (
                        <div className="flex items-start gap-2 text-xs">
                            <span className="text-zinc-600 mt-0.5 shrink-0">⏰</span>
                            <span className="text-zinc-300">
                                {project.event_time || ''}
                                {project.event_time && project.event_end_time ? ` → ${project.event_end_time}` : ''}
                                {project.coverage_hours ? ` (${project.coverage_hours}hs de cobertura)` : ''}
                            </span>
                        </div>
                    )}
                    {project.location && (
                        <div className="flex items-start gap-2 text-xs sm:col-span-2">
                            <span className="text-zinc-600 mt-0.5 shrink-0">📍</span>
                            <a
                                href={buildGoogleMapsLink(project.location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
                            >
                                {project.location}
                            </a>
                        </div>
                    )}
                    <div className="flex items-start gap-2 text-xs">
                        <span className="text-zinc-600 mt-0.5 shrink-0">👤</span>
                        <span className="text-zinc-400">
                            <span className="font-medium text-white">{project.contact_name}</span>
                            {project.company_name && <span className="text-zinc-500"> · {project.company_name}</span>}
                        </span>
                    </div>
                    {project.guests_count && (
                        <div className="flex items-start gap-2 text-xs">
                            <span className="text-zinc-600 mt-0.5 shrink-0">🎉</span>
                            <span className="text-zinc-400">{project.guests_count} invitados</span>
                        </div>
                    )}
                </div>

                {/* Crew section */}
                {assignments.length > 0 && (
                    <div className="border-t border-white/5 pt-3 mb-3">
                        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider mb-2">👥 Crew asignado</p>
                        <div className="flex flex-wrap gap-1.5">
                            {assignments.map((a, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                                        a.notified
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                            : 'bg-white/5 border-white/10 text-zinc-300'
                                    }`}
                                >
                                    <span>{ROLE_ICONS[a.role] || '👤'}</span>
                                    <span className="font-medium">{a.name}</span>
                                    <span className="text-zinc-600">· {a.role}</span>
                                    {a.fee > 0 && (
                                        <span className="text-zinc-500 border-l border-white/10 pl-1.5">
                                            ${a.fee.toLocaleString()} {a.fee_currency}
                                        </span>
                                    )}
                                    {a.notified && <span title={`Notificado ${a.notified_at ? new Date(a.notified_at).toLocaleDateString('es-AR') : ''}`}>✅</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Financials (internal only) */}
                <div className="border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-4 text-xs">
                            {income > 0 && (
                                <span className="text-zinc-500">
                                    💵 Presupuesto: <strong className="text-zinc-300">${income.toLocaleString()} {project.currency || ''}</strong>
                                </span>
                            )}
                            {crewCost > 0 && (
                                <span className="text-zinc-500">
                                    👥 Crew: <strong className="text-zinc-400">-${crewCost.toLocaleString()}</strong>
                                </span>
                            )}
                            {income > 0 && crewCost > 0 && (
                                <span className="text-zinc-400 font-bold bg-zinc-950/40 px-2.5 py-1.5 rounded border border-white/5 flex items-center gap-1.5 shadow-sm">
                                    <span>Ganancia:</span>
                                    <strong className={margin >= 0 ? 'text-nexo-lime font-black text-xs' : 'text-red-400 font-black text-xs'}>
                                        ${margin.toLocaleString()}
                                    </strong>
                                </span>
                            )}
                        </div>
                        {/* Notify button */}
                        {canNotify && (
                            <button
                                onClick={() => setShowCrewNotifyModal(true)}
                                className={`text-xs font-bold px-3 py-1.5 rounded border transition-all flex items-center gap-1.5 ${
                                    allNotified
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                                        : 'bg-nexo-lime/10 border-nexo-lime/30 text-nexo-lime hover:bg-nexo-lime/20'
                                }`}
                            >
                                {allNotified ? '✅ Crew notificado' : '✉️ Notificar Crew'}
                            </button>
                        )}
                    </div>
                    {notifyMsg && (
                        <p className={`text-xs mt-2 ${notifyMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                            {notifyMsg}
                        </p>
                    )}
                </div>
            </div>

            {/* Notify Modal */}
            {showCrewNotifyModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCrewNotifyModal(false)}>
                    <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-zinc-950 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>✉️ Notificar Equipo (Seguro y Branded)</span>
                                <span className="text-[10px] bg-nexo-lime/15 text-nexo-lime px-2 py-0.5 rounded font-black uppercase tracking-wider">Confirmado</span>
                            </h3>
                            <button
                                onClick={() => setShowCrewNotifyModal(false)}
                                className="text-zinc-500 hover:text-white transition-colors text-lg"
                            >&times;</button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Nota Personalizada */}
                            <div className="space-y-1.5 bg-black/30 p-3 rounded-lg border border-white/5">
                                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">📝 Nota Personalizada para la Crew (Opcional)</label>
                                <textarea
                                    value={crewNotificationNote}
                                    onChange={(e) => setCrewNotificationNote(e.target.value)}
                                    placeholder="Ej: Traer batería extra de drone, ropa oscura para rodaje, etc. Se sumará al mail y al mensaje de WhatsApp."
                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-nexo-lime h-16 resize-none"
                                    spellCheck="true"
                                    lang="es"
                                />
                            </div>

                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Miembros Asignados ({assignments.length})</p>
                                <div className="space-y-2">
                                    {assignments.map((a, idx) => {
                                        const member = crewMembers.find(cm => cm.id === a.crew_member_id);
                                        const phone = member?.phone || '';
                                        const email = member?.email || '';
                                        
                                        const waNotified = a.wa_notified !== undefined ? a.wa_notified : a.notified;
                                        const emailNotified = a.email_notified !== undefined ? a.email_notified : a.notified;

                                        // Mensaje de WhatsApp personalizado
                                        const firstName = a.name.split(' ')[0];
                                        const notePart = crewNotificationNote.trim() ? `\n\n📝 *Nota:* ${crewNotificationNote.trim()}` : '';
                                        const waMsg = `🎬 *NexoFilm — Fecha Confirmada* ✅\n\nHola ${firstName}, ¡quedaste confirmado/a!\n\n📌 *Jornada:* ${project.title}${project.event_date ? `\n📆 ${dateStr}` : ''}${timeStr ? `\n⏰ ${timeStr}` : ''}${locationStr ? `\n📍 ${locationStr}` : ''}${mapsLink ? `\n🗺 Ver en mapa: ${mapsLink}` : ''}${calLink ? `\n🗓 Agregar a tu Calendar:\n${calLink}` : ''}\n\n⚠️ *Importante:* Se solicita estar *30 minutos antes* para la organización y armado de equipos.${notePart}\n\nCualquier consulta, respondé este mensaje.\n¡Nos vemos! – El equipo de NexoFilm 🎬`;
                                        const waUrl = phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}` : '';

                                        return (
                                            <div key={idx} className="bg-zinc-950/40 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span>{ROLE_ICONS[a.role] || '👤'}</span>
                                                        <strong className="text-xs text-white truncate">{a.name}</strong>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                                                        {email ? `📧 ${email}` : 'Sin email'} · {phone ? `📱 ${phone}` : 'Sin WhatsApp'}
                                                    </p>
                                                    <div className="flex gap-1.5 items-center mt-1 flex-wrap">
                                                        {waNotified && (
                                                            <span className="text-[8px] bg-green-500/15 border border-green-500/30 text-green-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">💬 WA Enviado</span>
                                                        )}
                                                        {emailNotified && (
                                                            <span className="text-[8px] bg-[#00e5ff]/15 border border-[#00e5ff]/30 text-[#00e5ff] px-2 py-0.5 rounded font-black uppercase tracking-wider">✉️ Mail Enviado</span>
                                                        )}
                                                        {!waNotified && !emailNotified && (
                                                            <span className="text-[8px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-medium">Pendiente</span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                                    {phone ? (
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() => handleMarkAsNotifiedLocal(a.crew_member_id)}
                                                            className={waNotified
                                                                ? "text-[10px] bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 px-2.5 py-1.5 rounded transition-all font-medium flex items-center gap-0.5"
                                                                : "text-[10px] bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/20 px-2.5 py-1.5 rounded transition-all font-bold flex items-center gap-0.5"
                                                            }
                                                        >
                                                            💬 WA
                                                        </a>
                                                    ) : (
                                                        <span className="text-[9px] text-zinc-600 italic">No WA</span>
                                                    )}

                                                    {email ? (
                                                        <button
                                                            onClick={() => handleNotifyCrewSingleEmail(a.crew_member_id)}
                                                            disabled={sendingSingleCrewEmailId === a.crew_member_id}
                                                            className={emailNotified
                                                                ? "text-[10px] bg-zinc-800/60 border border-zinc-700/50 text-zinc-500 px-2.5 py-1.5 rounded transition-all font-medium flex items-center gap-0.5"
                                                                : "text-[10px] bg-[#00e5ff]/15 border border-[#00e5ff]/30 text-[#00e5ff] hover:bg-[#00e5ff]/20 px-2.5 py-1.5 rounded transition-all font-bold flex items-center gap-0.5"
                                                            }
                                                        >
                                                            {sendingSingleCrewEmailId === a.crew_member_id ? '⏳ ...' : '✉️ Mail'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-[9px] text-zinc-600 italic font-medium">No Mail</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2.5">
                                <p className="text-[10px] text-nexo-lime font-bold uppercase tracking-wider">Previsualización del Mensaje de WhatsApp</p>
                                <div className="border border-white/8 rounded-lg p-3 bg-zinc-950/60 font-mono text-[11px] leading-relaxed text-zinc-300 whitespace-pre-line">
                                    {`🎬 *NexoFilm — Fecha Confirmada* ✅

Hola [Nombre], ¡quedaste confirmado/a!

📌 *Jornada:* ${project.title}
📆 ${dateStr}
⏰ ${timeStr}
📍 ${locationStr}
🗺 Ver en mapa: ${mapsLink || 'Enlace de mapa'}
🗓 Agregar a tu Calendar: [Link para agendar]

⚠️ *Importante:* Se solicita estar *30 minutos antes* para la organización y armado de equipos.${crewNotificationNote.trim() ? `\n\n📝 *Nota:* ${crewNotificationNote.trim()}` : ''}

Cualquier consulta, respondé este mensaje.
¡Nos vemos! – El equipo de NexoFilm 🎬`}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-zinc-950 px-6 py-4 border-t border-white/5 flex items-center justify-end">
                            <button
                                onClick={() => setShowCrewNotifyModal(false)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold px-5 py-2.5 rounded transition-colors"
                            >Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Monthly Grid View ────────────────────────────────────────────────────────

const MonthlyGrid: React.FC<{ year: number; projects: Project[]; onSelectDate: (date: string) => void }> = ({ year, projects, onSelectDate }) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    const eventsInMonth = projects.filter(p => {
        if (!p.event_date) return false;
        const d = new Date(p.event_date + 'T12:00:00');
        return d.getFullYear() === year && d.getMonth() === selectedMonth;
    });

    const firstDay = new Date(year, selectedMonth, 1);
    const lastDay = new Date(year, selectedMonth + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
    const totalDays = lastDay.getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const today = new Date();

    return (
        <div>
            {/* Month selector */}
            <div className="flex gap-1 flex-wrap mb-4">
                {MONTHS_ES.map((m, i) => {
                    const count = projects.filter(p => {
                        if (!p.event_date) return false;
                        const d = new Date(p.event_date + 'T12:00:00');
                        return d.getFullYear() === year && d.getMonth() === i && ['approved','production','delivered'].includes(p.status);
                    }).length;
                    return (
                        <button
                            key={i}
                            onClick={() => setSelectedMonth(i)}
                            className={`text-xs px-3 py-1.5 rounded font-bold transition-all border relative ${
                                selectedMonth === i
                                    ? 'bg-nexo-lime text-black border-nexo-lime'
                                    : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30'
                            }`}
                        >
                            {m.substring(0, 3)}
                            {count > 0 && (
                                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                                    selectedMonth === i ? 'bg-black text-nexo-lime' : 'bg-nexo-lime text-black'
                                }`}>{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="bg-zinc-900 border border-white/8 rounded-xl overflow-hidden">
                <div className="bg-zinc-800/50 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-white">{MONTHS_ES[selectedMonth]} {year}</h3>
                    <span className="text-zinc-500 text-xs">{eventsInMonth.length} evento{eventsInMonth.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-white/5">
                    {DAYS_ES.map(d => (
                        <div key={d} className="text-center text-zinc-600 text-[10px] font-bold uppercase py-2">{d}</div>
                    ))}
                </div>

                {/* Cells */}
                <div className="grid grid-cols-7">
                    {cells.map((day, i) => {
                        if (day === null) {
                            return <div key={`e-${i}`} className="h-16 border-b border-r border-white/3 last:border-r-0" />;
                        }
                        const dateStr = `${year}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayEvents = projects.filter(p => p.event_date === dateStr);
                        const isToday = today.getFullYear() === year && today.getMonth() === selectedMonth && today.getDate() === day;
                        const isWeekend = (i % 7) === 5 || (i % 7) === 6;

                        return (
                            <div
                                key={day}
                                onClick={() => dayEvents.length > 0 && onSelectDate(dateStr)}
                                className={`h-16 border-b border-r border-white/3 last:border-r-0 p-1 transition-colors ${
                                    dayEvents.length > 0 ? 'cursor-pointer hover:bg-white/5' : ''
                                } ${isWeekend ? 'bg-white/1' : ''}`}
                            >
                                <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                                    isToday ? 'bg-nexo-lime text-black' : 'text-zinc-500'
                                }`}>
                                    {day}
                                </div>
                                <div className="space-y-0.5">
                                    {dayEvents.slice(0, 2).map((p, ei) => {
                                        const s = STATUS_STYLES[p.status] || STATUS_STYLES.draft;
                                        return (
                                            <div key={ei} className={`text-[9px] px-1 py-0.5 rounded truncate font-bold ${s.text} bg-white/5`}>
                                                {p.title.substring(0, 14)}
                                            </div>
                                        );
                                    })}
                                    {dayEvents.length > 2 && (
                                        <div className="text-[9px] text-zinc-600">+{dayEvents.length - 2} más</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Conflict detector ────────────────────────────────────────────────────────

function detectConflicts(projects: Project[]): Map<string, Project[]> {
    const confirmed = projects.filter(p => ['approved', 'production'].includes(p.status) && p.event_date);
    const byDate = new Map<string, Project[]>();
    confirmed.forEach(p => {
        const key = p.event_date!;
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(p);
    });
    const conflicts = new Map<string, Project[]>();
    byDate.forEach((projs, date) => {
        if (projs.length > 1) conflicts.set(date, projs);
    });
    return conflicts;
}

// ─── Main CalendarView component ──────────────────────────────────────────────

const CalendarView: React.FC<CalendarViewProps> = ({ projects, budgets, crewMembers, password, onDataRefresh }) => {
    const currentYear = new Date().getFullYear();
    const [viewMode, setViewMode] = useState<'list' | 'monthly'>('list');
    const [yearFilter, setYearFilter] = useState(currentYear);
    const [statusFilter, setStatusFilter] = useState<string>('active');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [exportOpen, setExportOpen] = useState(false);

    const conflicts = useMemo(() => detectConflicts(projects), [projects]);

    const statusOptions = [
        { value: 'active', label: '● Activos', statuses: ['approved', 'production'] },
        { value: 'all', label: 'Todos', statuses: null },
        { value: 'approved', label: '✅ Confirmados', statuses: ['approved'] },
        { value: 'production', label: '🎬 Producción', statuses: ['production'] },
        { value: 'delivered', label: '📦 Entregados', statuses: ['delivered'] },
    ];

    const filteredProjects = useMemo(() => {
        const selectedStatusOpt = statusOptions.find(s => s.value === statusFilter);
        return projects.filter(p => {
            if (!p.event_date) return false;
            const d = new Date(p.event_date + 'T12:00:00');
            if (d.getFullYear() !== yearFilter) return false;
            if (selectedStatusOpt?.statuses) {
                return selectedStatusOpt.statuses.includes(p.status);
            }
            return true;
        }).sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
    }, [projects, yearFilter, statusFilter]);

    // Group by month for list view
    const groupedByMonth = useMemo(() => {
        const groups: { month: number; projects: Project[] }[] = [];
        filteredProjects.forEach(p => {
            const month = new Date(p.event_date! + 'T12:00:00').getMonth();
            const existing = groups.find(g => g.month === month);
            if (existing) existing.projects.push(p);
            else groups.push({ month, projects: [p] });
        });
        return groups;
    }, [filteredProjects]);

    // Available years from projects
    const years = useMemo(() => {
        const ys = new Set<number>();
        projects.forEach(p => {
            if (p.event_date) ys.add(new Date(p.event_date + 'T12:00:00').getFullYear());
        });
        ys.add(currentYear);
        return Array.from(ys).sort((a, b) => a - b);
    }, [projects]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-white">📅 Calendario de Eventos</h2>
                    <p className="text-zinc-500 text-xs mt-0.5">
                        {filteredProjects.length} evento{filteredProjects.length !== 1 ? 's' : ''} · Uso interno
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Export */}
                    <div className="relative">
                        <button
                            onClick={() => setExportOpen(!exportOpen)}
                            className="bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold px-3 py-2 rounded transition-colors flex items-center gap-1.5"
                        >
                            📊 Exportar Excel
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-white/15 rounded-lg p-1 shadow-xl z-20 w-48">
                                {[
                                    { label: '📅 Este mes', period: 'month' as const },
                                    { label: '🗓 Este año', period: 'year' as const },
                                    { label: '📋 Histórico completo', period: 'all' as const },
                                ].map(opt => (
                                    <button
                                        key={opt.period}
                                        onClick={() => { exportToCSV(projects, budgets, opt.period); setExportOpen(false); }}
                                        className="w-full text-left text-xs text-zinc-300 hover:text-white hover:bg-white/5 px-3 py-2 rounded transition-colors"
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* View toggle */}
                    <div className="flex gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`text-xs px-3 py-1.5 rounded font-bold transition-all ${
                                viewMode === 'list' ? 'bg-nexo-lime text-black' : 'text-zinc-400 hover:text-white'
                            }`}
                        >☰ Lista</button>
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={`text-xs px-3 py-1.5 rounded font-bold transition-all ${
                                viewMode === 'monthly' ? 'bg-nexo-lime text-black' : 'text-zinc-400 hover:text-white'
                            }`}
                        >📅 Mensual</button>
                    </div>
                </div>
            </div>

            {/* KPI bar */}
            <KPIBar projects={projects} budgets={budgets} />

            {/* Conflict alerts */}
            {conflicts.size > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400 text-xs font-bold mb-2">🚨 Conflictos de fecha detectados</p>
                    {Array.from(conflicts.entries()).map(([date, projs]) => (
                        <div key={date} className="text-xs text-red-300 flex items-center gap-2">
                            <span className="font-bold">{formatEventDate(date)}:</span>
                            <span>{projs.map(p => p.title).join(' y ')} tienen la misma fecha confirmada</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* Year */}
                <select
                    value={yearFilter}
                    onChange={e => setYearFilter(Number(e.target.value))}
                    className="bg-zinc-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:border-nexo-lime focus:outline-none"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                {/* Status */}
                {statusOptions.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={`text-xs px-3 py-1.5 rounded font-bold transition-all border ${
                            statusFilter === opt.value
                                ? 'bg-nexo-lime text-black border-nexo-lime'
                                : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30'
                        }`}
                    >{opt.label}</button>
                ))}
            </div>

            {/* Content */}
            {viewMode === 'list' ? (
                <div>
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-20 border border-white/5 rounded-xl">
                            <div className="text-5xl mb-3">📭</div>
                            <p className="text-zinc-500 text-sm">No hay eventos para este filtro</p>
                            <p className="text-zinc-600 text-xs mt-1">Los proyectos aparecen aquí cuando tienen fecha de evento cargada</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {groupedByMonth.map(({ month, projects: monthProjects }) => (
                                <div key={month}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <h3 className="text-zinc-300 font-bold text-sm">{MONTHS_ES[month]} {yearFilter}</h3>
                                        <div className="flex-1 h-px bg-white/5" />
                                        <span className="text-zinc-600 text-xs">{monthProjects.length} evento{monthProjects.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {monthProjects.map(p => (
                                            <EventCard
                                                key={p.id}
                                                project={p}
                                                budget={budgets.find(b => b.project_id === p.id)}
                                                password={password}
                                                onNotified={onDataRefresh}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <MonthlyGrid
                    year={yearFilter}
                    projects={filteredProjects}
                    onSelectDate={setSelectedDate}
                />
            )}

            {/* Date detail modal */}
            {selectedDate && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}>
                    <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white">{formatEventDate(selectedDate)}</h3>
                            <button onClick={() => setSelectedDate(null)} className="text-zinc-500 hover:text-white text-lg">×</button>
                        </div>
                        <div className="space-y-3">
                            {projects.filter(p => p.event_date === selectedDate).map(p => (
                                <EventCard
                                    key={p.id}
                                    project={p}
                                    budget={budgets.find(b => b.project_id === p.id)}
                                    password={password}
                                    onNotified={() => { onDataRefresh(); setSelectedDate(null); }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export type { CrewAssignment, Project as CalendarProject };
export default CalendarView;
