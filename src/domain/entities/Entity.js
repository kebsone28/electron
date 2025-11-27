/**
 * Classe de base pour toutes les entités du domaine
 * Une entité a une identité unique et un cycle de vie
 */
class Entity {
    constructor(id) {
        if (!id) {
            throw new Error('Entity must have an id');
        }
        this._id = id;
        this._createdAt = new Date();
        this._updatedAt = new Date();
        this._events = [];
    }

    get id() {
        return this._id;
    }

    get createdAt() {
        return this._createdAt;
    }

    get updatedAt() {
        return this._updatedAt;
    }

    /**
     * Marque l'entité comme modifiée
     */
    touch() {
        this._updatedAt = new Date();
    }

    /**
     * Émet un événement de domaine
     */
    emit(eventName, data) {
        const event = {
            name: eventName,
            aggregateId: this._id,
            occurredOn: new Date(),
            data
        };
        this._events.push(event);

        // Si un EventBus global existe, émettre l'événement
        if (typeof window !== 'undefined' && window.eventBus) {
            window.eventBus.emit(eventName, { ...data, aggregateId: this._id });
        }
    }

    /**
     * Récupère et vide les événements de domaine
     */
    pullDomainEvents() {
        const events = [...this._events];
        this._events = [];
        return events;
    }

    /**
     * Vérifie l'égalité avec une autre entité
     */
    equals(other) {
        if (!other || !(other instanceof Entity)) {
            return false;
        }
        return this._id === other._id;
    }

    /**
     * Clone l'entité (shallow copy)
     */
    clone() {
        throw new Error('Clone method must be implemented by subclass');
    }

    /**
     * Valide l'entité
     */
    validate() {
        // À implémenter dans les sous-classes
        return true;
    }

    /**
     * Convertit l'entité en objet simple (pour sérialisation)
     */
    toJSON() {
        return {
            id: this._id,
            createdAt: this._createdAt.toISOString(),
            updatedAt: this._updatedAt.toISOString()
        };
    }

    /**
     * Crée une entité depuis un objet simple
     */
    static fromJSON(data) {
        throw new Error('fromJSON method must be implemented by subclass');
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.Entity = Entity;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Entity;
}
