// --- Imports ---
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5000;
const validPositive = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
const validNonNegative = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
const validText = value => typeof value === 'string' && value.trim().length > 0;

// --- Middleware ---
app.use(cors(process.env.FRONTEND_ORIGIN ? { origin: process.env.FRONTEND_ORIGIN } : {}));
app.use(express.json({ limit: '32kb' }));
// Render terminates TLS at its reverse proxy.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
// Same-origin frontend and API: no public API URL or separate frontend host required.
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
});
// Small in-memory limit for login/signup; resets when the free instance sleeps/restarts.
const authAttempts = new Map();
app.use('/api/auth', (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    for (const [ip, entry] of authAttempts) {
        if (now - entry.start >= 15 * 60 * 1000) authAttempts.delete(ip);
    }
    const current = authAttempts.get(key);
    const entry = current && now - current.start < 15 * 60 * 1000 ? current : { start: now, count: 0 };
    entry.count++;
    authAttempts.set(key, entry);
    if (entry.count > 40) return res.status(429).json({ message: 'Too many authentication requests. Please try again later.' });
    next();
});
app.get('/api/health', async (req,res) => {
    try { await db.query('SELECT 1 FROM users, stars, planets, observations LIMIT 0'); res.json({ status: 'ok', database: 'connected' }); }
    catch { res.status(503).json({ status: 'degraded', database: 'unavailable' }); }
});

// --- Authentication Middleware (Security Guard) ---
const isResearcher = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Access denied. No token provided.' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. Malformed token.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'researcher') {
            return res.status(403).json({ message: 'Access forbidden. Researcher access required.' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

//============================================
// --- AUTHENTICATION ENDPOINTS ---
//============================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const allowedRoles = ['researcher', 'viewer'];
        if (!username || !password || !role) return res.status(400).json({ message: 'Username, password, and role are required.' });
        if (!allowedRoles.includes(role)) return res.status(400).json({ message: "Invalid role specified. Must be 'researcher' or 'viewer'." });
        if (role === 'researcher' && (!process.env.RESEARCHER_SIGNUP_KEY || req.body.researcher_signup_key !== process.env.RESEARCHER_SIGNUP_KEY)) return res.status(403).json({ message: 'Researcher registration requires an invitation key.' });
        if (!validText(username) || username.length > 100 || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ message: 'Use a username up to 100 characters and a password of at least 8 characters and at most 72 UTF-8 bytes.' });
        const userExists = await db.query('SELECT * FROM Users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) return res.status(409).json({ message: 'Username is already taken.' });
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const newUserQuery = `INSERT INTO Users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING user_id, username, role;`;
        const newUser = await db.query(newUserQuery, [username, password_hash, role]);
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        console.error("Error registering user:", err.message);
        if (err.code === '23505') return res.status(409).json({ message: 'Username is already taken.' });
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!validText(username) || username.length > 100 || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ message: 'Username and password are required.' });
        const result = await db.query('SELECT * FROM Users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' });
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error("Error logging in:", err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

//============================================
// --- PUBLIC GETTER ENDPOINTS ---
//============================================
app.get('/api/stars', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM stars ORDER BY star_name');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stars' });
    }
});

app.get('/api/stars/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const starPromise = db.query('SELECT * FROM stars WHERE star_id = $1', [id]);
        const planetsPromise = db.query('SELECT * FROM planets WHERE star_id = $1 ORDER BY planet_id', [id]);
        const [starResult, planetResult] = await Promise.all([starPromise, planetsPromise]);
        if (starResult.rows.length === 0) return res.status(404).json({ message: 'Star not found' });
        res.status(200).json({ star: starResult.rows[0], planets: planetResult.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch star details' });
    }
});

app.get('/api/planets/:id/observations', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM observations WHERE planet_id = $1 ORDER BY observation_date DESC', [id]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch observations' });
    }
});

