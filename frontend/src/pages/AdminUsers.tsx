import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../store/db';
import type { UserRole, User as ManagedUser } from '../utils/types';
import {
    Users, Plus, Edit3, Trash2, ShieldCheck, Shield, User,
    Eye, EyeOff, Save, X, Search, Lock, CheckCircle2,
    AlertTriangle, UserCheck, UserX, RefreshCw
} from 'lucide-react';
import { appSecurity } from '../services/appSecurity';
import { useEffect } from 'react';

// Les constantes statiques de sécurité sont gérées par appSecurity

// ─── Config rôles ───────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<UserRole, {
    label: string; color: string; textColor: string;
    icon: typeof Shield; description: string
}> = {
    ADMIN_PROQUELEC: { label: 'Admin', color: 'bg-indigo-500/15 border-indigo-500/40', textColor: 'text-indigo-400', icon: ShieldCheck, description: 'Accès complet + 2FA' },
    DG_PROQUELEC: { label: 'DG', color: 'bg-emerald-500/15 border-emerald-500/40', textColor: 'text-emerald-400', icon: Shield, description: 'Finances + Rapports' },
    CLIENT_LSE: { label: 'Client LSE', color: 'bg-amber-500/15 border-amber-500/40', textColor: 'text-amber-400', icon: User, description: 'Carte + Avancement' },
    CHEF_EQUIPE: { label: 'Chef Équipe', color: 'bg-blue-500/15 border-blue-500/40', textColor: 'text-blue-400', icon: Users, description: 'Dashboard Équipe' },
};

const emptyForm = (): Omit<ManagedUser, 'id' | 'createdAt'> => ({
    email: '', password: '', role: 'CHEF_EQUIPE', name: '', teamId: undefined, active: true, requires2FA: false,
});

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: number; msg: string; type: ToastType }

let _toastId = 0;

