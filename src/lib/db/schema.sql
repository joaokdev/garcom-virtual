-- ============================================================================
-- COMANDA — Schema PostgreSQL
-- Fonte única de verdade do schema. Aplicado por scripts/ensure-db.mjs
-- (também usado por scripts/seed.mjs e pelos comandos "npm run db:*").
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id                  TEXT PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  tagline             TEXT,
  logo_emoji          TEXT NOT NULL DEFAULT '🍽️',
  logo_icon           TEXT,
  primary_color       TEXT NOT NULL DEFAULT '#E8A33D',
  accent_color        TEXT NOT NULL DEFAULT '#1F4D4A',
  default_locale      TEXT NOT NULL DEFAULT 'pt-BR',
  service_fee_pct     DOUBLE PRECISION NOT NULL DEFAULT 0,
  -- PINs operacionais SEMPRE em hash (PBKDF2-SHA512 + salt, ver src/lib/password.ts).
  -- Nunca armazenar o PIN em texto plano.
  kitchen_pin_hash    TEXT NOT NULL,
  financial_pin_hash  TEXT NOT NULL,
  admin_pin_hash      TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  qr_token      TEXT NOT NULL UNIQUE,
  capacity      INTEGER NOT NULL DEFAULT 4,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON restaurant_tables(restaurant_id);

CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name_i18n     JSONB NOT NULL,
  icon          TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON categories(restaurant_id, position);

CREATE TABLE IF NOT EXISTS menu_items (
  id                    TEXT PRIMARY KEY,
  restaurant_id         TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id           TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name_i18n             JSONB NOT NULL,
  description_i18n      JSONB NOT NULL,
  price_cents           INTEGER NOT NULL,
  image_url             TEXT,
  is_available          BOOLEAN NOT NULL DEFAULT true,
  is_chef_recommendation BOOLEAN NOT NULL DEFAULT false,
  prep_time_minutes     INTEGER NOT NULL DEFAULT 15,
  tags_json             JSONB NOT NULL DEFAULT '[]'::jsonb,
  position              INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON menu_items(category_id, position);

CREATE TABLE IF NOT EXISTS item_option_groups (
  id            TEXT PRIMARY KEY,
  menu_item_id  TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name_i18n     JSONB NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('single', 'multiple')),
  is_required   BOOLEAN NOT NULL DEFAULT false,
  min_select    INTEGER NOT NULL DEFAULT 0,
  max_select    INTEGER NOT NULL DEFAULT 1,
  position      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_option_groups_item ON item_option_groups(menu_item_id, position);

CREATE TABLE IF NOT EXISTS item_option_choices (
  id                TEXT PRIMARY KEY,
  option_group_id   TEXT NOT NULL REFERENCES item_option_groups(id) ON DELETE CASCADE,
  name_i18n         JSONB NOT NULL,
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  position          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_option_choices_group ON item_option_choices(option_group_id, position);

CREATE TABLE IF NOT EXISTS item_recommendations (
  menu_item_id        TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  recommended_item_id TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, recommended_item_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id      TEXT NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  ticket_number INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'received'
                CHECK (status IN ('received','preparing','ready','delivered','cancelled')),
  notes         TEXT,
  subtotal_cents INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_device ON orders(device_id);

CREATE TABLE IF NOT EXISTS order_items (
  id                TEXT PRIMARY KEY,
  order_id          TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id      TEXT NOT NULL REFERENCES menu_items(id),
  name_snapshot     TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1,
  unit_price_cents  INTEGER NOT NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_item_choices (
  id                TEXT PRIMARY KEY,
  order_item_id     TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  name_snapshot     TEXT NOT NULL,
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_item_choices_item ON order_item_choices(order_item_id);

CREATE TABLE IF NOT EXISTS waiter_calls (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id      TEXT NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  reason        TEXT NOT NULL DEFAULT 'assistance',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','acknowledged','resolved')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_restaurant ON waiter_calls(restaurant_id, status);

CREATE TABLE IF NOT EXISTS bill_requests (
  id                  TEXT PRIMARY KEY,
  restaurant_id       TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id            TEXT NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
  device_id           TEXT NOT NULL,
  payment_preference  TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','closed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bill_requests_restaurant ON bill_requests(restaurant_id, status);

CREATE TABLE IF NOT EXISTS feedback (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id      TEXT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
  order_id      TEXT REFERENCES orders(id) ON DELETE SET NULL,
  device_id     TEXT NOT NULL,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_restaurant ON feedback(restaurant_id, created_at);

-- ----------------------------------------------------------------------------
-- Sessões (PIN operacional e login de usuário) — token hasheado (SHA-256).
-- O valor enviado ao navegador (cookie) NUNCA é o mesmo valor guardado aqui;
-- guardamos apenas o hash, para que um vazamento do banco não vire sessões
-- válidas diretamente utilizáveis.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash    TEXT PRIMARY KEY,
  -- Nulo para sessões de superadmin (não pertencem a um restaurante específico).
  restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
  -- 'kitchen' | 'financial' | 'waiter' | 'admin' (sessão por PIN)
  -- 'user:<id>' (sessão de usuário com login/senha — ver src/lib/user-auth.ts)
  type          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions ON auth_sessions(restaurant_id, type);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('superadmin','manager','waiter')),
  restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Substitui o antigo "COLLATE NOCASE" do SQLite: índice único case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));
CREATE INDEX IF NOT EXISTS idx_users_restaurant ON users(restaurant_id, role);

-- ----------------------------------------------------------------------------
-- Controle de força bruta — login por PIN e login de usuário.
-- Uma linha por "identidade" que está tentando autenticar (ex.: PIN da
-- cozinha de um restaurante, ou um username específico). Após N tentativas
-- inválidas em sequência, a identidade fica bloqueada por um tempo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_attempts (
  identity_key  TEXT PRIMARY KEY,
  attempts      INTEGER NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Limitação de taxa (rate limiting) das rotas públicas sem login (Cliente):
-- criar pedido, chamar garçom, pedir conta, enviar feedback. Um tablet de
-- mesa comprometido ou com defeito não pode inundar a cozinha/garçom de
-- requisições — cada "bucket" é uma janela fixa de tempo por dispositivo+rota.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key    TEXT PRIMARY KEY,
  count         INTEGER NOT NULL DEFAULT 0,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Comissão de garçom.
-- Cada garçom tem um percentual próprio (definido pelo gerente). O garçom
-- "assume" uma mesa manualmente no próprio app; pedidos criados enquanto a
-- mesa está assumida herdam o waiter_id, o que permite calcular a comissão
-- (subtotal_cents * commission_pct) por garçom, por dia ou por período.
-- ----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_pct DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE restaurant_tables
  ADD COLUMN IF NOT EXISTS assumed_by_waiter_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tables_assumed_waiter ON restaurant_tables(assumed_by_waiter_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_waiter ON orders(waiter_id, created_at);

-- ----------------------------------------------------------------------------
-- Contador atômico do número da comanda (por restaurante, por dia).
-- Antes o ticket_number era calculado com "COUNT(*) + 1" dentro da própria
-- transação de criação do pedido. Sob READ COMMITTED (isolamento padrão do
-- Postgres) duas comandas abertas ao mesmo tempo podiam ler a mesma contagem
-- e nascer com o MESMO número. Esta tabela + UPSERT com ON CONFLICT resolve
-- isso de forma atômica: a linha do dia fica travada entre o SELECT e o
-- UPDATE, então requisições concorrentes são serializadas pelo próprio banco.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_ticket_counters (
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  ticket_date   DATE NOT NULL,
  counter       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (restaurant_id, ticket_date)
);