//==================================================
// --- PROTECTED CREATE & UPDATE ENDPOINTS ---
//==================================================
app.post('/api/stars', isResearcher, async (req, res) => {
    try {
        const { star_name, distance_ly, spectral_type, luminosity } = req.body;
        if (!validText(star_name) || !validPositive(luminosity) || !validPositive(distance_ly)) return res.status(400).json({ message: 'Star name, luminosity, and distance are required.' });
        const newStarQuery = `INSERT INTO stars (star_name, distance_ly, spectral_type, luminosity) VALUES ($1, $2, $3, $4) RETURNING *;`;
        const newStar = await db.query(newStarQuery, [star_name, distance_ly, spectral_type, luminosity]);
        res.status(201).json(newStar.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create star' });
    }
});

app.post('/api/planets', isResearcher, async (req, res) => {
    try {
        const { star_id, planet_name, planet_type, angular_separation_arcsec } = req.body;
        if (!Number.isInteger(Number(star_id)) || Number(star_id) <= 0 || !validText(planet_name) || !validText(planet_type) || !validNonNegative(angular_separation_arcsec)) {
            return res.status(400).json({ message: 'Star ID, planet name, type, and non-negative angular separation are required.' });
        }

        const newPlanetQuery = `
            INSERT INTO planets (star_id, planet_name, planet_type, angular_separation_arcsec)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (star_id, planet_name) DO NOTHING
            RETURNING *;
        `;
        const newPlanetResult = await db.query(newPlanetQuery, [star_id, planet_name, planet_type, angular_separation_arcsec]);

        if (newPlanetResult.rows.length === 0) {
            return res.status(409).json({ message: `Planet named '${planet_name}' already exists in this star system.` });
        }
        const newPlanet = newPlanetResult.rows[0];

        // After the trigger runs, fetch the new observation record to return to the frontend.
        const newObservationQuery = `
            SELECT * FROM observations
            WHERE planet_id = $1
            ORDER BY observation_date DESC
            LIMIT 1;
        `;
        const newObservationResult = await db.query(newObservationQuery, [newPlanet.planet_id]);
        const newObservation = newObservationResult.rows[0] || null;

        // Return both the new planet and its initial observation.
        res.status(201).json({ planet: newPlanet, observation: newObservation });

    } catch (err) {
        console.error("Error creating planet and observation:", err.message);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'A duplicate record was detected.', detail: err.detail });
        }
        res.status(500).json({ error: 'Failed to create planet and observation' });
    }
});

