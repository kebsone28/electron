import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

console.log('🔍 Loaded DB_URL from env:', process.env.DATABASE_URL);
console.log('🔍 Current Working Directory:', process.cwd());

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    dbUrl: process.env.DATABASE_URL,
    jwt: {
        secret: process.env.JWT_SECRET || 'secret',
        accessExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
        refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'refresh_secret',
        refreshExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d'
    },
    cors: {
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',')
            : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
    },
    sentry: {
        dsn: process.env.SENTRY_DSN
    }
};
