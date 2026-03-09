CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'owner' CHECK (role IN ('admin', 'manager', 'owner')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS horses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stable_id UUID REFERENCES stables(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    birth_date DATE,
    microchip TEXT UNIQUE,
    breed TEXT,
    gender TEXT CHECK (gender IN ('stallion', 'mare', 'gelding')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    color_hex TEXT DEFAULT '#000000',
    description TEXT
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    type_id UUID NOT NULL REFERENCES event_types(id),
    scheduled_date DATE NOT NULL,
    completion_date DATE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function for autogically set "updated_at" column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_modtime BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

INSERT INTO event_types (name, color_hex, description) VALUES
('Ferratura', '#3E2723', 'Servizio di pareggio e ferratura degli zoccoli'),
('Vaccino', '#1976D2', 'Somministrazione di vaccini (es. Influenza, Tetano)'),
('Sverminamento', '#388E3C', 'Trattamento contro i parassiti interni'),
('Dentista', '#FBC02D', 'Controllo e limatura dei denti'),
('Visita Veterinaria', '#D32F2F', 'Controllo generale o visita specifica');

-- BEGIN TEST
-- TODO: Just for test, remove in production :)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END
$$;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
-- END TEST