// ─── Composant principal ─────────────────────────────────────────────────────
export default function AdminUsers() {
    const users = useLiveQuery(() => db.users.toArray()) || [];
    const teams = useLiveQuery(() => db.teams.toArray()) || [];

    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm());
    const [showPass, setShowPass] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // ── Delete modal state ──
    const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
    const [delPass, setDelPass] = useState('');
    const [delAnswer, setDelAnswer] = useState('');
    const [delStep, setDelStep] = useState<1 | 2>(1);
    const [delError, setDelError] = useState('');
    const [showDelPass, setShowDelPass] = useState(false);
    const [activeSecurityQuestion, setActiveSecurityQuestion] = useState('');

    // Load question on mount or change
    useEffect(() => {
        appSecurity.get('securityQuestion').then(setActiveSecurityQuestion);
    }, []);

    // ── Password reset modal ──
    const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);

    // ─── Toast helpers ────────────────────────────────────────────────────────
    const addToast = (msg: string, type: ToastType = 'success') => {
        const id = ++_toastId;
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    // ─── Filtering ────────────────────────────────────────────────────────────
    const filtered = users.filter((u: ManagedUser) =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    );

    // ─── Open form (create / edit) ────────────────────────────────────────────
    const openAdd = () => {
        setEditId(null); setForm(emptyForm()); setShowForm(true); setShowPass(false);
    };
    const openEdit = (u: ManagedUser) => {
        setEditId(u.id);
        setForm({ email: u.email, password: u.password, role: u.role, name: u.name, teamId: u.teamId, active: u.active, requires2FA: u.requires2FA });
        setShowForm(true); setShowPass(false);
    };

    // ─── Save (create / update) ───────────────────────────────────────────────
    const saveUser = async () => {
        if (!form.email.trim() || !form.password?.trim() || !form.name.trim()) {
            addToast('Tous les champs obligatoires doivent être remplis.', 'error'); return;
        }
        if ((form.password?.length ?? 0) < 6) {
            addToast('Le mot de passe doit faire au moins 6 caractères.', 'error'); return;
        }
        try {
            if (editId) {
                await db.users.update(editId, form);
                addToast(`✏️  Compte "${form.name}" mis à jour avec succès.`, 'success');
            } else {
                const newUser: ManagedUser = {
                    ...form,
                    id: Date.now().toString(),
                    createdAt: new Date().toISOString().split('T')[0],
                };
                await db.users.add(newUser);
                addToast(`✅  Compte "${form.name}" créé avec succès.`, 'success');
            }
            setShowForm(false);
        } catch {
            addToast('❌  Erreur lors de l\'enregistrement.', 'error');
        }
    };

    // ─── Open delete modal ────────────────────────────────────────────────────
    const openDelete = (u: ManagedUser) => {
        if (u.id === '1') { addToast('Impossible de supprimer le compte Admin principal.', 'error'); return; }
        setDeleteTarget(u);
        setDelPass(''); setDelAnswer(''); setDelError('');
        setDelStep(u.role === 'ADMIN_PROQUELEC' ? 1 : 1);
        setShowDelPass(false);
    };

    // ─── Confirm delete: step 1 (password) ────────────────────────────────────
    const confirmDelStep1 = async () => {
        if (!deleteTarget) return;
        // Non-admin: direct delete
        if (deleteTarget.role !== 'ADMIN_PROQUELEC') {
            executeDelete();
            return;
        }
        // Admin: check password first
        const ok = await appSecurity.check('adminPassword', delPass);
        if (!ok) {
            setDelError('Mot de passe incorrect. Veuillez réessayer.');
            return;
        }
        setDelError('');
        setDelStep(2);
    };

    // ─── Confirm delete: step 2 (security question) ───────────────────────────
    const confirmDelStep2 = async () => {
        const ok = await appSecurity.check('securityAnswer', delAnswer, true);
        if (!ok) {
            setDelError('Réponse incorrecte. Suppression annulée.');
            return;
        }
        executeDelete();
    };

    const executeDelete = async () => {
        if (!deleteTarget) return;
        const name = deleteTarget.name;
        await db.users.delete(deleteTarget.id);
        addToast(`🗑️  Compte "${name}" supprimé définitivement.`, 'warning');
        setDeleteTarget(null);
    };

    // ─── Toggle active ────────────────────────────────────────────────────────
    const toggleActive = async (u: ManagedUser) => {
        if (u.id === '1') { addToast('Impossible de désactiver le compte Admin principal.', 'error'); return; }
        const next = !u.active;
        await db.users.update(u.id, { active: next });
        addToast(
            next ? `▶️  Compte "${u.name}" activé.` : `⏸️  Compte "${u.name}" désactivé.`,
            next ? 'success' : 'info'
        );
    };

    // ─── Quick password reset ────────────────────────────────────────────────
    const openReset = (u: ManagedUser) => {
        setResetTarget(u); setNewPassword(''); setShowNewPass(false);
    };
    const saveReset = async () => {
        if (!resetTarget) return;
        if (newPassword.length < 6) { addToast('Le mot de passe doit faire au moins 6 caractères.', 'error'); return; }
        await db.users.update(resetTarget.id, { password: newPassword });
        addToast(`🔑  Mot de passe de "${resetTarget.name}" réinitialisé.`, 'success');
        setResetTarget(null);
    };

    // ─── Role stats ──────────────────────────────────────────────────────────
    const roleStats = Object.entries(ROLE_CONFIG).map(([role, cfg]) => ({
        ...cfg, role, count: users.filter((u: ManagedUser) => u.role === role).length,
    }));

    const isAdminDelete = deleteTarget?.role === 'ADMIN_PROQUELEC';

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8">

            {/* ── Toast Stack ── */}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm pointer-events-auto animate-in slide-in-from-right-4 duration-300 ${t.type === 'success' ? 'bg-emerald-600 text-white' :
                        t.type === 'error' ? 'bg-red-600 text-white' :
                            t.type === 'warning' ? 'bg-amber-500 text-white' :
                                'bg-indigo-600 text-white'
                        }`}>
                        {t.type === 'success' ? <CheckCircle2 size={16} /> :
                            t.type === 'error' ? <AlertTriangle size={16} /> :
                                t.type === 'warning' ? <AlertTriangle size={16} /> :
                                    <CheckCircle2 size={16} />}
                        {t.msg}
                    </div>
                ))}
            </div>

            {/* ── Delete Modal ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[4000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center shrink-0">
                                <Trash2 className="text-red-400" size={22} />
                            </div>
                            <div>
                                <h3 className="text-white font-black text-xl">
                                    {isAdminDelete ? 'Suppression compte Admin' : 'Supprimer ce compte ?'}
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    {isAdminDelete
                                        ? `Étape ${delStep}/2 — Vérification requise`
                                        : 'Cette action est irréversible.'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); if (isAdminDelete) { if (delStep === 1) confirmDelStep1(); else confirmDelStep2(); } else executeDelete(); }}>
                            {/* Warning banner */}
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
                                <p className="text-red-300 text-sm font-bold">
                                    Vous allez supprimer le compte de{' '}
                                    <span className="italic">"{deleteTarget.name}"</span>
                                    {isAdminDelete && ' (Administrateur)'}
                                    . Cette action est définitive.
                                </p>
                            </div>

                            {/* Step progress for admin */}
                            {isAdminDelete && (
                                <div className="flex items-center gap-2 mb-6">
                                    {[1, 2].map(s => (
                                        <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s < delStep ? 'bg-emerald-500' : s === delStep ? 'bg-indigo-500' : 'bg-slate-700'
                                            }`} />
                                    ))}
                                    <span className="text-xs text-slate-500 font-bold ml-1">{delStep}/2</span>
                                </div>
                            )}

                            {/* Step 1: Password (admin) OR direct (non-admin) */}
                            {(!isAdminDelete || delStep === 1) && (
                                <div className="space-y-4">
                                    {isAdminDelete && (
                                        <>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                                Étape 1 — Mot de passe administrateur
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showDelPass ? 'text' : 'password'}
                                                    value={delPass}
                                                    onChange={e => { setDelPass(e.target.value); setDelError(''); }}
                                                    placeholder="Votre mot de passe admin"
                                                    title="Mot de passe administrateur"
                                                    autoComplete="current-password"
                                                    autoFocus
                                                    className={`w-full bg-slate-950 border rounded-xl px-4 py-3 pr-12 text-white font-mono font-medium placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${delError ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-800 focus:ring-indigo-500/30'}`}
                                                />
                                                <button type="button" title="Afficher/masquer" onClick={() => setShowDelPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
                                                    {showDelPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    {delError && <p className="text-red-400 text-xs font-bold">{delError}</p>}
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all">
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black transition-all active:scale-95 shadow-lg shadow-red-600/20"
                                        >
                                            {isAdminDelete ? 'Vérifier →' : 'Supprimer'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Security question (admin only) */}
                            {isAdminDelete && delStep === 2 && (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                        <p className="text-indigo-300 text-xs font-black uppercase tracking-widest mb-1">Question de sécurité</p>
                                        <p className="text-white font-bold text-sm">{activeSecurityQuestion}</p>
                                    </div>
                                    <input
                                        type="text"
                                        value={delAnswer}
                                        onChange={e => { setDelAnswer(e.target.value); setDelError(''); }}
                                        placeholder="Votre réponse..."
                                        title="Réponse à la question de sécurité"
                                        autoComplete="off"
                                        autoFocus
                                        className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white font-medium placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${delError ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-800 focus:ring-indigo-500/30'}`}
                                    />
                                    {delError && <p className="text-red-400 text-xs font-bold">{delError}</p>}
                                    <div className="flex gap-3 pt-2">
                                        <button type="button" onClick={() => { setDelStep(1); setDelError(''); setDelAnswer(''); }} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all">
                                            ← Retour
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black transition-all active:scale-95 shadow-lg shadow-red-600/20"
                                        >
                                            Supprimer définitivement
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* ── Reset Password Modal ── */}
            {resetTarget && (
                <div className="fixed inset-0 z-[4000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center">
                                <RefreshCw size={18} className="text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-black">Réinitialiser le mot de passe</h3>
                                <p className="text-slate-400 text-xs">{resetTarget.name}</p>
                            </div>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); saveReset(); }}>
                            <div className="relative mb-4">
                                <input
                                    type={showNewPass ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Nouveau mot de passe (min. 6 car.)"
                                    title="Nouveau mot de passe"
                                    autoComplete="new-password"
                                    autoFocus
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-white font-mono font-medium placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <button type="button" title="Afficher/masquer" onClick={() => setShowNewPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
                                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setResetTarget(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all">Annuler</button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
                                    <Save size={14} /> Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Main ── */}
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                            <Users className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Gestion des Utilisateurs</h1>
                            <p className="text-slate-500 font-medium">{users.length} compte(s) — {users.filter((u: ManagedUser) => u.active).length} actif(s) — Réservé Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
                    >
                        <Plus size={20} /> Nouveau Compte
                    </button>
                </header>

                {/* Role Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {roleStats.map(s => {
                        const Icon = s.icon;
                        return (
                            <div key={s.role} className={`p-5 rounded-2xl border ${s.color}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <Icon size={18} className={s.textColor} />
                                    <span className={`text-2xl font-black ${s.textColor}`}>{s.count}</span>
                                </div>
                                <p className="text-white font-bold text-sm">{s.label}</p>
                                <p className="text-slate-500 text-[11px] mt-0.5">{s.description}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Rechercher un compte..."
                        title="Rechercher par nom, identifiant ou rôle"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white font-medium placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>

                {/* User table */}
                <div className="card overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Statut</th>
                                <th>Utilisateur</th>
                                <th>Identifiant (Login)</th>
                                <th>Rôle</th>
                                <th>Équipe / Accès</th>
                                <th>Mot de passe</th>
                                <th>Création</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => {
                                const rc = ROLE_CONFIG[u.role as UserRole] || ROLE_CONFIG.CHEF_EQUIPE;
                                const RoleIcon = rc.icon;
                                return (
                                    <tr key={u.id} className={!u.active ? 'opacity-50' : ''}>
                                        <td className="w-12 text-center">
                                            <div
                                                className={`status-dot ${u.active ? 'online' : 'offline'} cursor-pointer hover:scale-125 transition-transform`}
                                                title={u.active ? 'Actif — cliquer pour désactiver' : 'Désactivé — cliquer pour activer'}
                                                onClick={() => toggleActive(u)}
                                            />
                                        </td>
                                        <td className="font-bold">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded border flex items-center justify-center ${rc.color}`}>
                                                    <RoleIcon size={12} className={rc.textColor} />
                                                </div>
                                                {u.name}
                                                {u.requires2FA && <span className="text-[9px] font-black bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md">2FA</span>}
                                            </div>
                                        </td>
                                        <td className="font-mono text-slate-500">@{u.email}</td>
                                        <td>
                                            <span className={`badge ${u.role.includes('ADMIN') ? 'badge-primary' : u.role.includes('CHEF') ? 'badge-success' : 'badge-warning'}`}>
                                                {rc.label}
                                            </span>
                                        </td>
                                        <td className="text-slate-500">
                                            {u.teamId ? teams.find((t: any) => t.id === u.teamId)?.name : 'Accès global'}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => openReset(u)}
                                                title="Réinitialiser le mot de passe"
                                                className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors group"
                                            >
                                                <Lock size={12} />
                                                <span className="font-mono">{'•'.repeat(Math.min(u.password?.length || 0, 8))}</span>
                                                <RefreshCw size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        </td>
                                        <td className="text-slate-500">{u.createdAt}</td>
                                        <td>
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(u)} title="Modifier" className="p-1.5 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100/5">
                                                    <Edit3 size={15} />
                                                </button>
                                                <button onClick={() => toggleActive(u)} title={u.active ? 'Désactiver le compte' : 'Activer le compte'} className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-500/5">
                                                    {u.active ? <UserX size={15} /> : <UserCheck size={15} />}
                                                </button>
                                                <button onClick={() => openDelete(u)} title="Supprimer le compte" className="p-1.5 text-slate-400 hover:text-danger transition-colors rounded-lg hover:bg-red-500/5">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-slate-500 font-medium">
                            {search ? `Aucun résultat pour "${search}"` : 'Aucun compte enregistré.'}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Create / Edit Form Drawer ── */}
            {showForm && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-white">
                                {editId ? '✏️ Modifier le compte' : '➕ Nouveau compte'}
                            </h2>
                            <button onClick={() => setShowForm(false)} title="Fermer" aria-label="Fermer le formulaire" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); saveUser(); }} className="space-y-5">
                            {/* Nom complet */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nom complet *</label>
                                <input type="text" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                                    placeholder="ex: Chef Maçons" title="Nom complet"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            {/* Email / Username */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Identifiant (Email/Login) *</label>
                                <input type="text" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))}
                                    placeholder="ex: maçongem" title="Identifiant de connexion"
                                    autoComplete="username"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono font-medium placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Mot de passe *</label>
                                <div className="relative">
                                    <input type={showPass ? 'text' : 'password'} value={form.password}
                                        onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))}
                                        placeholder="Min. 6 caractères" title="Mot de passe"
                                        autoComplete="new-password"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-12 text-white font-mono font-medium placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    <button type="button" title="Afficher/masquer le mot de passe" onClick={() => setShowPass(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Rôle *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(([role, cfg]) => (
                                        <button key={role} type="button"
                                            onClick={() => setForm((f: any) => ({ ...f, role, teamId: role !== 'CHEF_EQUIPE' ? undefined : f.teamId }))}
                                            className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all ${form.role === role ? `${cfg.color} ${cfg.textColor}` : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}
                                        >
                                            <cfg.icon size={14} /> {cfg.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Team (Chef Équipe only) */}
                            {form.role === 'CHEF_EQUIPE' && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Équipe assignée</label>
                                    <select title="Choisir l'équipe" value={form.teamId ?? ''} onChange={e => setForm((f: any) => ({ ...f, teamId: e.target.value || undefined }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                        <option value="">— Sélectionner une équipe —</option>
                                        {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* 2FA (Admin only) */}
                            {form.role === 'ADMIN_PROQUELEC' && (
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div onClick={() => setForm((f: any) => ({ ...f, requires2FA: !f.requires2FA }))}
                                        className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${form.requires2FA ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.requires2FA ? 'translate-x-4' : ''}`} />
                                    </div>
                                    <span className="text-slate-300 font-medium text-sm">Activer la double authentification (2FA)</span>
                                </label>
                            )}

                            {/* Active toggle */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div onClick={() => setForm((f: any) => ({ ...f, active: !f.active }))}
                                    className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${form.active ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-4' : ''}`} />
                                </div>
                                <span className="text-slate-300 font-medium text-sm">Compte actif</span>
                            </label>

                            <div className="flex gap-3 mt-8">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3.5 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all">Annuler</button>
                                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-95">
                                    <Save size={16} /> {editId ? 'Enregistrer les modifications' : 'Créer le compte'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
