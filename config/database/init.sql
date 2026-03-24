CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOINHERIT;
  END IF;
END
$$;

-- FUNCTIONS
CREATE OR REPLACE FUNCTION auth_uid() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION url_encode(data bytea) RETURNS text LANGUAGE sql AS $$
    SELECT translate(replace(encode(data, 'base64'), E'\n', ''), '+/=', '-_');
$$;

CREATE OR REPLACE FUNCTION sign(payload json, secret text, algorithm text DEFAULT 'HS256')
RETURNS text LANGUAGE sql AS $$
WITH
  header AS (SELECT json_build_object('typ', 'JWT', 'alg', algorithm) AS j),
  encoded_header AS (SELECT url_encode(convert_to(j::text, 'utf8')) AS h FROM header),
  encoded_payload AS (SELECT url_encode(convert_to(payload::text, 'utf8')) AS p),
  unsigned_token AS (SELECT h || '.' || p AS t FROM encoded_header, encoded_payload),
  signature AS (SELECT url_encode(hmac(t::bytea, secret::bytea, 'sha256')) AS s FROM unsigned_token)
SELECT t || '.' || s FROM unsigned_token, signature;
$$;

-- PRIVATE TABLE users
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL CHECK (email ~* '^.+@.+\..+$'),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'authenticated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PUBLIC TABLES
CREATE TABLE IF NOT EXISTS stables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    owner_id UUID DEFAULT auth_uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS horses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stable_id UUID REFERENCES stables(id) ON DELETE SET NULL,
    owner_id UUID DEFAULT auth_uid() REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_events_modtime ON events;
CREATE TRIGGER update_events_modtime BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- AUTH
DROP TYPE IF EXISTS jwt_token CASCADE;
CREATE TYPE jwt_token AS (
  token text
);

CREATE OR REPLACE FUNCTION login(email text, password text) RETURNS jwt_token AS $$
DECLARE
  _user auth.users;
  _token text;
  _secret text;
  result jwt_token;
BEGIN
  SELECT * INTO _user FROM auth.users WHERE auth.users.email = login.email;

  IF _user.id IS NULL OR crypt(login.password, _user.password_hash) <> _user.password_hash THEN
    RAISE EXCEPTION 'Credenziali non valide';
  END IF;

  _secret := current_setting('auth.token', true);

  IF _secret IS NULL OR _secret = '' THEN
    RAISE EXCEPTION 'Errore di configurazione del server: auth.token mancante.';
  END IF;

  SELECT sign(
      json_build_object(
        'role', _user.role,
        'user_id', _user.id,
        'email', _user.email,
        'exp', extract(epoch from now())::integer + 60*60*24*365
      ), 
      _secret
  ) INTO _token;

  result.token := _token;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION signup(email text, password text) RETURNS jwt_token AS $$
DECLARE
  _user auth.users;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = signup.email) THEN
    RAISE EXCEPTION 'Email già in uso';
  END IF;

  INSERT INTO auth.users (email, password_hash, role)
  VALUES (signup.email, crypt(signup.password, gen_salt('bf')), 'authenticated')
  RETURNING * INTO _user;

  RETURN login(signup.email, signup.password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own horses" ON horses FOR SELECT TO authenticated USING (owner_id = auth_uid());
CREATE POLICY "Users can insert own horses" ON horses FOR INSERT TO authenticated WITH CHECK (owner_id = auth_uid());
CREATE POLICY "Users can update own horses" ON horses FOR UPDATE TO authenticated USING (owner_id = auth_uid());
CREATE POLICY "Users can delete own horses" ON horses FOR DELETE TO authenticated USING (owner_id = auth_uid());

CREATE POLICY "Users can view own events" ON events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM horses WHERE horses.id = events.horse_id AND horses.owner_id = auth_uid()));
CREATE POLICY "Users can manage own events" ON events FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM horses WHERE horses.id = events.horse_id AND horses.owner_id = auth_uid()));

-- PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION signup(text, text) TO anon, authenticated;

-- DATA
INSERT INTO event_types (name, color_hex, description) VALUES
('Ferratura', '#3E2723', 'Servizio di pareggio e ferratura degli zoccoli'),
('Vaccino', '#1976D2', 'Somministrazione di vaccini (es. Influenza, Tetano)'),
('Sverminamento', '#388E3C', 'Trattamento contro i parassiti interni'),
('Dentista', '#FBC02D', 'Controllo e limatura dei denti'),
('Visita Veterinaria', '#D32F2F', 'Controllo generale o visita specifica')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view event types" ON event_types FOR SELECT TO anon, authenticated USING (true);
