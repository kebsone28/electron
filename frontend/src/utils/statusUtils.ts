import type { Household } from './types';

export const getHouseholdDerivedStatus = (h: Household) => {
    if (h.koboSync?.controleOk) return 'Réception: Validée';
    if (h.koboSync?.interieurOk) return 'Intérieur (Terminé)';
    if (h.koboSync?.reseauOk) return 'Réseau (Terminé)';
    if (h.koboSync?.maconOk) return 'Murs (Terminé)';
    if (h.koboSync?.livreurDate) return 'Livraison (Terminé)';
    return h.status || 'Non débuté';
};
