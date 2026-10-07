const { Pool } = require('pg');
require('dotenv').config(); // Re-enabled

const pool = new Pool({
    // Changed back to use the .env file
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};