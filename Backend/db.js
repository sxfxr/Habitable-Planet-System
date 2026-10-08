const { Pool } = require('pg');
require('dotenv').config();
const config = { max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 };
if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    if (process.env.NODE_ENV === 'production') url.searchParams.set('sslmode', 'verify-full');
    config.connectionString = url.toString();
} else {
    Object.assign(config, {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'habitable_planets',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD
    });
}
const pool = new Pool(config);
pool.on('error', () => console.error('An idle database connection failed.'));
module.exports = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
    end: () => pool.end()
};
