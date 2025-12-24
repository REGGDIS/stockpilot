BEGIN;

-- 1) Extensión para UUID (para movement_uuid)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Mejoras a products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3) Mejoras a locations
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Nota: products ya tiene created_at/updated_at según tu \d, así que no lo tocamos.

-- 4) Crear enum movement_type (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE movement_type AS ENUM ('IN','OUT','MOVE','ADJUST','COUNT');
  END IF;
END$$;

-- 5) Convertir stock_movements.movement_type de text -> movement_type (ENUM)
--    (esto fallará si existen valores distintos a los 5 del enum)
ALTER TABLE stock_movements
  ALTER COLUMN movement_type TYPE movement_type
  USING movement_type::movement_type;

-- 6) Agregar campos nuevos a stock_movements
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS movement_uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS reference TEXT;

-- 7) Índice único para idempotencia/sync
CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_movements_uuid
  ON stock_movements(movement_uuid);

-- 8) Tabla de balances (stock rápido)
CREATE TABLE IF NOT EXISTS stock_balances (
  product_id   BIGINT NOT NULL REFERENCES products(id),
  location_id  BIGINT NOT NULL REFERENCES locations(id),
  quantity     NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (product_id, location_id)
);

-- 9) updated_at automático (trigger)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_locations_updated_at ON locations;
CREATE TRIGGER trg_locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10) Evitar stock negativo (guard)
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS trigger AS $$
DECLARE
  q NUMERIC(12,2);
BEGIN
  IF NEW.movement_type IN ('OUT','MOVE') THEN
    SELECT quantity INTO q
    FROM stock_balances
    WHERE product_id = NEW.product_id
      AND location_id = NEW.from_location_id;

    IF q IS NULL THEN q := 0; END IF;

    IF q - NEW.quantity < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente: product_id=% from_location_id=% disponible=% requerido=%',
        NEW.product_id, NEW.from_location_id, q, NEW.quantity;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock ON stock_movements;
CREATE TRIGGER trg_prevent_negative_stock
BEFORE INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION prevent_negative_stock();

-- 11) Aplicar movimientos a balances (trigger)
CREATE OR REPLACE FUNCTION apply_stock_movement()
RETURNS trigger AS $$
BEGIN
  IF NEW.movement_type = 'IN' THEN
    IF NEW.to_location_id IS NULL THEN
      RAISE EXCEPTION 'IN requiere to_location_id';
    END IF;

    INSERT INTO stock_balances(product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.to_location_id, NEW.quantity)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET quantity = stock_balances.quantity + EXCLUDED.quantity,
                  updated_at = now();

  ELSIF NEW.movement_type = 'OUT' THEN
    IF NEW.from_location_id IS NULL THEN
      RAISE EXCEPTION 'OUT requiere from_location_id';
    END IF;

    INSERT INTO stock_balances(product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.from_location_id, 0)
    ON CONFLICT (product_id, location_id) DO NOTHING;

    UPDATE stock_balances
      SET quantity = quantity - NEW.quantity,
          updated_at = now()
    WHERE product_id = NEW.product_id
      AND location_id = NEW.from_location_id;

  ELSIF NEW.movement_type = 'MOVE' THEN
    IF NEW.from_location_id IS NULL OR NEW.to_location_id IS NULL THEN
      RAISE EXCEPTION 'MOVE requiere from_location_id y to_location_id';
    END IF;

    INSERT INTO stock_balances(product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.from_location_id, 0)
    ON CONFLICT (product_id, location_id) DO NOTHING;

    UPDATE stock_balances
      SET quantity = quantity - NEW.quantity,
          updated_at = now()
    WHERE product_id = NEW.product_id
      AND location_id = NEW.from_location_id;

    INSERT INTO stock_balances(product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.to_location_id, NEW.quantity)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET quantity = stock_balances.quantity + EXCLUDED.quantity,
                  updated_at = now();

  ELSIF NEW.movement_type = 'ADJUST' THEN
    IF NEW.to_location_id IS NULL THEN
      RAISE EXCEPTION 'ADJUST requiere to_location_id';
    END IF;

    INSERT INTO stock_balances(product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.to_location_id, NEW.quantity)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET quantity = stock_balances.quantity + EXCLUDED.quantity,
                  updated_at = now();

  ELSIF NEW.movement_type = 'COUNT' THEN
    IF NEW.to_location_id IS NULL THEN
      RAISE EXCEPTION 'COUNT requiere to_location_id';
    END IF;

    INSERT INTO stock_balances(product_id, location_id, quantity)
    VALUES (NEW.product_id, NEW.to_location_id, NEW.quantity)
    ON CONFLICT (product_id, location_id)
    DO UPDATE SET quantity = EXCLUDED.quantity,
                  updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON stock_movements;
CREATE TRIGGER trg_apply_stock_movement
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION apply_stock_movement();

COMMIT;