app.put('/api/stars/:id', isResearcher, async (req, res) => {
    try {
        const { id } = req.params;
        const { star_name, luminosity, spectral_type, distance_ly } = req.body;
        if (!validText(star_name) || !validText(spectral_type) || !validPositive(luminosity) || !validPositive(distance_ly)) return res.status(400).json({ message: 'All star fields are required for an update.' });
        const updateQuery = `UPDATE stars SET star_name = $1, luminosity = $2, spectral_type = $3, distance_ly = $4 WHERE star_id = $5 RETURNING *;`;
        const updatedStar = await db.query(updateQuery, [star_name, luminosity, spectral_type, distance_ly, id]);
        if (updatedStar.rows.length === 0) return res.status(404).json({ message: 'Star not found.' });
        res.status(200).json(updatedStar.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update star' });
    }
});

app.put('/api/planets/:id', isResearcher, async (req, res) => {
    try {
        const { id } = req.params;
        const { planet_name, planet_type, angular_separation_arcsec } = req.body;
        if (!validText(planet_name) || !validText(planet_type) || !validNonNegative(angular_separation_arcsec)) return res.status(400).json({ message: 'Planet name, type, and non-negative angular separation are required.' });
        const updatePlanetQuery = `UPDATE planets SET planet_name = $1, planet_type = $2, angular_separation_arcsec = $3 WHERE planet_id = $4 RETURNING *;`;
        const updatedPlanet = await db.query(updatePlanetQuery, [planet_name, planet_type, angular_separation_arcsec, id]);
        if (updatedPlanet.rows.length === 0) return res.status(404).json({ message: 'Planet not found.' });
        // Refresh the stored observation from the same angular-separation formula used by /calculate.
        const starResult = await db.query('SELECT s.distance_ly, s.luminosity FROM stars s JOIN planets p ON s.star_id=p.star_id WHERE p.planet_id=$1', [id]);
        const star = starResult.rows[0];
        if (star && validPositive(star.distance_ly) && validPositive(star.luminosity)) {
            const orbitalAu = Number(star.distance_ly) / 3.26156 * Number(angular_separation_arcsec);
            const hzInner = .99 * Math.sqrt(Number(star.luminosity));
            const hzOuter = 1.70 * Math.sqrt(Number(star.luminosity));
            const classification = orbitalAu < hzInner ? 'Too Hot' : orbitalAu > hzOuter ? 'Too Cold' : 'Inside HZ';
            await db.query(`INSERT INTO observations (planet_id, observation_date, orbital_distance_au, habitability_classification, user_id, angular_separation_as)
                VALUES ($1,CURRENT_DATE,$2,$3,$4,$5)
                ON CONFLICT (planet_id, observation_date) DO UPDATE SET orbital_distance_au=EXCLUDED.orbital_distance_au,
                habitability_classification=EXCLUDED.habitability_classification, angular_separation_as=EXCLUDED.angular_separation_as`,
                [id, orbitalAu, classification, req.user.userId, angular_separation_arcsec]);
        }
        res.status(200).json(updatedPlanet.rows[0]);
    } catch (err) {
        console.error(`Error updating planet ${req.params.id}:`, err.message);
        res.status(500).json({ error: 'Failed to update planet' });
    }
});

app.post('/api/planets/:id/calculate', isResearcher, async (req, res) => {
    try {
        const { id } = req.params;
        const researcherId = req.user.userId;
        const dataQuery = `SELECT p.angular_separation_arcsec, s.distance_ly, s.luminosity FROM planets p JOIN stars s ON p.star_id = s.star_id WHERE p.planet_id = $1;`;
        const dataResult = await db.query(dataQuery, [id]);
        if (dataResult.rows.length === 0) return res.status(404).json({ message: 'Planet or associated star not found.' });
        const data = dataResult.rows[0];
        if (!validNonNegative(data.angular_separation_arcsec) || !validPositive(data.distance_ly) || !validPositive(data.luminosity)) return res.status(400).json({ message: 'Missing data for calculation.' });

        const distance_parsecs = data.distance_ly / 3.26156;
        const orbital_distance_au = (distance_parsecs * data.angular_separation_arcsec);
        const sqrtLum = Math.sqrt(data.luminosity), HZ_INNER_BASE = 0.99, HZ_OUTER_BASE = 1.70;
        const inner_hz = HZ_INNER_BASE * sqrtLum, outer_hz = HZ_OUTER_BASE * sqrtLum;
        let habitability_classification = (orbital_distance_au >= inner_hz && orbital_distance_au <= outer_hz) ? 'Inside HZ' : (orbital_distance_au < inner_hz ? 'Too Hot' : 'Too Cold');

        // This query now safely inserts a new observation or updates today's existing one.
        const saveResultQuery = `
            INSERT INTO observations (planet_id, observation_date, orbital_distance_au, habitability_classification, user_id, angular_separation_as)
            VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)
            ON CONFLICT (planet_id, observation_date) DO UPDATE SET
                orbital_distance_au = EXCLUDED.orbital_distance_au,
                habitability_classification = EXCLUDED.habitability_classification,
                angular_separation_as = EXCLUDED.angular_separation_as
            RETURNING *;
        `;
        const savedResult = await db.query(saveResultQuery, [id, orbital_distance_au.toFixed(4), habitability_classification, researcherId, data.angular_separation_arcsec]);
        res.status(201).json(savedResult.rows[0]);
    } catch (err) {
        console.error("Error during habitability calculation:", err.message);
        res.status(500).json({ error: 'Failed to calculate habitability' });
    }
});

// Serve the existing frontend and assets from the same public URL as the API.
const frontendDir = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendDir, { index: false }));
app.get('/', (req, res) => res.sendFile(path.join(frontendDir, 'za.html')));

app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));
app.use((err, req, res, next) => {
    const status = err.status === 400 || err.status === 413 ? err.status : 500;
    res.status(status).json({ message: status === 400 ? 'Invalid JSON request.' : status === 413 ? 'Request is too large.' : 'Server error.' });
});

// --- Server Startup ---
if (require.main === module) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
        console.error('JWT_SECRET must be set to a strong value (at least 24 characters).');
        process.exit(1);
    }
    app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
}
module.exports = app;
