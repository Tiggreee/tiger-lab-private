-- Base de datos para almacenar datos reales generados por el sistema autonomo
-- No interfiere con el runtime actual
-- Puedes correrlo en PostgreSQL sin afectar nada

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT,
  type TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  type TEXT,
  body TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE funnels (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  steps JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pricing (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  base_price NUMERIC,
  adjustments JSONB,
  final_price NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE automations (
  id SERIAL PRIMARY KEY,
  type TEXT,
  trigger TEXT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bots (
  id SERIAL PRIMARY KEY,
  type TEXT,
  trigger TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  type TEXT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE metrics (
  id SERIAL PRIMARY KEY,
  name TEXT,
  value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tablas de simulacion
CREATE TABLE stress_runs (
  id SERIAL PRIMARY KEY,
  type TEXT,
  input JSONB,
  output JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE traffic_runs (
  id SERIAL PRIMARY KEY,
  volume INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pricing_runs (
  id SERIAL PRIMARY KEY,
  ruleset JSONB,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tablas de aprendizaje
CREATE TABLE sql_exercises (
  id SERIAL PRIMARY KEY,
  title TEXT,
  query TEXT,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE datasets (
  id SERIAL PRIMARY KEY,
  name TEXT,
  description TEXT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
