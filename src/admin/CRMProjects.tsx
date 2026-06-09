import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Budget {
    id: string;
    project_id: string;
    version: number;
    items: BudgetItem[];
    total_price: number;
    payment_terms: string;
    client_feedback: string | null;
}

interface BudgetItem {
    description: string;
    quantity: number;
    unit_price: number;
    is_optional?: boolean;
}

interface Project {
    id: string;
    contact_name: string;
    client_email: string;
    company_name: string | null;
    ai_extracted_requirements: any | null;
    last_magic_link_at: string | null;
    title: string;
    status: 'draft' | 'sent' | 'review' | 'approved' | 'rejected' | 'production' | 'delivered';
    access_token: string;
    event_date: string | null;
    event_time: string | null;
    location: string | null;
    coverage_types: string[] | null;
    coverage_hours: number | null;
    drive_folder_id: string | null;
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
    created_at: string;
}

const parsePhone = (phoneStr: string) => {
    if (!phoneStr) return { country: '+54 9', local: '' };
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

const CRMProjects: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('admin_auth') === 'true');
    const [password, setPassword] = useState(() => sessionStorage.getItem('admin_pass') || '');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(false);

    // Formulario de creación
    const [newContactName, setNewContactName] = useState('');
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');
    const [newPhoneCountryCode, setNewPhoneCountryCode] = useState('');
    const [newPhoneLocalNumber, setNewPhoneLocalNumber] = useState('');
    const [newProjTitle, setNewProjTitle] = useState('');
    const [newProjStatus, setNewProjStatus] = useState<'draft' | 'sent'>('draft');
    const [newCurrency, setNewCurrency] = useState<'USD' | 'ARS'>('USD');
    const [newCrewCount, setNewCrewCount] = useState<number | ''>('');

    // Inline editing contact info
    const [editingContactProjectId, setEditingContactProjectId] = useState<string | null>(null);
    const [editingContactName, setEditingContactName] = useState('');
    const [editingCompanyName, setEditingCompanyName] = useState('');
    const [editingClientEmail, setEditingClientEmail] = useState('');
    const [editingPhoneCountryCode, setEditingPhoneCountryCode] = useState('');
    const [editingPhoneLocalNumber, setEditingPhoneLocalNumber] = useState('');
    const [editingCurrency, setEditingCurrency] = useState<'USD' | 'ARS'>('USD');
    const [editingCrewCount, setEditingCrewCount] = useState<number | ''>('');
    const [editingAdminNotes, setEditingAdminNotes] = useState('');
    const [editingEventDate, setEditingEventDate] = useState('');
    const [editingEventTime, setEditingEventTime] = useState('');
    const [editingLocation, setEditingLocation] = useState('');
    const [editingCoverageHours, setEditingCoverageHours] = useState<number | ''>('');
    const [editingGuestsCount, setEditingGuestsCount] = useState<number | ''>('');
    
    // Formulario de presupuesto (Creación)
    const [newBudgetItems, setNewBudgetItems] = useState<BudgetItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);
    const [newPaymentTerms, setNewPaymentTerms] = useState('50% de seña para reservar fecha, 50% contra entrega.');

    // Formulario de presupuesto (Edición)
    const [editingBudgetItems, setEditingBudgetItems] = useState<BudgetItem[]>([{ description: '', quantity: 1, unit_price: 0 }]);
    const [editingPaymentTerms, setEditingPaymentTerms] = useState('50% de seña para reservar fecha, 50% contra entrega.');
    const [aiLoading, setAiLoading] = useState(false);

    // Estado del proyecto seleccionado para facturación
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [bankDetails, setBankDetails] = useState('');
    const [invoiceType, setInvoiceType] = useState<'total' | 'deposit_50' | 'custom'>('deposit_50');
    const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
    const [invoiceUrl, setInvoiceUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    // Estado de presupuesto de proyecto existente
    const [budgetingProject, setBudgetingProject] = useState<Project | null>(null);

    // Estado de Drive
    const [tempDriveId, setTempDriveId] = useState<{ [key: string]: string }>({});

    // Búsqueda, orden y filtros
    const [searchTerm, setSearchTerm] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('search') || '';
    });
    const [hasAutoOpened, setHasAutoOpened] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'price' | 'status' | 'name'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [analyzingProjectId, setAnalyzingProjectId] = useState<string | null>(null);

    const filteredAndSortedProjects = projects
        .filter((project) => {
            const projectBudget = budgets.find(b => b.project_id === project.id);
            const matchesSearch = 
                (project.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.client_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.client_phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (project.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (projectBudget && String(projectBudget.total_price).includes(searchTerm));
            
            const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
            
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'date') {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                comparison = dateA - dateB;
            } else if (sortBy === 'name') {
                comparison = (a.contact_name || '').localeCompare(b.contact_name || '');
            } else if (sortBy === 'status') {
                comparison = (a.status || '').localeCompare(b.status || '');
            } else if (sortBy === 'price') {
                const budgetA = budgets.find(b => b.project_id === a.id)?.total_price || 0;
                const budgetB = budgets.find(b => b.project_id === b.id)?.total_price || 0;
                comparison = budgetA - budgetB;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    // Autocalcular monto de factura al cambiar el tipo
    useEffect(() => {
        if (selectedProject) {
            const activeBudget = budgets.find(b => b.project_id === selectedProject.id);
            if (activeBudget) {
                if (invoiceType === 'total') {
                    setInvoiceAmount(activeBudget.total_price);
                } else if (invoiceType === 'deposit_50') {
                    setInvoiceAmount(Number((activeBudget.total_price / 2).toFixed(2)));
                }
            }
        }
    }, [invoiceType, selectedProject, budgets]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'Nex@2023R') {
            sessionStorage.setItem('admin_auth', 'true');
            sessionStorage.setItem('admin_pass', password);
            setIsAuthenticated(true);
        } else {
            setError('Contraseña incorrecta');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'listProjects', password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al conectar con la API');

            setProjects(data.projects || []);
            setBudgets(data.budgets || []);

            // Inicializar inputs de carpetas de drive
            const driveIds: { [key: string]: string } = {};
            (data.projects || []).forEach((p: Project) => {
                driveIds[p.id] = p.drive_folder_id || '';
            });
            setTempDriveId(driveIds);
        } catch (err: any) {
            console.error(err);
            setError('Falla al obtener proyectos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Eliminar Proyecto
    const handleDeleteProject = async (projectId: string, clientName: string) => {
        if (!window.confirm(`¿Estás seguro de que querés eliminar definitivamente el proyecto de "${clientName}"? Esta acción borrará permanentemente el proyecto y su presupuesto asociado en Supabase.`)) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteProject',
                    project_id: projectId,
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al eliminar proyecto');

            setSuccessMsg(`Proyecto de "${clientName}" eliminado correctamente.`);
            fetchData();
        } catch (err: any) {
            setError('Error al eliminar: ' + err.message);
            setLoading(false);
        }
    };

    // Crear Proyecto + Presupuesto
    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        // Excluir opcionales de la suma total
        const totalPrice = newBudgetItems
            .filter(item => !item.is_optional)
            .reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

        try {
            const countryPrefix = newPhoneCountryCode.trim() !== '' ? newPhoneCountryCode : '+54 9';
            const combinedNewPhone = `${countryPrefix.replace(/\s+/g, '')}${newPhoneLocalNumber.replace(/\D/g, '')}`.replace(/^\++/, '');

            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'createProject',
                    contact_name: newContactName,
                    company_name: newCompanyName || null,
                    client_email: newClientEmail,
                    client_phone: combinedNewPhone || null,
                    notification_preference: 'both',
                    title: newProjTitle,
                    status: newProjStatus,
                    currency: newCurrency,
                    crew_count: newCrewCount === '' ? null : Number(newCrewCount),
                    items: newBudgetItems,
                    total_price: totalPrice,
                    payment_terms: newPaymentTerms,
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al crear proyecto');

            setSuccessMsg(`Proyecto creado con éxito. Copia el link del cliente.`);
            
            // Limpiar formulario
            setNewContactName('');
            setNewCompanyName('');
            setNewClientEmail('');
            setNewPhoneCountryCode('');
            setNewPhoneLocalNumber('');
            setNewProjTitle('');
            setNewCurrency('USD');
            setNewCrewCount('');
            setNewBudgetItems([{ description: '', quantity: 1, unit_price: 0 }]);
            setNewPaymentTerms('50% de seña para reservar fecha, 50% contra entrega.');
            
            fetchData();
        } catch (err: any) {
            setError('Error al crear: ' + err.message);
        }
    };

    // Generar presupuesto sugerido automáticamente
    const handleGenerateAIBudget = async () => {
        const titleToUse = budgetingProject ? budgetingProject.title : newProjTitle;
        const nameToUse = budgetingProject ? budgetingProject.contact_name : newContactName;

        if (!titleToUse.trim()) {
            setError('Ingresá el título del proyecto primero para poder generar sugerencias.');
            return;
        }

        setAiLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generateBudgetIA',
                    title: titleToUse,
                    client_name: nameToUse,
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al generar propuesta');

            if (budgetingProject) {
                if (data.items && data.items.length > 0) {
                    setEditingBudgetItems(data.items);
                }
                if (data.payment_terms) {
                    setEditingPaymentTerms(data.payment_terms);
                }
            } else {
                if (data.items && data.items.length > 0) {
                    setNewBudgetItems(data.items);
                }
                if (data.payment_terms) {
                    setNewPaymentTerms(data.payment_terms);
                }
            }

            setSuccessMsg('✨ ¡Propuesta sugerida! Podés editar las descripciones, poner tus precios y ajustar lo que necesités.');
        } catch (err: any) {
            setError('Error al generar propuesta: ' + err.message);
        } finally {
            setAiLoading(false);
        }
    };

    // Abrir Modal de Edición de Presupuesto para Proyecto Existente
    const openBudgetModal = (proj: Project) => {
        setBudgetingProject(proj);
        const activeBudget = budgets.find(b => b.project_id === proj.id);
        if (activeBudget) {
            setEditingBudgetItems(activeBudget.items || [{ description: '', quantity: 1, unit_price: 0 }]);
            setEditingPaymentTerms(activeBudget.payment_terms || '50% de seña para reservar fecha, 50% contra entrega.');
        } else {
            setEditingBudgetItems([{ description: '', quantity: 1, unit_price: 0 }]);
            setEditingPaymentTerms('50% de seña para reservar fecha, 50% contra entrega.');
        }
    };

    useEffect(() => {
        if (projects.length > 0 && budgets.length > 0 && !hasAutoOpened) {
            const urlParams = new URLSearchParams(window.location.search);
            const pId = urlParams.get('project_id');
            if (pId) {
                const proj = projects.find(p => p.id === pId);
                if (proj) {
                    openBudgetModal(proj);
                    setHasAutoOpened(true);
                }
            }
        }
    }, [projects, budgets, hasAutoOpened]);

    // Actualizar Presupuesto y Enviar (Pasar a SENT)
    const handleUpdateBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!budgetingProject) return;

        setError('');
        setSuccessMsg('');

        // Excluir opcionales de la suma total
        const totalPrice = editingBudgetItems
            .filter(item => !item.is_optional)
            .reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0);

        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateBudget',
                    project_id: budgetingProject.id,
                    items: editingBudgetItems,
                    total_price: totalPrice,
                    payment_terms: editingPaymentTerms,
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al guardar presupuesto');

            setSuccessMsg(`Presupuesto guardado correctamente.`);
            setBudgetingProject(null);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Enviar presupuesto formal por email (cambia estado a SENT y notifica)
    const handleSendBudgetEmail = async (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        const budget = budgets.find(b => b.project_id === projectId);
        if (!project || !budget) return;

        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sendBudget',
                    project_id: projectId,
                    items: budget.items,
                    payment_terms: budget.payment_terms,
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar presupuesto');

            setSuccessMsg(`Presupuesto enviado con éxito a ${project.contact_name}.`);
            fetchData();
        } catch (err: any) {
            setError('Error al enviar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Agregar fila de presupuesto (Creación)
    const addNewBudgetItem = () => {
        setNewBudgetItems([...newBudgetItems, { description: '', quantity: 1, unit_price: 0 }]);
    };

    // Modificar fila de presupuesto (Creación)
    const updateNewBudgetItem = (index: number, field: keyof BudgetItem, val: any) => {
        const newItems = [...newBudgetItems];
        if (field === 'quantity') {
            newItems[index].quantity = parseInt(val) || 0;
        } else if (field === 'unit_price') {
            newItems[index].unit_price = parseFloat(val) || 0;
        } else if (field === 'is_optional') {
            newItems[index].is_optional = !!val;
        } else {
            // @ts-ignore
            newItems[index].description = val;
        }
        setNewBudgetItems(newItems);
    };

    // Agregar fila de presupuesto (Edición)
    const addEditingBudgetItem = () => {
        setEditingBudgetItems([...editingBudgetItems, { description: '', quantity: 1, unit_price: 0 }]);
    };

    // Modificar fila de presupuesto (Edición)
    const updateEditingBudgetItem = (index: number, field: keyof BudgetItem, val: any) => {
        const newItems = [...editingBudgetItems];
        if (field === 'quantity') {
            newItems[index].quantity = parseInt(val) || 0;
        } else if (field === 'unit_price') {
            newItems[index].unit_price = parseFloat(val) || 0;
        } else if (field === 'is_optional') {
            newItems[index].is_optional = !!val;
        } else {
            // @ts-ignore
            newItems[index].description = val;
        }
        setEditingBudgetItems(newItems);
    };

    // Rotar token de acceso
    const handleRotateToken = async (projectId: string) => {
        if (!confirm('¿Seguro que querés rotar el token de acceso? El enlace anterior dejará de funcionar inmediatamente.')) return;
        
        setError('');
        setSuccessMsg('');
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'rotateToken',
                    project_id: projectId,
                    password
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al rotar token');
            
            setSuccessMsg('Token rotado exitosamente. Ya podés copiar el nuevo enlace.');
            fetchData();
        } catch (err: any) {
            setError('Error al rotar token: ' + err.message);
        }
    };

    // Guardar actualización de contacto
    const handleUpdateContactSave = async (projectId: string) => {
        setError('');
        setSuccessMsg('');
        try {
            const countryPrefix = editingPhoneCountryCode.trim() !== '' ? editingPhoneCountryCode : '+54 9';
            const combinedEditingPhone = `${countryPrefix.replace(/\s+/g, '')}${editingPhoneLocalNumber.replace(/\D/g, '')}`.replace(/^\++/, '');

            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateContact',
                    project_id: projectId,
                    contact_name: editingContactName,
                    company_name: editingCompanyName || null,
                    client_email: editingClientEmail,
                    client_phone: combinedEditingPhone || null,
                    currency: editingCurrency,
                    crew_count: editingCrewCount === '' ? null : Number(editingCrewCount),
                    admin_notes: editingAdminNotes || null,
                    event_date: editingEventDate || null,
                    event_time: editingEventTime || null,
                    location: editingLocation || null,
                    coverage_hours: editingCoverageHours === '' ? null : Number(editingCoverageHours),
                    guests_count: editingGuestsCount === '' ? null : Number(editingGuestsCount),
                    password
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al actualizar contacto');
            
            setSuccessMsg('Datos actualizados correctamente.');
            setEditingContactProjectId(null);
            fetchData();
        } catch (err: any) {
            setError('Error al actualizar: ' + err.message);
        }
    };

    // Eliminar fila de presupuesto (Creación)
    const removeNewBudgetItem = (index: number) => {
        if (newBudgetItems.length > 1) {
            setNewBudgetItems(newBudgetItems.filter((_, i) => i !== index));
        }
    };

    // Eliminar fila de presupuesto (Edición)
    const removeEditingBudgetItem = (index: number) => {
        if (editingBudgetItems.length > 1) {
            setEditingBudgetItems(editingBudgetItems.filter((_, i) => i !== index));
        }
    };

    // Cambiar estado del proyecto manualmente
    const handleUpdateStatus = async (projectId: string, newStatus: string) => {
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateStatus',
                    project_id: projectId,
                    status: newStatus,
                    password
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al actualizar estado');
            }
            fetchData();
            setSuccessMsg('Estado actualizado correctamente.');
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Guardar carpeta de drive
    const handleSaveDriveFolder = async (projectId: string) => {
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateDriveFolder',
                    project_id: projectId,
                    drive_folder_id: tempDriveId[projectId],
                    password
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al guardar Drive Folder');
            }
            fetchData();
            setSuccessMsg('Carpeta de Google Drive asociada.');
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Analizar pliego técnico almacenado
    const handleAnalyzeBrief = async (projectId: string) => {
        setAnalyzingProjectId(projectId);
        setError('');
        setSuccessMsg('');
        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'analyzeStoredDocument',
                    project_id: projectId,
                    password
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al analizar documento');

            setSuccessMsg('✨ ¡Pliego técnico analizado con éxito! Los requerimientos y campos básicos fueron actualizados.');
            fetchData();
        } catch (err: any) {
            setError('Error al analizar pliego: ' + err.message);
        } finally {
            setAnalyzingProjectId(null);
        }
    };

    // Subir Factura PDF a Supabase Storage
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProject || !supabase) return;

        setUploading(true);
        setError('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${selectedProject.id}_factura_${Date.now()}.${fileExt}`;
            
            // Subir al bucket 'invoices'
            const { data, error: uploadErr } = await supabase.storage
                .from('invoices')
                .upload(fileName, file, { cacheControl: '3600', upsert: true });

            if (uploadErr) {
                console.error(uploadErr);
                throw new Error('No se pudo subir a Supabase Storage. Asegúrate de haber creado el bucket público llamado "invoices".');
            }

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('invoices')
                .getPublicUrl(fileName);

            setInvoiceUrl(publicUrl);
            setSuccessMsg('PDF de Factura subido con éxito a Supabase Storage.');
        } catch (err: any) {
            setError(err.message + ' (Podes pegar un enlace al PDF manualmente si preferís)');
        } finally {
            setUploading(false);
        }
    };

    // Enviar Facturación y Datos Bancarios
    const handleSendInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProject) return;

        setError('');
        setSuccessMsg('');

        try {
            const res = await fetch('/api/comercial/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sendInvoice',
                    project_id: selectedProject.id,
                    invoice_url: invoiceUrl,
                    invoice_type: invoiceType,
                    invoice_amount: invoiceAmount,
                    bank_details: bankDetails,
                    password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al guardar factura');

            setSuccessMsg(`Facturación registrada para ${selectedProject.contact_name}. El cliente ya puede verla.`);
            setSelectedProject(null);
            setInvoiceUrl('');
            setBankDetails('');
            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };

    // Abrir Modal de Facturación
    const openInvoiceModal = (proj: Project) => {
        setSelectedProject(proj);
        setBankDetails(proj.bank_details || 'BANCO: Santander\nCBU: 0720000000000000000000\nALIAS: nexofilm.estudio\nTITULAR: Martín Magariños');
        setInvoiceUrl(proj.invoice_url || '');
        setInvoiceType(proj.invoice_type || 'deposit_50');
        setInvoiceAmount(proj.invoice_amount || 0);
    };

    const copyClientLink = (token: string) => {
        const url = `${window.location.origin}/portal?token=${token}`;
        navigator.clipboard.writeText(url);
        setSuccessMsg('Link copiado al portapapeles.');
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black font-sans flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-lg p-8 shadow-2xl">
                    <div className="flex justify-center mb-8">
                        <img src="/img/logo.png" alt="NexoFilm" className="h-12 brightness-0 invert" />
                    </div>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-zinc-400 text-sm font-medium">Contraseña de Administrador (CRM)</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                className="w-full bg-black border border-white/20 rounded px-4 py-3 text-white focus:outline-none focus:border-nexo-lime transition-colors"
                                placeholder="••••••••"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-nexo-lime text-black font-bold py-3 rounded hover:bg-white transition-colors"
                        >
                            Ingresar al CRM
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-nexo-lime selection:text-black">
            {/* Header */}
            <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                        <a href="/admin" className="shrink-0">
                            <img src="/img/logo.png" alt="NexoFilm" className="h-5 md:h-6 brightness-0 invert hover:opacity-80" />
                        </a>
                        <span className="text-zinc-700 hidden sm:inline">|</span>
                        <h1 className="text-zinc-300 font-medium text-xs sm:text-sm tracking-wide hidden sm:block truncate">CRM Comercial</h1>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <a href="/admin" className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                            <span className="text-sm">←</span>
                            <span className="hidden sm:inline">Leads</span>
                        </a>
                        <button
                            onClick={() => fetchData()}
                            className="text-xs bg-nexo-lime text-black font-bold px-3 py-1.5 rounded hover:bg-white transition-colors flex items-center gap-1"
                        >
                            <span>↻</span>
                            <span className="hidden sm:inline">Actualizar</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 md:px-6 py-6 md:py-10">
                {/* Mensajes de Alerta */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-nexo-lime/10 border border-nexo-lime/20 text-nexo-lime p-3 rounded-lg mb-4 text-sm">
                        {successMsg}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* COLUMNA IZQUIERDA: CREADOR DE PROYECTOS Y PRESUPUESTOS */}
                    <div className="lg:col-span-1 bg-zinc-900/40 border border-white/5 p-4 md:p-6 rounded-xl shadow-2xl h-fit">
                        <h2 className="text-base md:text-lg font-bold tracking-tight mb-4 text-white border-b border-white/5 pb-3">
                            Nuevo Proyecto Comercial
                        </h2>
                        
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            {/* Fila 1: Contacto + Empresa */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Contacto *</label>
                                    <input
                                        type="text"
                                        required
                                        value={newContactName}
                                        onChange={(e) => setNewContactName(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        placeholder="Carlos Gómez"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Empresa</label>
                                    <input
                                        type="text"
                                        value={newCompanyName}
                                        onChange={(e) => setNewCompanyName(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        placeholder="Nike Argentina"
                                    />
                                </div>
                            </div>

                            {/* Fila 2: Email (ancho completo) */}
                            <div className="space-y-1">
                                <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Email</label>
                                <input
                                    type="email"
                                    value={newClientEmail}
                                    onChange={(e) => setNewClientEmail(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                    placeholder="carlos@nike.com"
                                />
                            </div>

                            {/* Fila 3: WhatsApp + Moneda */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">WhatsApp</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newPhoneCountryCode}
                                            onChange={(e) => setNewPhoneCountryCode(e.target.value)}
                                            placeholder="+54 9"
                                            className="bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime w-[80px] shrink-0"
                                        />
                                        <input
                                            type="text"
                                            value={newPhoneLocalNumber}
                                            onChange={(e) => setNewPhoneLocalNumber(e.target.value)}
                                            className="flex-1 min-w-0 bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                            placeholder="11 5892 2379"
                                        />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 block mt-1">Ej: Código de país (tipo +54 9) y celular (11 5892 2379)</span>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Moneda</label>
                                    <select
                                        value={newCurrency}
                                        onChange={(e) => setNewCurrency(e.target.value as 'USD' | 'ARS')}
                                        className="w-full bg-black border border-white/10 rounded px-2 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="ARS">ARS</option>
                                    </select>
                                </div>
                            </div>

                            {/* Fila 4: Título + Personal */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Título proyecto</label>
                                    <input
                                        type="text"
                                        value={newProjTitle}
                                        onChange={(e) => setNewProjTitle(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                        placeholder="Video Lanzamiento..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Personal</label>
                                    <input
                                        type="number" min="1"
                                        value={newCrewCount}
                                        onChange={(e) => setNewCrewCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-center text-white focus:outline-none focus:border-nexo-lime"
                                        placeholder="2"
                                    />
                                </div>
                            </div>

                            {/* Estado inicial */}
                            <div className="space-y-1">
                                <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Estado Inicial</label>
                                <select
                                    value={newProjStatus}
                                    onChange={(e) => setNewProjStatus(e.target.value as 'draft' | 'sent')}
                                    className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime"
                                >
                                    <option value="draft">Borrador (cliente completa specs)</option>
                                    <option value="sent">Enviar presupuesto ya</option>
                                </select>
                            </div>

                            {/* Creador dinámico de presupuesto */}
                            <div className="space-y-4 border-t border-white/5 pt-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Ítems del Presupuesto</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleGenerateAIBudget}
                                            disabled={aiLoading}
                                            className="text-[10px] bg-nexo-lime text-black font-bold px-2 py-1 rounded hover:bg-white transition-colors disabled:opacity-50"
                                        >
                                            {aiLoading ? '🪄 Generando...' : '🪄 Sugerir Propuesta'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addNewBudgetItem}
                                            className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10"
                                        >
                                            + Añadir Fila
                                        </button>
                                    </div>
                                </div>

                                {newBudgetItems.map((item, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch bg-black/40 p-3 sm:p-2 border border-white/5 rounded">
                                        <textarea
                                            value={item.description}
                                            onChange={(e) => updateNewBudgetItem(idx, 'description', e.target.value)}
                                            className="w-full sm:flex-1 bg-black border border-white/5 rounded px-2.5 py-1.5 text-xs text-white resize-y min-h-[70px] self-start"
                                            placeholder="Detalle del servicio (admite saltos de línea para formato técnico)"
                                            rows={3}
                                        />
                                        <div className="flex gap-2 items-center justify-between sm:justify-start w-full sm:w-auto shrink-0">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-zinc-500 sm:hidden">Cant:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateNewBudgetItem(idx, 'quantity', e.target.value)}
                                                    className="w-12 bg-black border border-white/5 rounded px-1 py-1 text-xs text-center text-white"
                                                    placeholder="Cant"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-zinc-500 sm:hidden">Precio:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateNewBudgetItem(idx, 'unit_price', e.target.value)}
                                                    className="w-20 bg-black border border-white/5 rounded px-2 py-1 text-xs text-right text-white"
                                                    placeholder="Precio U."
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 bg-white/5 px-2 py-1 rounded border border-white/5">
                                                <input
                                                    type="checkbox"
                                                    checked={!!item.is_optional}
                                                    onChange={(e) => updateNewBudgetItem(idx, 'is_optional', e.target.checked)}
                                                    className="accent-nexo-lime h-3.5 w-3.5 bg-black border border-white/10 rounded cursor-pointer"
                                                    title="Marcar como Extra / Opcional"
                                                />
                                                <span className="text-[10px] text-zinc-400">Extra</span>
                                            </div>
                                            {newBudgetItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeNewBudgetItem(idx)}
                                                    className="text-red-500 hover:text-red-400 font-bold px-2 py-1 text-sm bg-red-950/20 border border-red-500/10 rounded sm:bg-transparent sm:border-0 sm:p-0"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <div className="text-right text-xs space-y-1">
                                    <div>
                                        <span className="text-zinc-500">Total Principal: </span>
                                        <span className="font-bold text-nexo-lime">
                                            {newCurrency} {newBudgetItems.filter(i => !i.is_optional).reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0).toLocaleString()}
                                        </span>
                                    </div>
                                    {newBudgetItems.some(i => i.is_optional) && (
                                        <div>
                                            <span className="text-zinc-500">Extras Sugeridos: </span>
                                            <span className="font-bold text-[#00e5ff]">
                                                + {newCurrency} {newBudgetItems.filter(i => i.is_optional).reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 border-t border-white/5 pt-4">
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Términos de Pago</label>
                                <textarea
                                    value={newPaymentTerms}
                                    onChange={(e) => setNewPaymentTerms(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 text-xs text-white focus:outline-none focus:border-nexo-lime h-20 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-nexo-lime text-black font-black text-xs uppercase tracking-widest py-3 rounded hover:bg-white transition-colors"
                            >
                                Crear y Guardar Proyecto
                            </button>
                        </form>
                    </div>

                    {/* COLUMNA DERECHA: PIPELINE DE PROYECTOS */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                            <div className="p-4 md:p-6 border-b border-white/10 bg-zinc-800/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <h2 className="text-base md:text-lg font-bold text-white tracking-tight shrink-0">Pipeline de Proyectos</h2>
                                    
                                    {/* Controles compactos */}
                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                        <div className="relative flex-1 min-w-0">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Buscar cliente, empresa, mail..."
                                                className="w-full bg-black/60 border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-nexo-lime"
                                            />
                                            {searchTerm && (
                                                <button 
                                                    onClick={() => setSearchTerm('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-1.5 shrink-0">
                                            <select
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                className="bg-black/60 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime cursor-pointer"
                                            >
                                                <option value="all">Todos</option>
                                                <option value="draft">Borrador</option>
                                                <option value="review">Por Cotizar</option>
                                                <option value="sent">Enviado</option>
                                                <option value="approved">Aprobado</option>
                                                <option value="rejected">Rechazado</option>
                                                <option value="production">Producción</option>
                                                <option value="delivered">Entregado</option>
                                            </select>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value as any)}
                                                className="bg-black/60 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime cursor-pointer"
                                            >
                                                <option value="date">Fecha</option>
                                                <option value="name">Nombre</option>
                                                <option value="price">Precio</option>
                                                <option value="status">Estado</option>
                                            </select>
                                            <button
                                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                className="bg-black/60 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white hover:border-nexo-lime transition-colors"
                                                title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                                            >
                                                {sortOrder === 'asc' ? '▲' : '▼'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 p-6">
                                {loading ? (
                                    <div className="p-12 text-center text-zinc-500">Cargando proyectos...</div>
                                ) : filteredAndSortedProjects.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-500">
                                        {projects.length === 0 ? "No hay proyectos activos creados." : "No se encontraron proyectos que coincidan con los filtros."}
                                    </div>
                                ) : (
                                    filteredAndSortedProjects.map((project) => {
                                        const projectBudget = budgets.find(b => b.project_id === project.id);
                                        const statusColors: { [key: string]: string } = {
                                            draft: 'bg-zinc-800 text-zinc-400 border-zinc-700',
                                            sent: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                            review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                            approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                            rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
                                            production: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                                            delivered: 'bg-nexo-lime/10 text-nexo-lime border-nexo-lime/20'
                                        };

                                        return (
                                            <div key={project.id} className="bg-zinc-950/40 border border-white/5 hover:border-nexo-lime/25 rounded-xl p-6 transition-all space-y-4 shadow-xl">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="font-bold text-lg text-white">{project.title}</h3>
                                                            <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold border ${statusColors[project.status] || ''}`}>
                                                                {project.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        {editingContactProjectId === project.id ? (
                                                            <div className="bg-black/40 p-4 md:p-6 rounded-xl border border-white/10 mt-2 space-y-4">
                                                                {/* Sección Contacto */}
                                                                <div>
                                                                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">👤 Datos de Contacto</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                                        <input type="text" value={editingContactName} onChange={(e) => setEditingContactName(e.target.value)} placeholder="Nombre contacto" className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none" />
                                                                        <input type="text" value={editingCompanyName} onChange={(e) => setEditingCompanyName(e.target.value)} placeholder="Empresa (Opcional)" className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none" />
                                                                        <input type="email" value={editingClientEmail} onChange={(e) => setEditingClientEmail(e.target.value)} placeholder="Email" className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none" />
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex gap-1.5">
                                                                                <input
                                                                                    type="text"
                                                                                    value={editingPhoneCountryCode}
                                                                                    onChange={(e) => setEditingPhoneCountryCode(e.target.value)}
                                                                                    placeholder="+54 9"
                                                                                    className="bg-black border border-white/20 rounded px-2 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none w-[65px] shrink-0"
                                                                                />
                                                                                <input
                                                                                    type="text"
                                                                                    value={editingPhoneLocalNumber}
                                                                                    onChange={(e) => setEditingPhoneLocalNumber(e.target.value)}
                                                                                    placeholder="11 5892 2379"
                                                                                    className="flex-1 min-w-0 bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none"
                                                                                />
                                                                            </div>
                                                                            <span className="text-[9px] text-zinc-500 block">Ej: +54 9 / 11 5892 2379</span>
                                                                        </div>
                                                                        <select value={editingCurrency} onChange={(e) => setEditingCurrency(e.target.value as 'USD' | 'ARS')} className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none">
                                                                            <option value="USD">USD (Dólares)</option>
                                                                            <option value="ARS">ARS (Pesos)</option>
                                                                        </select>
                                                                        <input type="number" min="1" value={editingCrewCount} onChange={(e) => setEditingCrewCount(e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="Personal" className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-center text-white focus:border-nexo-lime focus:outline-none" />
                                                                    </div>
                                                                </div>
                                                                {/* Sección Evento */}
                                                                <div className="border-t border-white/5 pt-3">
                                                                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">📅 Detalles del Evento</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                                        <input type="date" value={editingEventDate} onChange={(e) => setEditingEventDate(e.target.value)} className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none" title="Fecha del evento" />
                                                                        <input type="time" value={editingEventTime} onChange={(e) => setEditingEventTime(e.target.value)} className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none" title="Horario de inicio" />
                                                                        <input type="text" value={editingLocation} onChange={(e) => setEditingLocation(e.target.value)} placeholder="Locación / Lugar" className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none" />
                                                                        <input type="number" min="1" value={editingCoverageHours} onChange={(e) => setEditingCoverageHours(e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="Horas cobertura" className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none" />
                                                                        <input type="number" min="1" value={editingGuestsCount} onChange={(e) => setEditingGuestsCount(e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="Nº invitados" className="w-full bg-black border border-white/20 rounded px-3 py-2 text-xs text-white focus:border-nexo-lime focus:outline-none" />
                                                                    </div>
                                                                </div>
                                                                {/* Sección Nota para el Cliente */}
                                                                <div className="border-t border-white/5 pt-3">
                                                                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">📝 Mensaje para el Cliente (visible en su portal)</p>
                                                                    <textarea
                                                                        value={editingAdminNotes}
                                                                        onChange={(e) => setEditingAdminNotes(e.target.value)}
                                                                        placeholder="Ej: Necesitamos saber si el evento incluye viáticos, la dirección exacta del salón y si requieren edición express..."
                                                                        className="w-full bg-black border border-amber-500/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 h-20 resize-none"
                                                                    />
                                                                    <p className="text-zinc-600 text-[9px] mt-1">Este mensaje aparecerá resaltado en el portal del cliente como una solicitud tuya.</p>
                                                                </div>
                                                                {/* Botones */}
                                                                <div className="flex gap-2 pt-1">
                                                                    <button onClick={() => handleUpdateContactSave(project.id)} className="bg-nexo-lime text-black font-bold px-4 py-1.5 rounded text-xs hover:bg-white transition-colors">💾 Guardar</button>
                                                                    <button onClick={() => setEditingContactProjectId(null)} className="bg-zinc-800 text-white px-3 py-1.5 rounded text-xs hover:bg-zinc-700">Cancelar</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-1 flex items-start justify-between gap-2">
                                                                <div className="text-xs md:text-sm text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
                                                                    <span>Contacto: <strong className="text-white">{project.contact_name}</strong></span>
                                                                    {project.company_name && <span>Empresa: <strong className="text-white">{project.company_name}</strong></span>}
                                                                    <span>Email: <strong className="text-white">{project.client_email}</strong></span>
                                                                    {project.client_phone && <span>WhatsApp: <strong className="text-white">+{project.client_phone.replace(/^\++/, '')}</strong></span>}
                                                                    <span>Moneda: <strong className="text-white">{project.currency || 'USD'}</strong></span>
                                                                    {project.crew_count && <span>Personal: <strong className="text-white">{project.crew_count} {project.crew_count === 1 ? 'persona' : 'personas'}</strong></span>}
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingContactProjectId(project.id);
                                                                        setEditingContactName(project.contact_name);
                                                                        setEditingCompanyName(project.company_name || '');
                                                                        setEditingClientEmail(project.client_email || '');
                                                                        const parsed = parsePhone(project.client_phone || '');
                                                                        setEditingPhoneCountryCode(parsed.country);
                                                                        setEditingPhoneLocalNumber(parsed.local);
                                                                        setEditingCurrency(project.currency || 'USD');
                                                                        setEditingCrewCount(project.crew_count || '');
                                                                        setEditingAdminNotes(project.admin_notes || '');
                                                                        setEditingEventDate(project.event_date || '');
                                                                        setEditingEventTime(project.event_time || '');
                                                                        setEditingLocation(project.location || '');
                                                                        setEditingCoverageHours(project.coverage_hours || '');
                                                                        setEditingGuestsCount(project.guests_count || '');
                                                                    }}
                                                                    className="text-zinc-500 hover:text-white text-xs shrink-0 p-1 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors"
                                                                    title="Editar datos del proyecto"
                                                                >
                                                                    ✏️
                                                                </button>
                                                            </div>
                                                        )}
                                                        {project.admin_notes && (
                                                            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 mt-2">
                                                                <span className="text-amber-400 text-xs">📝</span>
                                                                <p className="text-amber-300 text-xs italic flex-1">Nota activa al cliente: &quot;{project.admin_notes}&quot;</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
                                                        <button
                                                            onClick={() => copyClientLink(project.access_token)}
                                                            className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5"
                                                            title="Copiar link seguro para el cliente"
                                                        >
                                                            🔗 Copiar Link
                                                        </button>
                                                        <button
                                                            onClick={() => handleRotateToken(project.id)}
                                                            className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-red-500/20 text-red-400 px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                                                            title="Rotar token de acceso (invalida el link anterior)"
                                                        >
                                                            🔄 Rotar Token
                                                        </button>
                                                        {projectBudget && (
                                                             <>
                                                                 {/* Botón de Enviar por Email */}
                                                                 {project.status === 'draft' || project.status === 'review' ? (
                                                                     <button
                                                                         onClick={() => handleSendBudgetEmail(project.id)}
                                                                         className="text-xs bg-nexo-lime text-black font-bold px-3 py-1.5 rounded hover:bg-white transition-colors flex items-center justify-center gap-1.5"
                                                                         title="Enviar presupuesto formal por Email"
                                                                     >
                                                                         ✉️ Enviar por Email
                                                                     </button>
                                                                 ) : (
                                                                     <button
                                                                         onClick={() => {
                                                                             if (confirm('Este presupuesto ya fue enviado por email. ¿Querés volver a enviarlo?')) {
                                                                                 handleSendBudgetEmail(project.id);
                                                                             }
                                                                         }}
                                                                         className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-400 px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 font-bold"
                                                                         title="El presupuesto ya fue enviado por Email. Clic para reenviar."
                                                                     >
                                                                         ✉️ Presupuesto Enviado
                                                                     </button>
                                                                 )}
                                                             </>
                                                         )}
                                                        {project.client_phone && (
                                                            <>
                                                                <a
                                                                    href={`https://wa.me/${project.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`🎥 *NexoFilm - Propuesta Comercial*\n\n¡Hola ${project.contact_name}! Ya preparamos la cotización detallada para tu proyecto "${project.title}".\n\nPodés verla, solicitar modificaciones o aprobarla directamente desde tu portal seguro haciendo clic en el siguiente enlace:\n👉 ${window.location.origin}/portal?token=${project.access_token}`)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1 ${
                                                                        project.status === 'draft' || project.status === 'review'
                                                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-white/10'
                                                                    }`}
                                                                    title="Enviar presupuesto por WhatsApp"
                                                                    onClick={async () => {
                                                                        if (project.status === 'draft' || project.status === 'review') {
                                                                            try {
                                                                                await fetch('/api/comercial/admin', {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({
                                                                                        action: 'updateStatus',
                                                                                        project_id: project.id,
                                                                                        status: 'sent',
                                                                                        password
                                                                                    })
                                                                                });
                                                                                fetchData();
                                                                            } catch (e) {
                                                                                console.error("Error updating status to sent", e);
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    {project.status === 'draft' || project.status === 'review'
                                                                        ? '💬 Enviar Presupuesto'
                                                                        : '💬 Presupuesto Enviado'}
                                                                </a>
                                                                {(project.status === 'draft' || project.status === 'review') && (
                                                                    <a
                                                                        href={`https://wa.me/${project.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`📋 *NexoFilm - Solicitud de Información*\n\n¡Hola ${project.contact_name}!${project.admin_notes ? `\n\n${project.admin_notes}` : '\n\nNecesitamos algunos datos adicionales para terminar de armar tu presupuesto.'}\n\nPodés completarlos directamente desde tu portal ingresando aquí:\n👉 ${window.location.origin}/portal?token=${project.access_token}`)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                                                                        title="Solicitar datos faltantes por WhatsApp"
                                                                    >
                                                                        📲 Pedir datos
                                                                    </a>
                                                                )}
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => openBudgetModal(project)}
                                                            className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            📝 Presupuestar
                                                        </button>
                                                        {(project.status === 'approved' || project.status === 'production' || project.status === 'delivered') && (
                                                            <button
                                                                onClick={() => openInvoiceModal(project)}
                                                                className="text-xs bg-nexo-lime text-black font-bold px-3 py-1.5 rounded hover:bg-white transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                🧾 Factura / Pagos
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteProject(project.id, project.contact_name)}
                                                            className="text-xs bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                                                            title="Eliminar proyecto permanentemente"
                                                        >
                                                            🗑️ Eliminar
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Detalle de Presupuesto Activo y Feedback */}
                                                {projectBudget && (
                                                    <div className="bg-black/30 p-4 border border-white/5 rounded-lg">
                                                        <span className="font-bold text-zinc-300">Presupuesto Activo </span>
                                                        <span className="text-zinc-500 text-[10px] font-semibold mr-2">(Versión {projectBudget.version}): </span>
                                                        <span className="text-white font-medium">{project.currency || 'USD'} {projectBudget.total_price.toLocaleString()}</span>
                                                        <div className="mt-2 space-y-2">
                                                            {projectBudget.items.map((it, i) => (
                                                                <div key={i} className="bg-black/20 border border-white/5 rounded-lg p-3 text-left text-zinc-300">
                                                                    <div className="flex justify-between items-center border-b border-white/5 pb-1.5 mb-2 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                                                                        <span>Concepto #{i + 1} {it.is_optional && <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] ml-1">Opcional</span>}</span>
                                                                        <span>Cantidad: {it.quantity}</span>
                                                                    </div>
                                                                    <div className="whitespace-pre-wrap leading-relaxed text-[13px]">{it.description}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {projectBudget.client_feedback && (
                                                            <div className="bg-zinc-900/80 border border-white/10 p-3 rounded text-xs max-w-xs h-fit mt-3">
                                                                <span className="font-bold text-amber-400 block mb-1">Feedback del Cliente:</span>
                                                                <span className="text-zinc-300 italic">"{projectBudget.client_feedback}"</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Detalle de Especificaciones si completó el cliente */}
                                                {(project.event_date || project.location || (project.coverage_types && project.coverage_types.length > 0) || project.guests_count || project.client_billing_info || project.client_notes) && (
                                                    <div className="bg-black/20 p-4 border border-dashed border-white/10 rounded-lg text-xs space-y-3">
                                                        {(project.event_date || project.location || (project.coverage_types && project.coverage_types.length > 0) || project.guests_count) && (
                                                            <div>
                                                                <span className="font-bold text-nexo-lime block mb-1">📝 Especificaciones del Cliente:</span>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-zinc-400">
                                                                    <p>📅 Fecha: <span className="text-white font-medium">{project.event_date} {project.event_time || ''}</span></p>
                                                                    <p>📍 Locación: <span className="text-white font-medium">{project.location}</span></p>
                                                                    <p>⏱️ Cobertura: <span className="text-white font-medium">{project.coverage_hours ? `${project.coverage_hours} hs` : '-'}</span></p>
                                                                    <p>🎥 Servicios: <span className="text-white font-medium capitalize">{project.coverage_types?.join(', ') || '-'}</span></p>
                                                                    {project.guests_count && <p>👥 Invitados: <span className="text-white font-medium">{project.guests_count} personas</span></p>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {project.client_notes && (
                                                            <div className="border-t border-white/5 pt-2">
                                                                <span className="font-bold text-zinc-300 block mb-1">💬 Observaciones / Consultas del Cliente:</span>
                                                                <p className="text-zinc-400 italic bg-black/40 p-2.5 rounded">"{project.client_notes}"</p>
                                                            </div>
                                                        )}
                                                        {project.client_billing_info && (
                                                            <div className="border-t border-white/5 pt-2">
                                                                <span className="font-bold text-amber-400 block mb-1">🧾 Datos de Facturación cargados por el Cliente:</span>
                                                                <pre className="font-mono text-[10px] whitespace-pre-wrap leading-relaxed text-zinc-300 bg-black/40 p-2.5 rounded">{project.client_billing_info}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Detalle de Requerimientos Extraídos */}
                                                {project.ai_extracted_requirements && Object.keys(project.ai_extracted_requirements).length > 0 && (
                                                    <div className="bg-black/20 p-4 border border-dashed border-white/10 rounded-lg text-xs space-y-3">
                                                        {project.ai_extracted_requirements.raw_uploaded ? (
                                                            <div className="bg-zinc-900 border border-white/10 p-4 rounded-lg text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                                <div>
                                                                    <span className="font-bold text-white block mb-1">📁 Archivo adjunto por el cliente:</span>
                                                                    <span className="text-zinc-400 font-mono">{project.ai_extracted_requirements.filename}</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2 shrink-0">
                                                                    {project.ai_extracted_requirements.file_url && (
                                                                        <a
                                                                            href={project.ai_extracted_requirements.file_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded transition-colors flex items-center gap-1"
                                                                        >
                                                                            📥 Descargar pliego
                                                                        </a>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleAnalyzeBrief(project.id)}
                                                                        disabled={analyzingProjectId === project.id}
                                                                        className="bg-nexo-lime text-black font-black text-[10px] uppercase tracking-wider py-2 px-3 rounded hover:bg-white transition-colors disabled:opacity-50"
                                                                    >
                                                                        {analyzingProjectId === project.id ? (
                                                                            <span className="flex items-center gap-1.5">
                                                                                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                                                                                Analizando...
                                                                            </span>
                                                                        ) : (
                                                                            "🪄 Analizar pliego y autocompletar"
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-nexo-lime/5 p-4 border border-nexo-lime/10 rounded-lg text-xs space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="font-bold text-nexo-lime block uppercase tracking-wider text-[10px]">✨ Requerimientos Extraídos del Documento ({project.ai_extracted_requirements.filename || 'Archivo'}):</span>
                                                                    <button
                                                                        onClick={() => handleAnalyzeBrief(project.id)}
                                                                        disabled={analyzingProjectId === project.id}
                                                                        className="text-zinc-400 hover:text-white text-[10px] underline font-medium"
                                                                    >
                                                                        {analyzingProjectId === project.id ? "Analizando..." : "Re-analizar"}
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-zinc-300">
                                                                    <div>
                                                                        <h4 className="font-bold text-white mb-1">Datos Básicos</h4>
                                                                        <ul className="space-y-1 list-disc list-inside">
                                                                            <li>Fecha: {project.ai_extracted_requirements.basic_data?.event_date || 'No especificada'}</li>
                                                                            <li>Lugar: {project.ai_extracted_requirements.basic_data?.location || 'No especificado'}</li>
                                                                            <li>Horas: {project.ai_extracted_requirements.basic_data?.coverage_hours || 'No especificadas'}</li>
                                                                        </ul>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-white mb-1">Entregables</h4>
                                                                        <ul className="space-y-1 list-disc list-inside">
                                                                            <li>Videos: {project.ai_extracted_requirements.deliverables?.videos_to_deliver || 'No especificados'}</li>
                                                                            <li>Fotos: {project.ai_extracted_requirements.deliverables?.photos_required ? 'Sí' : 'No'}</li>
                                                                            <li>Streaming: {project.ai_extracted_requirements.deliverables?.live_streaming ? 'Sí' : 'No'}</li>
                                                                        </ul>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-white mb-1">Servicios Especiales</h4>
                                                                        <ul className="space-y-1 list-disc list-inside">
                                                                            <li>Edición en vivo: {project.ai_extracted_requirements.special_services?.live_editing_recap ? 'Sí' : 'No'}</li>
                                                                            <li>Iluminación: {project.ai_extracted_requirements.special_services?.lighting_setup || 'No especificada'}</li>
                                                                            <li>Notas: {project.ai_extracted_requirements.special_services?.notes || 'Ninguna'}</li>
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Control de Google Drive y Override de Estado */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                    
                                                    {/* Control de Carpeta de Google Drive */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">ID de Carpeta Google Drive</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={tempDriveId[project.id] || ''}
                                                                onChange={(e) => setTempDriveId({ ...tempDriveId, [project.id]: e.target.value })}
                                                                placeholder="ID de carpeta (ej: 1a2b3c4d...)"
                                                                className="flex-1 bg-black border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                                                            />
                                                            <button
                                                                onClick={() => handleSaveDriveFolder(project.id)}
                                                                className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded text-xs transition-colors"
                                                            >
                                                                Asociar
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Forzado Manual de Estados */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Forzar Cambio de Estado (Admin)</label>
                                                        <select
                                                            value={project.status}
                                                            onChange={(e) => handleUpdateStatus(project.id, e.target.value)}
                                                            className="w-full bg-black border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                                                        >
                                                            <option value="draft">Draft (Edición de Specs)</option>
                                                            <option value="sent">Sent (Presupuesto Abierto)</option>
                                                            <option value="review">Review (Revisión / Feedback)</option>
                                                            <option value="approved">Approved (Aprobado / Pendiente Pago)</option>
                                                            <option value="rejected">Rejected (Rechazado)</option>
                                                            <option value="production">Production (Rodaje / Edición)</option>
                                                            <option value="delivered">Delivered (Entregado en Drive)</option>
                                                        </select>
                                                    </div>

                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* MODAL DE FACTURACIÓN Y PAGO */}
            {selectedProject && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-xl p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start border-b border-white/5 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Registrar Factura y CBU</h3>
                                <p className="text-zinc-400 text-xs mt-1">Proyecto: {selectedProject.title}</p>
                            </div>
                            <button
                                onClick={() => setSelectedProject(null)}
                                className="text-zinc-400 hover:text-white font-bold text-xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSendInvoice} className="space-y-6">
                            
                            {/* Datos de cuenta */}
                            <div className="space-y-2">
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Datos Bancarios para Transferir</label>
                                <textarea
                                    required
                                    value={bankDetails}
                                    onChange={(e) => setBankDetails(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 text-xs text-white focus:outline-none focus:border-nexo-lime h-24"
                                    placeholder="Banco, CBU, Alias, CUIT..."
                                />
                            </div>

                            {/* Tipo de Facturación */}
                            <div className="space-y-2">
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Tipo de Cobro / Factura</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setInvoiceType('deposit_50')}
                                        className={`py-2 rounded text-xs font-bold border transition-colors ${invoiceType === 'deposit_50' ? 'bg-nexo-lime text-black border-nexo-lime' : 'bg-black text-zinc-400 border-white/10 hover:border-white/20'}`}
                                    >
                                        Seña 50%
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInvoiceType('total')}
                                        className={`py-2 rounded text-xs font-bold border transition-colors ${invoiceType === 'total' ? 'bg-nexo-lime text-black border-nexo-lime' : 'bg-black text-zinc-400 border-white/10 hover:border-white/20'}`}
                                    >
                                        Total (100%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInvoiceType('custom')}
                                        className={`py-2 rounded text-xs font-bold border transition-colors ${invoiceType === 'custom' ? 'bg-nexo-lime text-black border-nexo-lime' : 'bg-black text-zinc-400 border-white/10 hover:border-white/20'}`}
                                    >
                                        Monto Custom
                                    </button>
                                </div>
                            </div>

                            {/* Monto de Factura */}
                            <div className="space-y-2">
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Monto a Transferir ({selectedProject?.currency || 'USD'})</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    disabled={invoiceType !== 'custom'}
                                    value={invoiceAmount}
                                    onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 text-sm text-white focus:outline-none focus:border-nexo-lime disabled:opacity-50"
                                />
                            </div>

                            {/* Adjuntar PDF de Factura */}
                            <div className="space-y-2">
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider block">Subir Factura PDF (AFIP/ARCA)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                    className="block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
                                />
                                {uploading && <p className="text-xs text-nexo-lime animate-pulse">Subiendo PDF a Supabase Storage...</p>}
                            </div>

                            {/* Campo de link alternativo */}
                            <div className="space-y-2">
                                <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">O pegá el enlace directo al PDF manualmente:</label>
                                <input
                                    type="text"
                                    value={invoiceUrl}
                                    onChange={(e) => setInvoiceUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-black border border-white/10 rounded px-4 py-1.5 text-xs text-white focus:outline-none focus:border-nexo-lime"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-nexo-lime text-black font-black text-xs uppercase tracking-widest py-3 rounded hover:bg-white transition-colors"
                            >
                                Registrar y Habilitar Cobro
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL DE EDICIÓN DE PRESUPUESTO */}
            {budgetingProject && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-xl p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start border-b border-white/5 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Confeccionar / Editar Presupuesto</h3>
                                <p className="text-zinc-400 text-xs mt-1">Proyecto: {budgetingProject.title} ({budgetingProject.contact_name}{budgetingProject.company_name ? ` - ${budgetingProject.company_name}` : ''})</p>
                            </div>
                            <button
                                onClick={() => setBudgetingProject(null)}
                                className="text-zinc-400 hover:text-white font-bold text-xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Mostrar especificaciones del cliente como referencia si existen */}
                        {(budgetingProject.event_date || budgetingProject.location || (budgetingProject.coverage_types && budgetingProject.coverage_types.length > 0) || budgetingProject.guests_count || budgetingProject.client_notes) && (
                            <div className="bg-black/40 p-4 border border-nexo-lime/20 rounded-lg text-xs space-y-3 bg-gradient-to-r from-nexo-lime/5 to-transparent">
                                <div>
                                    <span className="font-bold text-nexo-lime block mb-1">📋 Requerimientos del Cliente:</span>
                                    <div className="grid grid-cols-2 gap-2 text-zinc-300">
                                        <p>📅 Fecha: <span className="text-white font-semibold">{budgetingProject.event_date} {budgetingProject.event_time}</span></p>
                                        <p>📍 Lugar: <span className="text-white font-semibold">{budgetingProject.location}</span></p>
                                        <p>⏱️ Duración: <span className="text-white font-semibold">{budgetingProject.coverage_hours} horas</span></p>
                                        <p>🎥 Combo: <span className="text-white font-semibold capitalize">{budgetingProject.coverage_types?.join(', ')}</span></p>
                                        {budgetingProject.guests_count && <p>👥 Invitados: <span className="text-white font-semibold">{budgetingProject.guests_count} personas</span></p>}
                                    </div>
                                </div>
                                {budgetingProject.client_notes && (
                                    <div className="border-t border-white/5 pt-2 text-zinc-400">
                                        <span className="font-bold text-zinc-300 block mb-1">💬 Observaciones iniciales:</span>
                                        <p className="italic bg-black/40 p-2 rounded">"{budgetingProject.client_notes}"</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleUpdateBudget} className="space-y-6">
                            
                            {/* Creador dinámico de presupuesto */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Ítems del Presupuesto</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleGenerateAIBudget}
                                            disabled={aiLoading}
                                            className="text-[10px] bg-nexo-lime text-black font-bold px-2 py-1 rounded hover:bg-white transition-colors disabled:opacity-50"
                                        >
                                            {aiLoading ? '🪄 Generando...' : '🪄 Sugerir Propuesta'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addEditingBudgetItem}
                                            className="text-[10px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10"
                                        >
                                            + Añadir Fila
                                        </button>
                                    </div>
                                </div>

                                {editingBudgetItems.map((item, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-2 items-stretch bg-black/40 p-3 sm:p-2 border border-white/5 rounded">
                                        <textarea
                                            required
                                            value={item.description}
                                            onChange={(e) => updateEditingBudgetItem(idx, 'description', e.target.value)}
                                            className="w-full sm:flex-1 bg-black border border-white/5 rounded px-2.5 py-1.5 text-xs text-white resize-y min-h-[70px] self-start"
                                            placeholder="Detalle del servicio (admite saltos de línea para formato técnico)"
                                            rows={3}
                                        />
                                        <div className="flex gap-2 items-center justify-between sm:justify-start w-full sm:w-auto shrink-0">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-zinc-500 sm:hidden">Cant:</span>
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateEditingBudgetItem(idx, 'quantity', e.target.value)}
                                                    className="w-12 bg-black border border-white/5 rounded px-1 py-1 text-xs text-center text-white"
                                                    placeholder="Cant"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-zinc-500 sm:hidden">Precio:</span>
                                                <input
                                                    type="number"
                                                    required
                                                    min="0"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateEditingBudgetItem(idx, 'unit_price', e.target.value)}
                                                    className="w-20 bg-black border border-white/5 rounded px-2 py-1 text-xs text-right text-white"
                                                    placeholder="Precio U."
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 bg-white/5 px-2 py-1 rounded border border-white/5">
                                                <input
                                                    type="checkbox"
                                                    checked={!!item.is_optional}
                                                    onChange={(e) => updateEditingBudgetItem(idx, 'is_optional', e.target.checked)}
                                                    className="accent-nexo-lime h-3.5 w-3.5 bg-black border border-white/10 rounded cursor-pointer"
                                                    title="Marcar como Extra / Opcional"
                                                />
                                                <span className="text-[10px] text-zinc-400">Extra</span>
                                            </div>
                                            {editingBudgetItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditingBudgetItem(idx)}
                                                    className="text-red-500 hover:text-red-400 font-bold px-2 py-1 text-sm bg-red-950/20 border border-red-500/10 rounded sm:bg-transparent sm:border-0 sm:p-0"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <div className="text-right text-xs space-y-1">
                                    <div>
                                        <span className="text-zinc-500">Total Principal: </span>
                                        <span className="font-bold text-nexo-lime">
                                            {budgetingProject?.currency || 'USD'} {editingBudgetItems.filter(i => !i.is_optional).reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0).toLocaleString()}
                                        </span>
                                    </div>
                                    {editingBudgetItems.some(i => i.is_optional) && (
                                        <div>
                                            <span className="text-zinc-500">Extras Sugeridos: </span>
                                            <span className="font-bold text-[#00e5ff]">
                                                + {budgetingProject?.currency || 'USD'} {editingBudgetItems.filter(i => i.is_optional).reduce((acc, curr) => acc + (curr.quantity * curr.unit_price), 0).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Términos de Pago</label>
                                <textarea
                                    required
                                    value={editingPaymentTerms}
                                    onChange={(e) => setEditingPaymentTerms(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded px-4 py-2 text-xs text-white focus:outline-none focus:border-nexo-lime h-24 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-nexo-lime text-black font-black text-xs uppercase tracking-widest py-3 rounded hover:bg-white transition-colors"
                            >
                                Guardar y Enviar Presupuesto al Cliente
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRMProjects;
