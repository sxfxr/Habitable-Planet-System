const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
(async () => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(73482910)');
        await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
        await client.query('COMMIT');
        console.log('Database schema applied successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
})().catch(() => {
    console.error('Database migration failed. Check connectivity and schema permissions.');
    process.exitCode = 1;
}).finally(() => db.end());
