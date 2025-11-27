/**
 * Value Object pour les coûts
 * Immutable
 */
class Cost {
    constructor(amount, currency = 'FCFA') {
        if (typeof amount !== 'number' || amount < 0) {
            throw new ValidationError('Cost amount must be a positive number');
        }

        this._amount = amount;
        this._currency = currency;

        Object.freeze(this);
    }

    get amount() {
        return this._amount;
    }

    get currency() {
        return this._currency;
    }

    /**
     * Additionner deux coûts
     */
    add(other) {
        if (!(other instanceof Cost)) {
            throw new Error('Parameter must be Cost instance');
        }
        if (this._currency !== other._currency) {
            throw new Error('Cannot add costs with different currencies');
        }
        return new Cost(this._amount + other._amount, this._currency);
    }

    /**
     * Soustraire deux coûts
     */
    subtract(other) {
        if (!(other instanceof Cost)) {
            throw new Error('Parameter must be Cost instance');
        }
        if (this._currency !== other._currency) {
            throw new Error('Cannot subtract costs with different currencies');
        }
        const result = this._amount - other._amount;
        if (result < 0) {
            throw new Error('Result cannot be negative');
        }
        return new Cost(result, this._currency);
    }

    /**
     * Multiplier par un facteur
     */
    multiply(factor) {
        if (typeof factor !== 'number' || factor < 0) {
            throw new Error('Factor must be a positive number');
        }
        return new Cost(this._amount * factor, this._currency);
    }

    /**
     * Diviser par un facteur
     */
    divide(divisor) {
        if (typeof divisor !== 'number' || divisor <= 0) {
            throw new Error('Divisor must be a positive number');
        }
        return new Cost(this._amount / divisor, this._currency);
    }

    /**
     * Comparer avec un autre coût
     */
    isGreaterThan(other) {
        if (!(other instanceof Cost)) {
            throw new Error('Parameter must be Cost instance');
        }
        if (this._currency !== other._currency) {
            throw new Error('Cannot compare costs with different currencies');
        }
        return this._amount > other._amount;
    }

    isLessThan(other) {
        if (!(other instanceof Cost)) {
            throw new Error('Parameter must be Cost instance');
        }
        if (this._currency !== other._currency) {
            throw new Error('Cannot compare costs with different currencies');
        }
        return this._amount < other._amount;
    }

    /**
     * Égalité
     */
    equals(other) {
        if (!(other instanceof Cost)) return false;
        return this._amount === other._amount &&
            this._currency === other._currency;
    }

    /**
     * Vérifier si le coût est zéro
     */
    isZero() {
        return this._amount === 0;
    }

    /**
     * Formater le coût
     */
    format(locale = 'fr-FR') {
        return `${this._amount.toLocaleString(locale)} ${this._currency}`;
    }

    /**
     * Représentation textuelle
     */
    toString() {
        return this.format();
    }

    /**
     * Sérialisation JSON
     */
    toJSON() {
        return {
            amount: this._amount,
            currency: this._currency
        };
    }

    /**
     * Désérialisation JSON
     */
    static fromJSON(data) {
        return new Cost(data.amount, data.currency);
    }

    /**
     * Créer un coût zéro
     */
    static zero(currency = 'FCFA') {
        return new Cost(0, currency);
    }

    /**
     * Sommer plusieurs coûts
     */
    static sum(costs) {
        if (!Array.isArray(costs) || costs.length === 0) {
            return Cost.zero();
        }

        const currency = costs[0].currency;
        const total = costs.reduce((sum, cost) => {
            if (cost.currency !== currency) {
                throw new Error('All costs must have the same currency');
            }
            return sum + cost.amount;
        }, 0);

        return new Cost(total, currency);
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.Cost = Cost;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Cost;
}
