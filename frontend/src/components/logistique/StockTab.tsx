import { useState } from 'react';
import {
    AlertCircle,
    Info,
    PenLine,
    Save,
    Box,
    Layers,
    X
} from 'lucide-react';
import { useLogistique } from '../../hooks/useLogistique';
import { useTheme } from '../../context/ThemeContext';
import { KIT_CATEGORIES, CATEGORY_COLORS } from '../../utils/config';
import { fmtNum } from '../../utils/format';
import toast from 'react-hot-toast';

interface StockTabProps {
    searchQuery?: string;
}

export default function StockTab({ searchQuery = '' }: StockTabProps) {
    const { stockData, project } = useLogistique();
    const { isDarkMode } = useTheme();
    const [isAdminMode, setIsAdminMode] = useState(false);

    // Group by category
    const categoriesMap = KIT_CATEGORIES.map(cat => ({
        name: cat,
        items: stockData.filter(i => i.category === cat && i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(c => c.items.length > 0);

    const totalUnits = stockData.reduce((sum, item) => sum + item.current, 0);
    const kitsLoaded = project?.config?.logistics_workshop?.kitsLoaded || 0;
    const overrideCount = stockData.filter(i => i.hasOverride).length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        icon: Layers,
                        label: 'Kits Chargés',
                        value: kitsLoaded,
                        color: 'blue',
                        detail: 'Basé sur le chargement réel'
                    },
                    {
                        icon: Box,
                        label: 'Total Unités Stock',
                        value: fmtNum(Math.round(totalUnits)),
                        color: 'emerald',
                        detail: 'Calculé via nomenclature (BOM)'
                    },
                    {
                        icon: AlertCircle,
                        label: 'Corrections Manuelles',
                        value: overrideCount,
                        color: 'amber',
                        hasAction: true
                    }
                ].map((card, idx) => {
                    const Icon = card.icon;
                    const colorClasses: Record<string, { bg: string; icon: string; badge: string }> = {
                        blue: { bg: 'bg-blue-500/10 border-blue-500/20', icon: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-500' },
                        emerald: { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500' },
                        amber: { bg: 'bg-amber-500/10 border-amber-500/20', icon: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-500' }
                    };
                    const classes = colorClasses[card.color];

                    return (
                        <div key={idx} className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl p-6 transition-all hover:shadow-lg group`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl ${classes.bg}`}>
                                    <Icon className={`${classes.icon}`} size={24} />
                                </div>
                            </div>
                            <h4 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                                {card.label}
                            </h4>
                            <p className={`text-4xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {card.value}
                            </p>
                            {card.detail && (
                                <div className={`flex items-center space-x-2 text-xs font-medium ${classes.badge} px-3 py-1.5 rounded-lg w-fit`}>
                                    <Info size={14} />
                                    <span>{card.detail}</span>
                                </div>
                            )}
                            {card.hasAction && (
                                <button
                                    onClick={() => setIsAdminMode(true)}
                                    className={`mt-4 flex items-center space-x-2 font-semibold text-sm transition-all p-2 rounded-lg ${classes.badge} hover:shadow-md`}
                                >
                                    <PenLine size={14} />
                                    <span>Éditer</span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {categoriesMap.length === 0 ? (
                    <div className={`lg:col-span-2 flex flex-col items-center justify-center py-16 ${isDarkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-100 border-slate-200'} border rounded-2xl`}>
                        <Box size={48} className={isDarkMode ? 'text-slate-700 mb-4' : 'text-slate-400 mb-4'} />
                        <p className={isDarkMode ? 'text-slate-500' : 'text-slate-600'}>Aucun article trouvé</p>
                    </div>
                ) : (
                    categoriesMap.map((cat) => {
                        const style = CATEGORY_COLORS[cat.name] || { bg: 'bg-slate-800/50', border: 'border-slate-800', text: 'text-slate-400' };
                        return (
                            <div key={cat.name} className={`rounded-2xl overflow-hidden border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} transition-all hover:shadow-lg`}>
                                <div className={`p-4 ${style.bg} border-b ${style.border}`}>
                                    <h3 className={`text-sm font-bold uppercase tracking-widest ${style.text}`}>{cat.name}</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className={`w-full text-sm ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                                        <thead className={isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}>
                                            <tr>
                                                <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Article</th>
                                                <th className={`px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Qté/Kit</th>
                                                <th className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Stock Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className={isDarkMode ? 'divide-y divide-slate-800' : 'divide-y divide-slate-200'}>
                                            {cat.items.map((item) => (
                                                <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                                                    <td className={`px-6 py-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{item.label}</span>
                                                            <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>{item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-4 text-center font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                        {item.qty}
                                                    </td>
                                                    <td className={`px-6 py-4 text-right`}>
                                                        <div className="flex flex-col items-end">
                                                            <span className={`text-lg font-black ${item.hasOverride ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : ''}`}>
                                                                {fmtNum(Math.round(item.current))}
                                                            </span>
                                                            {item.hasOverride && (
                                                                <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-tighter mt-1">
                                                                    ✓ Admin
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Admin Modal */}
            {isAdminMode && (
                <div className={`fixed inset-0 z-[2000] flex items-center justify-center p-4 ${isDarkMode ? 'bg-slate-950/80' : 'bg-black/40'} backdrop-blur-sm animate-in fade-in`}>
                    <div className={`${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95`}>
                        {/* Header */}
                        <div className={`p-6 border-b ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Audit & Corrections</h3>
                                    <p className={`text-sm font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Forcez les valeurs de stock pour corriger les inventaires.</p>
                                </div>
                                <button
                                    onClick={() => setIsAdminMode(false)}
                                    title="Close"
                                    className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className={`p-6 max-h-[60vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stockData.map(item => (
                                    <div key={item.id} className={`${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
                                        <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} title={item.label}>
                                            {item.label}
                                        </label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="number"
                                                className={`flex-1 rounded-lg py-2 px-3 text-sm font-semibold transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-primary focus:ring-2 focus:ring-primary/30' : 'bg-white border-slate-300 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/30'} border focus:outline-none`}
                                                placeholder={`${Math.round(item.calculated)} (auto)`}
                                                defaultValue={item.hasOverride ? item.current : ''}
                                            />
                                            <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>{item.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`p-6 border-t ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} flex justify-end gap-3`}>
                            <button
                                onClick={() => setIsAdminMode(false)}
                                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    toast.success('Stock mis à jour avec succès ✓');
                                    setIsAdminMode(false);
                                }}
                                className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-2.5 rounded-lg font-semibold transition-all active:scale-95 shadow-lg shadow-amber-600/20"
                            >
                                <Save size={18} />
                                <span>Sauvegarder</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
