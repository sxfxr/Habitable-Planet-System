// --- Imports ---
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

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
        res.status(400).json({ message: 'Invalid token.' });
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
        res.status(500).send('Server Error');
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
        const result = await db.query('SELECT * FROM Users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' });
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials.' });
        const token = jwt.sign({ userId: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error("Error logging in:", err.message);
        res.status(500).send('Server Error');
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
        if (!star_name || luminosity === undefined || !distance_ly) return res.status(400).json({ message: 'Star name, luminosity, and distance are required.' });
        const newStarQuery = `INSERT INTO stars (star_name, distance_ly, spectral_type, luminosity) VALUES ($1, $2, $3, $4) RETURNING *;`;
        const newStar = await db.query(newStarQuery, [star_name, distance_ly, spectral_type, luminosity]);
        res.status(201).json(newStar.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create star' });
    }
});

app.post('/api/planets', isResearcher, async (req, res) => {
    try {
        const { star_id, planet_name, planet_type, orbital_distance_au } = req.body;
        if (!star_id || !planet_name || !planet_type || orbital_distance_au === undefined) {
            return res.status(400).json({ message: 'Star ID, planet name, type, and orbital distance are required.' });
        }

        // CORRECTED: The value from the form (orbital_distance_au) is now correctly passed
        // into the 'angular_separation_arcsec' column for the trigger's calculation.
        const newPlanetQuery = `
            INSERT INTO planets (star_id, planet_name, planet_type, angular_separation_arcsec)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (star_id, planet_name) DO NOTHING
            RETURNING *;
        `;
        const newPlanetResult = await db.query(newPlanetQuery, [star_id, planet_name, planet_type, orbital_distance_au]);

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
        if (!star_name || luminosity === undefined || !spectral_type || distance_ly === undefined) return res.status(400).json({ message: 'All star fields are required for an update.' });
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
        const { planet_name, planet_type, orbital_distance_au } = req.body;
        if (!planet_name || !planet_type || orbital_distance_au === undefined) return res.status(400).json({ message: 'Planet name, type, and orbital distance are required.' });
        const updatePlanetQuery = `UPDATE planets SET planet_name = $1, planet_type = $2 WHERE planet_id = $3 RETURNING *;`;
        const updatedPlanet = await db.query(updatePlanetQuery, [planet_name, planet_type, id]);
        if (updatedPlanet.rows.length === 0) return res.status(404).json({ message: 'Planet not found.' });
        const starDataQuery = `SELECT s.luminosity FROM stars s JOIN planets p ON s.star_id = p.star_id WHERE p.planet_id = $1`;
        const starResult = await db.query(starDataQuery, [id]);
        const luminosity = starResult.rows[0].luminosity;
        const sqrtLum = Math.sqrt(luminosity), HZ_INNER_BASE = 0.99, HZ_OUTER_BASE = 1.70;
        const inner_hz = HZ_INNER_BASE * sqrtLum, outer_hz = HZ_OUTER_BASE * sqrtLum;
        let habitability_classification = (orbital_distance_au >= inner_hz && orbital_distance_au <= outer_hz) ? 'Inside HZ' : (orbital_distance_au < inner_hz ? 'Too Hot' : 'Too Cold');

        const latestObservationQuery = `SELECT observation_id FROM observations WHERE planet_id = $1 ORDER BY observation_date DESC, observation_id DESC LIMIT 1;`;
        const latestObservationResult = await db.query(latestObservationQuery, [id]);

        if (latestObservationResult.rows.length > 0) {
            const latestObservationId = latestObservationResult.rows[0].observation_id;
            const updateObservationQuery = `UPDATE observations SET orbital_distance_au = $1, habitability_classification = $2, observation_date = CURRENT_DATE WHERE observation_id = $3;`;
            await db.query(updateObservationQuery, [orbital_distance_au, habitability_classification, latestObservationId]);
        } else {
            const saveObservationQuery = `INSERT INTO observations (planet_id, observation_date, orbital_distance_au, habitability_classification, user_id) VALUES ($1, CURRENT_DATE, $2, $3, $4);`;
            await db.query(saveObservationQuery, [id, orbital_distance_au, habitability_classification, req.user.userId]);
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
        if (data.angular_separation_arcsec === null || data.distance_ly === null || data.luminosity === null) return res.status(400).json({ message: 'Missing data for calculation.' });
        
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

// --- Server Startup ---
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});