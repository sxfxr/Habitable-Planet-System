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
-- Keep observations consistent for inserts, planet edits, and star edits.
CREATE OR REPLACE FUNCTION refresh_planet_observation() RETURNS trigger AS $$
DECLARE star_record RECORD; orbit NUMERIC; classification TEXT;
BEGIN
    SELECT distance_ly, luminosity INTO star_record FROM stars WHERE star_id=NEW.star_id;
    IF star_record.distance_ly > 0 AND star_record.luminosity > 0 AND NEW.angular_separation_arcsec >= 0 THEN
        orbit := star_record.distance_ly / 3.26156 * NEW.angular_separation_arcsec;
        classification := CASE WHEN orbit < .99 * sqrt(star_record.luminosity) THEN 'Too Hot'
            WHEN orbit > 1.70 * sqrt(star_record.luminosity) THEN 'Too Cold' ELSE 'Inside HZ' END;
        INSERT INTO observations (planet_id, orbital_distance_au, habitability_classification, angular_separation_as)
        VALUES (NEW.planet_id, orbit, classification, NEW.angular_separation_arcsec)
        ON CONFLICT (planet_id, observation_date) DO UPDATE SET
            orbital_distance_au=EXCLUDED.orbital_distance_au,
            habitability_classification=EXCLUDED.habitability_classification,
            angular_separation_as=EXCLUDED.angular_separation_as;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS planet_observation_refresh ON planets;
CREATE TRIGGER planet_observation_refresh AFTER INSERT OR UPDATE OF angular_separation_arcsec, star_id
ON planets FOR EACH ROW EXECUTE FUNCTION refresh_planet_observation();

CREATE OR REPLACE FUNCTION refresh_star_observations() RETURNS trigger AS $$
BEGIN
    UPDATE planets SET angular_separation_arcsec=angular_separation_arcsec WHERE star_id=NEW.star_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS star_observation_refresh ON stars;
CREATE TRIGGER star_observation_refresh AFTER UPDATE OF distance_ly, luminosity
ON stars FOR EACH ROW EXECUTE FUNCTION refresh_star_observations();
CREATE INDEX IF NOT EXISTS planets_star_id_idx ON planets(star_id);
