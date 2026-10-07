-- Habitable Planet System
-- PostgreSQL database schema

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('researcher', 'viewer'))
);

CREATE TABLE IF NOT EXISTS stars (
    star_id SERIAL PRIMARY KEY,
    star_name VARCHAR(150) NOT NULL,
    distance_ly NUMERIC NOT NULL,
    spectral_type VARCHAR(50),
    luminosity NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS planets (
    planet_id SERIAL PRIMARY KEY,
    star_id INTEGER NOT NULL
        REFERENCES stars(star_id) ON DELETE CASCADE,
    planet_name VARCHAR(150) NOT NULL,
    planet_type VARCHAR(100) NOT NULL,
    angular_separation_arcsec NUMERIC,
    UNIQUE (star_id, planet_name)
);

CREATE TABLE IF NOT EXISTS observations (
    observation_id SERIAL PRIMARY KEY,
    planet_id INTEGER NOT NULL
        REFERENCES planets(planet_id) ON DELETE CASCADE,
    observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    orbital_distance_au NUMERIC,
    habitability_classification VARCHAR(50),
    user_id INTEGER
        REFERENCES users(user_id) ON DELETE SET NULL,
    angular_separation_as NUMERIC,
    UNIQUE (planet_id, observation_date)
);