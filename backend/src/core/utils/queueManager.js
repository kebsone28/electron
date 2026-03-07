import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/config.js';

/**
 * Service de Gestion des Queues - PROQUELEC Phase 2
 *
 * En production (REDIS_URL défini), utilise Redis + BullMQ pour les jobs.
 * En développement local sans Redis, les queues sont désactivées (no-ops).
 */

// Redis est disponible si une URL est fournie, ou si l'hôte n'est pas localhost
const isRedisConfigured = !!config.redis.url || (
    config.redis.host &&
    config.redis.host !== 'localhost' &&
    config.redis.host !== '127.0.0.1'
);

let redisConnection = null;

if (isRedisConfigured) {
    const redisOptions = {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 100, 15000)
    };

    redisConnection = config.redis.url
        ? new IORedis(config.redis.url, {
            ...redisOptions,
            tls: config.redis.tls ? {} : undefined
        })
        : new IORedis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            ...redisOptions,
            tls: config.redis.tls ? {} : undefined
        });

    let lastErrorLog = 0;
    redisConnection.on('error', (err) => {
        const now = Date.now();
        if (now - lastErrorLog > 10000) {
            console.error('[REDIS ERROR] Connexion Redis impossible:', err.message);
            lastErrorLog = now;
        }
    });

    redisConnection.on('connect', () => {
        console.log(`[REDIS] ✅ Connecté à Redis: ${config.redis.host || 'via URL'}:${config.redis.port}`);
    });
} else {
    console.warn('[REDIS] ⚠️  Redis non configuré en local. Les jobs asynchrones (BullMQ) sont désactivés.');
    console.warn('[REDIS]    Ajoutez REDIS_URL dans backend/.env pour activer les queues.');
}

/**
 * Crée une file d'attente BullMQ.
 * Retourne null si Redis n'est pas disponible (graceful degradation).
 */
export const createQueue = (name) => {
    if (!isRedisConfigured || !redisConnection) {
        return null;
    }
    try {
        return new Queue(name, { connection: redisConnection });
    } catch (e) {
        console.warn(`[QUEUE] Impossible de créer la file "${name}":`, e.message);
        return null;
    }
};

/**
 * Crée un Worker BullMQ.
 * Retourne null si Redis n'est pas disponible (graceful degradation).
 */
export const createWorker = (name, processor, options = {}) => {
    if (!isRedisConfigured || !redisConnection) {
        return null;
    }
    try {
        return new Worker(name, processor, {
            connection: redisConnection,
            ...options
        });
    } catch (e) {
        console.warn(`[WORKER] Impossible de créer le worker "${name}":`, e.message);
        return null;
    }
};

export { redisConnection };
export default { redisConnection, createQueue, createWorker };
