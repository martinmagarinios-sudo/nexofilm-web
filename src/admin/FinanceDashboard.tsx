import React, { useState, useMemo } from 'react';

interface Project {
    id: string;
    title: string;
    contact_name: string;
    client_email: string;
    company_name: string | null;
    status: 'draft' | 'sent' | 'review' | 'approved' | 'rejected' | 'production' | 'delivered';
    event_date: string | null;
    event_time: string | null;
    location: string | null;
    currency?: 'USD' | 'ARS' | null;
    crew_assignments?: CrewAssignment[] | null;
    extra_expenses?: ExtraExpense[] | null;
}

interface CrewAssignment {
    crew_member_id: string;
    name: string;
    role: string;
    fee: number;
    fee_currency: 'USD' | 'ARS';
}

interface ExtraExpense {
    description: string;
    amount: number;
    currency: 'USD' | 'ARS';
}

interface FinanceDashboardProps {
    projects: Project[];
    budgets: any[];
    crewMembers: any[];
}

const ROLE_ICONS: { [key: string]: string } = {
    'Fotógrafo': '📷',
    'Filmmaker': '🎬',
    'Drone': '🚁',
    'Editor': '💻',
    'Sonidista': '🎤',
    'Asistente': '💡',
    'Productor': '📋',
    'Otro': '👤'
};

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ projects, budgets, crewMembers }) => {
    // Filtros
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCrewId, setSelectedCrewId] = useState('all');
    const [selectedCurrency, setSelectedCurrency] = useState('all');
    const [minMarginVal, setMinMarginVal] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmed' | 'delivered' | 'production'>('all');

    // Formateadores
    const formatMoney = (amount: any, currency: string) => {
        const val = Number(amount) || 0;
        return `${currency === 'USD' ? 'US$' : '$'}${val.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Procesar proyectos con presupuestos vinculados
    const projectsWithFinancials = useMemo(() => {
        return projects.filter(p => p).map(proj => {
            const budget = budgets.find(b => b && b.project_id === proj.id && b.is_active);
            const income = budget ? (Number(budget.total_price) || 0) : 0;
            const currency = proj.currency || 'ARS';

            // Egresos Crew
            const crewAssignments = Array.isArray(proj.crew_assignments) ? proj.crew_assignments : [];
            const crewCost = crewAssignments.reduce((acc, curr) => {
                const currentAcc = Number(acc) || 0;
                if (!curr) return currentAcc;
                const feeVal = Number(curr.fee) || 0;
                if (curr.fee_currency === currency) {
                    return currentAcc + feeVal;
                }
                const rate = curr.fee_currency === 'USD' ? 1000 : 0.001;
                return currentAcc + feeVal * rate;
            }, 0);

            // Costos extras
            const extraExpenses = Array.isArray(proj.extra_expenses) ? proj.extra_expenses : [];
            const extraCost = extraExpenses.reduce((acc, curr) => {
                const currentAcc = Number(acc) || 0;
                if (!curr) return currentAcc;
                const amtVal = Number(curr.amount) || 0;
                if (curr.currency === currency) {
                    return currentAcc + amtVal;
                }
                const rate = curr.currency === 'USD' ? 1000 : 0.001;
                return currentAcc + amtVal * rate;
            }, 0);

            const totalExpenses = crewCost + extraCost;
            const margin = income - totalExpenses;
            const marginPercent = income > 0 ? Math.round((margin / income) * 100) : 0;

            return {
                ...proj,
                income,
                crewCost,
                extraCost,
                totalExpenses,
                margin,
                marginPercent,
                currency
            };
        });
    }, [projects, budgets]);

    // Filtrar proyectos
    const filteredProjects = useMemo(() => {
        return projectsWithFinancials.filter(proj => {
            if (selectedStatus === 'confirmed') {
                if (!['approved', 'production', 'delivered'].includes(proj.status)) return false;
            } else if (selectedStatus === 'delivered') {
                if (proj.status !== 'delivered') return false;
            } else if (selectedStatus === 'production') {
                if (proj.status !== 'production') return false;
            } else {
                if (!['approved', 'production', 'delivered'].includes(proj.status)) return false;
            }

            if (proj.event_date) {
                if (startDate && proj.event_date < startDate) return false;
                if (endDate && proj.event_date > endDate) return false;
            } else {
                if (startDate || endDate) return false;
            }

            if (searchTerm.trim() !== '') {
                const searchLower = searchTerm.toLowerCase();
                const matchTitle = String(proj.title || '').toLowerCase().includes(searchLower);
                const matchContact = String(proj.contact_name || '').toLowerCase().includes(searchLower);
                const matchCompany = String(proj.company_name || '').toLowerCase().includes(searchLower);
                const matchLoc = String(proj.location || '').toLowerCase().includes(searchLower);
                if (!matchTitle && !matchContact && !matchCompany && !matchLoc) return false;
            }

            if (selectedCurrency !== 'all') {
                if (proj.currency !== selectedCurrency) return false;
            }

            if (selectedCrewId !== 'all') {
                const assignments = Array.isArray(proj.crew_assignments) ? proj.crew_assignments : [];
                const hasCrewAssigned = assignments.some(a => a && a.crew_member_id === selectedCrewId);
                if (!hasCrewAssigned) return false;
            }

            if (minMarginVal.trim() !== '') {
                const minMarg = Number(minMarginVal);
                if (proj.marginPercent < minMarg) return false;
            }

            return true;
        });
    }, [projectsWithFinancials, startDate, endDate, searchTerm, selectedCrewId, selectedCurrency, minMarginVal, selectedStatus]);

    // Métricas Totales
    const summaryStats = useMemo(() => {
        let revenueARS = 0;
        let expensesARS = 0;
        let revenueUSD = 0;
        let expensesUSD = 0;

        filteredProjects.forEach(p => {
            if (p.currency === 'USD') {
                revenueUSD += p.income;
                const assignments = Array.isArray(p.crew_assignments) ? p.crew_assignments : [];
                const extras = Array.isArray(p.extra_expenses) ? p.extra_expenses : [];
                assignments.forEach(a => {
                    if (!a) return;
                    const feeVal = Number(a.fee) || 0;
                    expensesUSD += a.fee_currency === 'USD' ? feeVal : feeVal / 1000;
                });
                extras.forEach(e => {
                    if (!e) return;
                    const amtVal = Number(e.amount) || 0;
                    expensesUSD += e.currency === 'USD' ? amtVal : amtVal / 1000;
                });
            } else {
                revenueARS += Number(p.income) || 0;
                const assignments = Array.isArray(p.crew_assignments) ? p.crew_assignments : [];
                const extras = Array.isArray(p.extra_expenses) ? p.extra_expenses : [];
                assignments.forEach(a => {
                    if (!a) return;
                    const feeVal = Number(a.fee) || 0;
                    expensesARS += a.fee_currency === 'ARS' ? feeVal : feeVal * 1000;
                });
                extras.forEach(e => {
                    if (!e) return;
                    const amtVal = Number(e.amount) || 0;
                    expensesARS += e.currency === 'ARS' ? amtVal : amtVal * 1000;
                });
            }
        });

        const marginARS = revenueARS - expensesARS;
        const marginUSD = revenueUSD - expensesUSD;
        const marginPercentARS = revenueARS > 0 ? Math.round((marginARS / revenueARS) * 100) : 0;
        const marginPercentUSD = revenueUSD > 0 ? Math.round((marginUSD / revenueUSD) * 100) : 0;

        return {
            revenueARS,
            expensesARS,
            marginARS,
            marginPercentARS,
            revenueUSD,
            expensesUSD,
            marginUSD,
            marginPercentUSD
        };
    }, [filteredProjects]);

    // Clasificación de Crew
    const crewRanking = useMemo(() => {
        const rankingMap: { [key: string]: { id: string; name: string; role: string; count: number; earnedARS: number; earnedUSD: number } } = {};

        filteredProjects.forEach(p => {
            const assignments = Array.isArray(p.crew_assignments) ? p.crew_assignments : [];
            assignments.forEach(a => {
                if (!a || !a.crew_member_id) return;
                if (!rankingMap[a.crew_member_id]) {
                    rankingMap[a.crew_member_id] = {
                        id: a.crew_member_id,
                        name: a.name || 'Desconocido',
                        role: a.role || 'Otro',
                        count: 0,
                        earnedARS: 0,
                        earnedUSD: 0
                    };
                }
                rankingMap[a.crew_member_id].count += 1;
                const feeVal = Number(a.fee) || 0;
                if (a.fee_currency === 'USD') {
                    rankingMap[a.crew_member_id].earnedUSD += feeVal;
                } else {
                    rankingMap[a.crew_member_id].earnedARS += feeVal;
                }
            });
        });

        return Object.values(rankingMap).sort((a, b) => b.count - a.count);
    }, [filteredProjects]);

    // Clasificación de Empresas y Clientes
    const companyRanking = useMemo(() => {
        const rankingMap: { [key: string]: { name: string; count: number; billedARS: number; billedUSD: number; marginARS: number; marginUSD: number } } = {};

        filteredProjects.forEach(p => {
            const companyNameStr = typeof p.company_name === 'string' ? p.company_name.trim() : '';
            const contactNameStr = typeof p.contact_name === 'string' ? p.contact_name.trim() : '';
            const key = companyNameStr || contactNameStr || 'Desconocido';
            if (!rankingMap[key]) {
                rankingMap[key] = {
                    name: key,
                    count: 0,
                    billedARS: 0,
                    billedUSD: 0,
                    marginARS: 0,
                    marginUSD: 0
                };
            }

            rankingMap[key].count += 1;

            const crewAssignments = Array.isArray(p.crew_assignments) ? p.crew_assignments : [];
            const extraExpenses = Array.isArray(p.extra_expenses) ? p.extra_expenses : [];

            let projCostARS = 0;
            let projCostUSD = 0;

            crewAssignments.forEach(a => {
                if (!a) return;
                const feeVal = Number(a.fee) || 0;
                if (a.fee_currency === 'USD') projCostUSD += feeVal;
                else projCostARS += feeVal;
            });
            extraExpenses.forEach(e => {
                if (!e) return;
                const amtVal = Number(e.amount) || 0;
                if (e.currency === 'USD') projCostUSD += amtVal;
                else projCostARS += amtVal;
            });

            const incomeVal = Number(p.income) || 0;
            if (p.currency === 'USD') {
                rankingMap[key].billedUSD += incomeVal;
                rankingMap[key].marginUSD += (incomeVal - projCostUSD - (projCostARS / 1000));
            } else {
                rankingMap[key].billedARS += incomeVal;
                rankingMap[key].marginARS += (incomeVal - projCostARS - (projCostUSD * 1000));
            }
        });

        return Object.values(rankingMap).sort((a, b) => {
            const valA = a.billedARS + a.billedUSD * 1000;
            const valB = b.billedARS + b.billedUSD * 1000;
            return valB - valA;
        });
    }, [filteredProjects]);

    // Agrupación mensual para gráfico SVG
    const monthlyStats = useMemo(() => {
        const monthlyMap: { [key: string]: { label: string; income: number; expenses: number } } = {};

        filteredProjects.forEach(p => {
            if (!p.event_date) return;
            const dateObj = new Date(p.event_date + 'T12:00:00');
            if (isNaN(dateObj.getTime())) return;
            const year = dateObj.getFullYear();
            const month = dateObj.getMonth();
            const key = `${year}-${String(month + 1).padStart(2, '0')}`;
            const label = dateObj.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });

            if (!monthlyMap[key]) {
                monthlyMap[key] = { label, income: 0, expenses: 0 };
            }

            const rate = p.currency === 'USD' ? 1000 : 1;
            monthlyMap[key].income += (Number(p.income) || 0) * rate;

            const crewAssignments = Array.isArray(p.crew_assignments) ? p.crew_assignments : [];
            const extraExpenses = Array.isArray(p.extra_expenses) ? p.extra_expenses : [];

            crewAssignments.forEach(a => {
                if (!a) return;
                const feeVal = Number(a.fee) || 0;
                const cRate = a.fee_currency === 'USD' ? 1000 : 1;
                monthlyMap[key].expenses += feeVal * cRate;
            });

            extraExpenses.forEach(e => {
                if (!e) return;
                const amtVal = Number(e.amount) || 0;
                const eRate = e.currency === 'USD' ? 1000 : 1;
                monthlyMap[key].expenses += amtVal * eRate;
            });
        });

        return Object.entries(monthlyMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(entry => entry[1])
            .slice(-6);
    }, [filteredProjects]);

    // Exportar a CSV
    const exportToCSV = () => {
        let csvContent = '\uFEFF';
        
        csvContent += '--- RESUMEN GENERAL FINANCIERO ---\n';
        csvContent += `Rango de Fechas;${startDate || 'Inicio'} hasta ${endDate || 'Fin'}\n`;
        csvContent += `Moneda Filtro;${selectedCurrency === 'all' ? 'Todas' : selectedCurrency}\n`;
        csvContent += `Proyectos Analizados;${filteredProjects.length}\n\n`;
        
        csvContent += ';INGRESOS;EGRESOS;MARGEN NETO;MARGEN PORCENTAJE\n';
        csvContent += `Pesos (ARS);${summaryStats.revenueARS};${summaryStats.expensesARS};${summaryStats.marginARS};${summaryStats.marginPercentARS}%\n`;
        csvContent += `Dólares (USD);${summaryStats.revenueUSD};${summaryStats.expensesUSD};${summaryStats.marginUSD};${summaryStats.marginPercentUSD}%\n\n\n`;

        csvContent += '--- DETALLE DE PROYECTOS / EVENTOS ---\n';
        csvContent += 'Fecha;Proyecto;Cliente;Empresa;Estado;Moneda;Ingresos;Costo Crew;Gastos Extras;Margen Neto;Margen %\n';
        filteredProjects.forEach(p => {
            const extraListCost = (p.extra_expenses || []).reduce((acc, curr) => acc + (curr ? (curr.amount || 0) : 0), 0);
            const crewListCost = (p.crew_assignments || []).reduce((acc, curr) => acc + (curr ? (curr.fee || 0) : 0), 0);
            csvContent += `${p.event_date || 'A conf.'};"${(p.title || '').replace(/"/g, '""')}";"${(p.contact_name || '').replace(/"/g, '""')}";"${(p.company_name || '').replace(/"/g, '""')}";${p.status};${p.currency || 'ARS'};${p.income};${crewListCost};${extraListCost};${p.margin};${p.marginPercent}%\n`;
        });
        csvContent += '\n\n';

        csvContent += '--- COLABORADORES (CREW) MÁS CONTRATADOS ---\n';
        csvContent += 'Nombre Colaborador;Rol Frecuente;Jornadas Realizadas;Total Cobrado ARS;Total Cobrado USD\n';
        crewRanking.forEach(c => {
            csvContent += `"${(c.name || '').replace(/"/g, '""')}";${c.role};${c.count};${c.earnedARS};${c.earnedUSD}\n`;
        });
        csvContent += '\n\n';

        csvContent += '--- FACTURACIÓN Y GANANCIA POR CLIENTE / EMPRESA ---\n';
        csvContent += 'Cliente / Empresa;Eventos Totales;Billed ARS;Billed USD;Margen ARS (Estimado);Margen USD (Estimado)\n';
        companyRanking.forEach(c => {
            csvContent += `"${(c.name || '').replace(/"/g, '""')}";${c.count};${c.billedARS};${c.billedUSD};${Math.round(c.marginARS)};${Math.round(c.marginUSD)}\n`;
        });
        csvContent += '\n\n';

        csvContent += '--- DESGLOSE DE GASTOS EXTRAS DE RODAJE ---\n';
        csvContent += 'Fecha Evento;Proyecto;Descripción Gasto;Monto;Moneda\n';
        filteredProjects.forEach(p => {
            const extras = p.extra_expenses || [];
            extras.forEach(e => {
                if (!e) return;
                csvContent += `${p.event_date || 'A conf.'};"${(p.title || '').replace(/"/g, '""')}";"${(e.description || '').replace(/"/g, '""')}";${e.amount};${e.currency}\n`;
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `nexofilm_reporte_financiero_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        <span>📊 Control Financiero y Facturación</span>
                        <span className="text-[10px] bg-nexo-lime/10 text-nexo-lime px-2 py-0.5 rounded border border-nexo-lime/20 font-black uppercase tracking-wider">Métricas Reales</span>
                    </h2>
                    <p className="text-zinc-500 text-xs mt-1">Ingresos, egresos de crew, gastos extras y márgenes netos de jornadas confirmadas.</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="bg-nexo-lime text-black font-black text-xs uppercase tracking-widest px-4 py-2 rounded hover:bg-white transition-all shadow-[0_0_15px_rgba(204,255,0,0.15)] flex items-center gap-1.5 shrink-0"
                >
                    📥 Exportar CSV Excel
                </button>
            </div>

            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    
                    <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">📅 Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">📅 Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">🔍 Cliente / Empresa</label>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-nexo-lime"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">👥 Colaborador (Crew)</label>
                        <select
                            value={selectedCrewId}
                            onChange={e => setSelectedCrewId(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                        >
                            <option value="all">Todos los miembros</option>
                            {crewMembers.map(cm => (
                                <option key={cm.id} value={cm.id}>{cm.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">💵 Moneda Principal</label>
                        <select
                            value={selectedCurrency}
                            onChange={e => setSelectedCurrency(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                        >
                            <option value="all">Todas las monedas</option>
                            <option value="ARS">Sólo Pesos (ARS)</option>
                            <option value="USD">Sólo Dólares (USD)</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">📈 Margen Mínimo (%)</label>
                        <input
                            type="number"
                            placeholder="Ej: 50"
                            min="0"
                            max="100"
                            value={minMarginVal}
                            onChange={e => setMinMarginVal(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-nexo-lime"
                        />
                    </div>

                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex gap-2 text-xs">
                        <span className="text-zinc-500 font-bold uppercase tracking-wider">Estado de Proyectos:</span>
                        <div className="flex gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                                <input type="radio" name="proj_status" checked={selectedStatus === 'all'} onChange={() => setSelectedStatus('all')} className="accent-nexo-lime" />
                                Todos los Confirmados
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                                <input type="radio" name="proj_status" checked={selectedStatus === 'production'} onChange={() => setSelectedStatus('production')} className="accent-nexo-lime" />
                                En Rodaje
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                                <input type="radio" name="proj_status" checked={selectedStatus === 'delivered'} onChange={() => setSelectedStatus('delivered')} className="accent-nexo-lime" />
                                Entregado / Cerrado
                            </label>
                        </div>
                    </div>

                    {(startDate || endDate || searchTerm || selectedCrewId !== 'all' || selectedCurrency !== 'all' || minMarginVal || selectedStatus !== 'all') && (
                        <button
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                                setSearchTerm('');
                                setSelectedCrewId('all');
                                setSelectedCurrency('all');
                                setMinMarginVal('');
                                setSelectedStatus('all');
                            }}
                            className="text-[10px] text-nexo-lime hover:underline uppercase tracking-wider font-bold"
                        >
                            🧹 Limpiar Filtros
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 shadow-2xl space-y-2">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest block">📥 Facturación Bruta (Ingresos)</span>
                    <div className="space-y-1">
                        <p className="text-2xl font-black text-white font-mono">{formatMoney(summaryStats.revenueARS, 'ARS')}</p>
                        <p className="text-lg font-black text-nexo-lime font-mono">{formatMoney(summaryStats.revenueUSD, 'USD')}</p>
                    </div>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 shadow-2xl space-y-2">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest block">📤 Egresos Totales (Crew + Extras)</span>
                    <div className="space-y-1">
                        <p className="text-2xl font-black text-white font-mono">{formatMoney(summaryStats.expensesARS, 'ARS')}</p>
                        <p className="text-lg font-black text-zinc-400 font-mono">{formatMoney(summaryStats.expensesUSD, 'USD')}</p>
                    </div>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 shadow-2xl space-y-2 bg-gradient-to-br from-nexo-lime/[0.02] to-transparent">
                    <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest block">💎 Ganancia Real (Margen Neto)</span>
                    <div className="space-y-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-nexo-lime font-mono">{formatMoney(summaryStats.marginARS, 'ARS')}</span>
                            <span className="text-xs bg-nexo-lime/10 text-nexo-lime px-2 py-0.5 rounded font-black font-mono">{summaryStats.marginPercentARS}%</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <span className="text-lg font-black text-white font-mono">{formatMoney(summaryStats.marginUSD, 'USD')}</span>
                            <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded font-black font-mono">{summaryStats.marginPercentUSD}%</span>
                        </div>
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Histórico Mensual (ARS Normalizado)</h4>
                        <p className="text-[10px] text-zinc-500">Muestra la relación de Ingresos vs Gastos de los últimos 6 meses (1 USD = 1.000 ARS).</p>
                    </div>
                    
                    {monthlyStats.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-zinc-600 text-xs italic">
                            Sin datos temporales en el rango seleccionado
                        </div>
                    ) : (
                        <div className="w-full">
                            <svg className="w-full h-48 bg-zinc-950/40 rounded-lg p-2 overflow-visible" viewBox="0 0 500 200">
                                <line x1="40" y1="20" x2="480" y2="20" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
                                <line x1="40" y1="75" x2="480" y2="75" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
                                <line x1="40" y1="130" x2="480" y2="130" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
                                <line x1="40" y1="160" x2="480" y2="160" stroke="#ffffff" strokeOpacity="0.1" />

                                {monthlyStats.map((m, idx) => {
                                    const colWidth = 60;
                                    const colGap = 15;
                                    const startX = 60 + idx * (colWidth + colGap);
                                    
                                    const maxVal = Math.max(...monthlyStats.map(x => Math.max(x.income, x.expenses)), 100000);
                                    const incHeight = (m.income / maxVal) * 130;
                                    const expHeight = (m.expenses / maxVal) * 130;

                                    return (
                                        <g key={idx} className="group">
                                            <rect
                                                x={startX}
                                                y={160 - incHeight}
                                                width="24"
                                                height={Math.max(incHeight, 2)}
                                                fill="#ccff00"
                                                rx="2"
                                                className="hover:fill-white transition-colors cursor-pointer"
                                            />
                                            <rect
                                                x={startX + 26}
                                                y={160 - expHeight}
                                                width="24"
                                                height={Math.max(expHeight, 2)}
                                                fill="#f87171"
                                                rx="2"
                                                className="hover:fill-zinc-300 transition-colors cursor-pointer"
                                            />
                                            <text x={startX + 25} y="178" fill="#71717a" fontSize="9" fontWeight="bold" textAnchor="middle" className="uppercase font-mono">
                                                {m.label}
                                            </text>
                                            <title>
                                                {`${m.label}\nIngresos: $${m.income.toLocaleString()}\nEgresos: $${m.expenses.toLocaleString()}\nGanancia: $${(m.income - m.expenses).toLocaleString()}`}
                                            </title>
                                        </g>
                                    );
                                })}

                                <text x="10" y="24" fill="#52525b" fontSize="8" fontWeight="bold">MAX</text>
                                <text x="10" y="80" fill="#52525b" fontSize="8" fontWeight="bold">MED</text>
                                <text x="10" y="163" fill="#52525b" fontSize="8" fontWeight="bold">0</text>
                            </svg>
                            <div className="flex gap-4 items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-2">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-nexo-lime rounded-sm" /> Ingresos</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-400 rounded-sm" /> Egresos</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4">
                    <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Desglose de Costos de Rodaje</h4>
                        <p className="text-[10px] text-zinc-500">Distribución porcentual entre el pago a colaboradores (fees) y los gastos extras detallados.</p>
                    </div>

                    {(() => {
                        let totalFees = 0;
                        let totalExtras = 0;
                        filteredProjects.forEach(p => {
                            const assignments = Array.isArray(p.crew_assignments) ? p.crew_assignments : [];
                            const extras = Array.isArray(p.extra_expenses) ? p.extra_expenses : [];
                            assignments.forEach(a => {
                                if (!a) return;
                                const rate = a.fee_currency === 'USD' ? 1000 : 1;
                                totalFees += (a.fee || 0) * rate;
                            });
                            extras.forEach(e => {
                                if (!e) return;
                                const rate = e.currency === 'USD' ? 1000 : 1;
                                totalExtras += (e.amount || 0) * rate;
                            });
                        });

                        const total = totalFees + totalExtras;
                        const feePct = total > 0 ? Math.round((totalFees / total) * 100) : 50;
                        const extraPct = total > 0 ? Math.round((totalExtras / total) * 100) : 50;

                        return total === 0 ? (
                            <div className="h-48 flex items-center justify-center text-zinc-600 text-xs italic">
                                No se registran egresos en el período seleccionado
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-48">
                                <div className="relative w-36 h-36">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#27272a" strokeWidth="4" />
                                        <circle
                                            cx="18" cy="18" r="15.915"
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="4"
                                            strokeDasharray={`${feePct} ${100 - feePct}`}
                                            strokeDashoffset="0"
                                        />
                                        <circle
                                            cx="18" cy="18" r="15.915"
                                            fill="none"
                                            stroke="#a855f7"
                                            strokeWidth="4"
                                            strokeDasharray={`${extraPct} ${100 - extraPct}`}
                                            strokeDashoffset={`${100 - feePct}`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Costo Rodaje</span>
                                        <span className="text-sm font-black text-white font-mono">${Math.round(total).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 w-full sm:w-auto">
                                    <div className="space-y-0.5 border-l-2 border-blue-500 pl-3">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">👥 Honorarios Crew ({feePct}%)</span>
                                        <span className="text-base font-black text-white font-mono">${Math.round(totalFees).toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-0.5 border-l-2 border-purple-500 pl-3">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">💸 Gastos Extras ({extraPct}%)</span>
                                        <span className="text-base font-black text-white font-mono">${Math.round(totalExtras).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-5 border-b border-white/5 bg-zinc-800/10">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">👥 Colaboradores Activos (Ranking Crew)</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">Colaboradores que acumulan más rodajes y montos cobrados en el período filtrado.</p>
                    </div>

                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-950/40 border-b border-white/5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Rol Principal</th>
                                    <th className="px-4 py-3 text-center">Jornadas</th>
                                    <th className="px-4 py-3 text-right">Cobrado (ARS)</th>
                                    <th className="px-4 py-3 text-right">Cobrado (USD)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-zinc-300 text-xs">
                                {crewRanking.map((c, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-4 py-3 font-bold text-white uppercase flex items-center gap-1.5">
                                            <span className="text-[10px] text-zinc-500">#{idx + 1}</span>
                                            {c.name}
                                        </td>
                                        <td className="px-4 py-3 text-zinc-400 capitalize">
                                            {ROLE_ICONS[c.role] || '👤'} {c.role}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-nexo-lime font-mono">
                                            {c.count}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-zinc-400">
                                            {c.earnedARS > 0 ? `$${c.earnedARS.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-white">
                                            {c.earnedUSD > 0 ? `US$${c.earnedUSD.toLocaleString()}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {crewRanking.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-zinc-600 italic">No hay colaboradores registrados en jornadas confirmadas para los filtros aplicados.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-5 border-b border-white/5 bg-zinc-800/10">
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">🏢 Clientes y Empresas Top</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">Listado clasificado por volumen de facturación y margen de ganancia real.</p>
                    </div>

                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-950/40 border-b border-white/5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3">Cliente / Empresa</th>
                                    <th className="px-4 py-3 text-center">Eventos</th>
                                    <th className="px-4 py-3 text-right">Facturado (ARS)</th>
                                    <th className="px-4 py-3 text-right">Facturado (USD)</th>
                                    <th className="px-4 py-3 text-right">Ganancia Est.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-zinc-300 text-xs">
                                {companyRanking.map((c, idx) => {
                                    const hasPositiveMargin = c.marginARS >= 0 && c.marginUSD >= 0;
                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                                            <td className="px-4 py-3 font-bold text-white uppercase flex items-center gap-1.5">
                                                <span className="text-[10px] text-zinc-500">#{idx + 1}</span>
                                                {c.name}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-zinc-400 font-mono">
                                                {c.count}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-zinc-400">
                                                {c.billedARS > 0 ? `$${c.billedARS.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-zinc-400">
                                                {c.billedUSD > 0 ? `US$${c.billedUSD.toLocaleString()}` : '-'}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-mono font-bold ${hasPositiveMargin ? 'text-nexo-lime' : 'text-red-400'}`}>
                                                {c.billedUSD > 0 
                                                    ? `US$${Math.round(c.marginUSD).toLocaleString()}` 
                                                    : `$${Math.round(c.marginARS).toLocaleString()}`
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                                {companyRanking.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-zinc-600 italic">Sin registros de facturación comercial en el período.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-white/5 bg-zinc-800/10 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">📋 Libro de Eventos y Desglose Financiero</h3>
                        <p className="text-[10px] text-zinc-500 mt-1">Listado auditado de todos los proyectos confirmados con sus márgenes reales.</p>
                    </div>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-3 py-1 rounded border border-white/5 font-mono">
                        {filteredProjects.length} proyectos encontrados
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-zinc-950/40 border-b border-white/5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                <th className="px-4 py-3.5">Fecha</th>
                                <th className="px-4 py-3.5">Proyecto / Jornada</th>
                                <th className="px-4 py-3.5">Cliente / Empresa</th>
                                <th className="px-4 py-3.5 text-right">Facturación</th>
                                <th className="px-4 py-3.5 text-right">Egresos Crew</th>
                                <th className="px-4 py-3.5 text-right">Gastos Extras</th>
                                <th className="px-4 py-3.5 text-right">Ganancia Proyectada</th>
                                <th className="px-4 py-3.5 text-center">Margen %</th>
                                <th className="px-4 py-3.5">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-zinc-300 text-xs">
                            {filteredProjects.map((p) => {
                                const extraCost = (p.extra_expenses || []).reduce((acc, curr) => acc + (curr ? (curr.amount || 0) : 0), 0);
                                const crewCostOnly = (p.crew_assignments || []).reduce((acc, curr) => acc + (curr ? (curr.fee || 0) : 0), 0);
                                
                                return (
                                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-4 py-3.5 whitespace-nowrap text-zinc-500 font-mono">
                                            {p.event_date || 'A confirmar'}
                                        </td>
                                        <td className="px-4 py-3.5 font-bold text-white uppercase truncate max-w-[180px]" title={p.title}>
                                            {p.title}
                                        </td>
                                        <td className="px-4 py-3.5 truncate max-w-[150px]" title={p.company_name || p.contact_name}>
                                            <p className="text-zinc-300 font-medium uppercase">{p.contact_name}</p>
                                            {p.company_name && <p className="text-[10px] text-zinc-500 uppercase">{p.company_name}</p>}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                                            {formatMoney(p.income, p.currency || 'ARS')}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-mono text-zinc-400">
                                            {crewCostOnly > 0 ? formatMoney(crewCostOnly, p.currency || 'ARS') : '-'}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-mono text-zinc-400">
                                            {extraCost > 0 ? formatMoney(extraCost, p.currency || 'ARS') : '-'}
                                        </td>
                                        <td className={`px-4 py-3.5 text-right font-mono font-black ${p.margin >= 0 ? 'text-nexo-lime' : 'text-red-400'}`}>
                                            {formatMoney(p.margin, p.currency || 'ARS')}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`inline-block text-[10px] font-black font-mono px-2 py-0.5 rounded ${
                                                p.marginPercent >= 70 ? 'bg-nexo-lime/10 text-nexo-lime' :
                                                p.marginPercent >= 40 ? 'bg-yellow-500/10 text-yellow-500' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                {p.marginPercent}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded border ${
                                                p.status === 'delivered' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' :
                                                p.status === 'production' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                                                'bg-green-500/10 border-green-500/20 text-green-400'
                                            }`}>
                                                {p.status === 'delivered' ? 'Cerrado' : p.status === 'production' ? 'Rodaje' : 'Confirmado'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredProjects.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-zinc-600 italic">No se encontraron proyectos correspondientes a las búsquedas aplicadas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default FinanceDashboard;
