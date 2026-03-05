import {
    History,
    Calendar,
    User,
    Search,
    Filter,
    Truck,
    Hammer,
    Zap,
    HardHat,
    ClipboardCheck,
    Smartphone
} from 'lucide-react';
import { useLogistique } from '../../hooks/useLogistique';

export default function DeliveriesTab() {
    const { households, koboStats } = useLogistique();
    const trackingList = households?.filter(h => h.delivery?.date || h.koboSync) || [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Headers & KPI */}
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center space-x-3">
                        <Smartphone className="text-blue-500" />
                        <span>Suivi des Formulaires Kobo</span>
                    </h3>
                    <p className="text-slate-500 font-medium mt-1">Avancement en temps réel du terrain, synchronisé depuis les tablettes.</p>
                </div>
                <div className="flex items-center space-x-4 card p-4">
                    <div className="flex flex-col border-r border-border-subtle pr-6 mr-2">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Kits Préparés (Kobo)</span>
                        <span className="text-2xl font-black text-success">{koboStats?.totalPreparateurKits || 0}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Câbles Livrés (m)</span>
                        <span className="text-2xl font-black text-primary">
                            {(koboStats?.cableInt25Total || 0) + (koboStats?.cableInt15Total || 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-[var(--radius-xl)] bg-surface-alt border border-border-subtle">
                <div className="flex items-center space-x-4 flex-1 min-w-[300px]">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                        <input
                            type="text"
                            placeholder="Rechercher un ménage..."
                            className="input-field pl-10"
                        />
                    </div>
                    <div className="flex items-center space-x-2 bg-surface border border-border rounded-[var(--radius-md)] px-3 py-2">
                        <Calendar size={16} className="opacity-60" />
                        <span className="text-xs font-bold opacity-80">Derniers 30 jours (Kobo)</span>
                    </div>
                </div>
                <button className="btn-secondary flex items-center space-x-2">
                    <Filter size={16} />
                    <span>Filtres Avancés</span>
                </button>
            </div>

            {/* Main Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Ménage</th>
                                <th>Livreur</th>
                                <th>Phases Déploiement (Validé Kobo)</th>
                                <th>Matériaux Enregistrés</th>
                                <th className="text-right">Statut Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trackingList?.map((d, i) => {
                                const phasesOptions = [
                                    { label: 'Livreur', ok: !!d.koboSync?.livreurDate || !!d.delivery?.date, icon: Truck, color: 'blue' },
                                    { label: 'Maçon', ok: !!d.koboSync?.maconOk, icon: Hammer, color: 'orange' },
                                    { label: 'Réseau', ok: !!d.koboSync?.reseauOk, icon: Zap, color: 'emerald' },
                                    { label: 'Intérieur', ok: !!d.koboSync?.interieurOk, icon: HardHat, color: 'indigo' },
                                    { label: 'Contrôle', ok: !!d.koboSync?.controleOk, icon: ClipboardCheck, color: 'fuchsia' },
                                ];
                                const finalOk = d.koboSync?.controleOk || d.status === 'Conforme';

                                return (
                                    <tr key={i}>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs text-primary font-bold">{d.id}</span>
                                                <span className="text-[10px] opacity-70">{d.region}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-surface">
                                                    <User size={14} className="opacity-60" />
                                                </div>
                                                <span className="font-bold text-xs">{d.delivery?.agent || 'En attente'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center space-x-1.5">
                                                {phasesOptions.map((ph, idx) => (
                                                    <div
                                                        key={idx}
                                                        title={ph.label + (ph.ok ? ' (Fait)' : ' (Attente)')}
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${ph.ok ? `bg-surface border-border shadow-sm opacity-100` : `bg-surface-alt border-border-subtle opacity-40 grayscale`}`}
                                                    >
                                                        <ph.icon size={13} className={ph.ok ? `text-${ph.color}-500` : 'opacity-60'} />
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col space-y-1">
                                                {(d.koboSync?.cableInt25 || 0) > 0 && (
                                                    <span className="text-[10px] bg-surface-alt px-2 py-0.5 rounded-[var(--radius-sm)] w-fit font-mono">
                                                        Câble 2.5: {d.koboSync?.cableInt25}m
                                                    </span>
                                                )}
                                                {(d.koboSync?.tranchee4 || 0) > 0 && (
                                                    <span className="text-[10px] bg-surface-alt px-2 py-0.5 rounded-[var(--radius-sm)] w-fit font-mono">
                                                        Tranchée: {d.koboSync?.tranchee4}m
                                                    </span>
                                                )}
                                                {!(d.koboSync?.cableInt25) && !(d.koboSync?.tranchee4) && (
                                                    <span className="text-[10px] opacity-50">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <span className={`badge ${finalOk ? 'badge-success' : 'badge-warning'}`}>
                                                {finalOk ? 'Approuvé' : 'En cours'}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {trackingList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4 opacity-20">
                                            <History size={64} className="text-slate-400" />
                                            <p className="text-xl font-bold text-slate-400">Aucun historique Kobo</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
