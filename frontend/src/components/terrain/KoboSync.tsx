import { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import { RefreshCw, Settings, CloudDownload, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useProject } from '../../hooks/useProject';

interface KoboSyncProps {
    onImport: (data: any[]) => void;
}

export default function KoboSync({ onImport }: KoboSyncProps) {
    const { project } = useProject();

    const [config, setConfig] = useState({
        token: '',
        assetUid: ''
    });

    useEffect(() => {
        if (project?.config && typeof project.config === 'object' && 'kobo' in project.config) {
            const koboConfig = (project.config as any).kobo;
            if (koboConfig) {
                setConfig({
                    token: koboConfig.token || '',
                    assetUid: koboConfig.assetUid || ''
                });
            }
        }
    }, [project]);

    const [isSyncing, setIsSyncing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showConfig, setShowConfig] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        setStatus('idle');
        try {
            // Use local Vite proxy to avoid CORS issues
            const response = await axios.get(`/api/kobo/assets/${config.assetUid}/data.json`, {
                headers: { Authorization: `Token ${config.token}` }
            });

            if (response.data && response.data.results) {
                const mappedData = response.data.results.map((item: any) => {
                    // Extract true/false from the select_one oui_non fields
                    const parseBoolean = (val: any) => val === 'oui' || val === 'yes' || val === 'true';

                    const maconOk = parseBoolean(item.mur_pret) || parseBoolean(item['avancement_conditions/mur_pret']);
                    const materielLivre = parseBoolean(item.materiel_livre) || parseBoolean(item['avancement_conditions/materiel_livre']);
                    const reseauOk = parseBoolean(item.reseau_termine) || parseBoolean(item['avancement_conditions/reseau_termine']);
                    const interieurOk = parseBoolean(item.interieur_termine) || parseBoolean(item['avancement_conditions/interieur_termine']);

                    const controleRes = item.resultat_controle || item['controle_technique/resultat_controle'];
                    const controleOk = controleRes === 'conforme' || controleRes === 'valide';
                    const controleKo = controleRes === 'non_conforme' || controleRes === 'rejete';

                    // Cable/Tranchee values (for logistics KPIs)
                    const cable25 = parseFloat(item['group_wu8kv54/group_sy9vj14/Longueur_Cable_2_5mm_Int_rieure'] || 0);
                    const tranchee4 = parseFloat(item['group_wu8kv54/group_sy9vj14/Longueur_Tranch_e_C_ble_arm_1_5mm'] || 0); // Note: backend uses this for length

                    return {
                        id: item._id || item.id_menage || item['info_menage/id_menage'] || `KOBO-${Math.random().toString(36).substr(2, 9)}`,
                        status: item.statut_global || item['avancement_conditions/statut_global'] || item.etat_avancement || 'Non encore commencé',
                        region: item.region || item['info_localisation/region'] || 'Inconnue',
                        owner: item.nom_chef_menage || item['info_menage/nom_chef_menage'] || 'Inconnu',
                        phone: item.telephone || item['info_menage/telephone'] || '',
                        ...(item._geolocation && item._geolocation.length >= 2 && !isNaN(item._geolocation[0]) && !isNaN(item._geolocation[1]) ? {
                            location: {
                                type: "Point",
                                coordinates: [item._geolocation[1], item._geolocation[0]]
                            }
                        } : {}),
                        delivery: {
                            agent: item.nom_enqueteur || item.username,
                            date: item._submission_time
                        },
                        koboSync: {
                            livreurDate: materielLivre ? item._submission_time : null,
                            maconOk: maconOk,
                            reseauOk: reseauOk,
                            interieurOk: interieurOk,
                            controleOk: controleOk ? true : (controleKo ? false : undefined),
                            cableInt25: cable25,
                            tranchee4: tranchee4,
                            preparateurKits: parseInt(item['group_ed3yt17/Nombre_de_KIT_pr_par'] || 0)
                        },
                        koboData: item // Save the raw item string for backend to ingest if needed
                    };
                });

                onImport(mappedData);
                setStatus('success');
            }
        } catch (error) {
            logger.error('Kobo Sync Error:', error);
            setStatus('error');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800/50 p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-400" />
                    Synchro Kobo
                </h3>
                <button
                    title="Configurer les paramètres Kobo"
                    onClick={() => setShowConfig(!showConfig)}
                    className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {showConfig && (
                <div className="space-y-4 mb-6 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                    <p className="text-[10px] text-amber-500 font-bold mb-2">Les configurations globales se font dans l'onglet Paramètres. Utilisez ces champs uniquement pour forcer un import différent.</p>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Token API (Surcharge)</label>
                        <input
                            type="password"
                            title="Token API"
                            value={config.token}
                            onChange={(e) => setConfig(prev => ({ ...prev, token: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Asset UID (Surcharge)</label>
                        <input
                            type="text"
                            title="Asset UID"
                            value={config.assetUid}
                            onChange={(e) => setConfig(prev => ({ ...prev, assetUid: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
            )}

            <button
                title="Lancer la synchronisation Kobo"
                onClick={handleSync}
                disabled={isSyncing || !config.token || !config.assetUid}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncing || !config.token || !config.assetUid ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                    }`}
            >
                {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                    <CloudDownload className="w-4 h-4" />
                )}
                {isSyncing ? 'Synchronisation...' : 'Lancer Synchro'}
            </button>

            {status !== 'idle' && (
                <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 border ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                        {status === 'success' ? 'Synchronisation réussie' : 'Erreur de connexion'}
                    </span>
                </div>
            )}
        </div>
    );
}
