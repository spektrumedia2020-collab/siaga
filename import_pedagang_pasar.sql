\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE import_sawah (
  row_no text,
  market_code text,
  market_name text,
  location text,
  legacy_code text,
  stall_code text,
  owner_name text,
  jastem text,
  daily_retribution text,
  status text
) ON COMMIT DROP;

CREATE TEMP TABLE import_panakkukang (LIKE import_sawah) ON COMMIT DROP;

CREATE TEMP TABLE import_terong (
  ignored_column text,
  row_no text,
  market_code text,
  market_name text,
  location text,
  legacy_code text,
  stall_code text,
  owner_name text,
  jastem text,
  daily_retribution text,
  status text
) ON COMMIT DROP;

\copy import_sawah FROM '/Users/sugenghariadi/Siaga/Pasar  Sawah.csv' WITH (FORMAT csv, HEADER false, NULL '')
\copy import_panakkukang FROM '/Users/sugenghariadi/Siaga/Pasar Panakkukang.csv' WITH (FORMAT csv, HEADER false, NULL '')
\copy import_terong FROM '/Users/sugenghariadi/Siaga/pasar Terong.csv' WITH (FORMAT csv, HEADER false, NULL '')

DO $$
DECLARE
  row_data record;
  market_id_value bigint;
  owner_id_value bigint;
  stall_id_value bigint;
  sector_id_value bigint;
  jastem_type_id bigint;
  daily_type_id bigint;
  sector_name_value text;
  jastem_amount numeric;
  daily_amount numeric;
  normalized_status text;
BEGIN
  FOR row_data IN
    SELECT
      NULL::text AS ignored_column, row_no, market_code, market_name, location,
      legacy_code, stall_code, owner_name, jastem, daily_retribution, status
    FROM import_sawah
    WHERE nullif(trim(stall_code), '') IS NOT NULL
      AND trim(market_code) ~ '^[A-Z]{3}$'
      AND trim(stall_code) !~* '^(KODE|BARU)$'
    UNION ALL
    SELECT
      NULL::text AS ignored_column, row_no, market_code, market_name, location,
      legacy_code, stall_code, owner_name, jastem, daily_retribution, status
    FROM import_panakkukang
    WHERE nullif(trim(stall_code), '') IS NOT NULL
      AND trim(market_code) ~ '^[A-Z]{3}$'
      AND trim(stall_code) !~* '^(KODE|BARU)$'
    UNION ALL
    SELECT
      ignored_column, row_no, market_code, market_name, location,
      legacy_code, stall_code, owner_name, jastem, daily_retribution, status
    FROM import_terong
    WHERE nullif(trim(stall_code), '') IS NOT NULL
      AND trim(market_code) ~ '^[A-Z]{3}$'
      AND trim(stall_code) !~* '^(KODE|BARU)$'
  LOOP
    SELECT id INTO market_id_value
    FROM public.markets
    WHERE code = trim(row_data.market_code)
       OR lower(name) = lower(trim(row_data.market_name))
    ORDER BY (code = trim(row_data.market_code)) DESC, id
    LIMIT 1;

    IF market_id_value IS NULL THEN
      RAISE EXCEPTION 'Pasar tidak ditemukan: % (%)', row_data.market_name, row_data.market_code;
    END IF;

    sector_name_value := COALESCE(
      NULLIF(trim(regexp_replace(row_data.location, '\s+No\.?\s*.*$', '')), ''),
      NULLIF(trim(row_data.location), ''),
      'Tanpa Blok'
    );

    SELECT id INTO sector_id_value
    FROM public.market_sectors
    WHERE market_id = market_id_value AND name = sector_name_value
    LIMIT 1;

    IF sector_id_value IS NULL THEN
      INSERT INTO public.market_sectors (market_id, name)
      VALUES (market_id_value, sector_name_value)
      RETURNING id INTO sector_id_value;
    END IF;

    SELECT id INTO owner_id_value
    FROM public.stall_owners
    WHERE name = COALESCE(NULLIF(trim(row_data.owner_name), ''), 'Belum diisi - ' || trim(row_data.stall_code))
    ORDER BY id
    LIMIT 1;

    IF owner_id_value IS NULL THEN
      INSERT INTO public.stall_owners (name)
      VALUES (COALESCE(NULLIF(trim(row_data.owner_name), ''), 'Belum diisi - ' || trim(row_data.stall_code)))
      RETURNING id INTO owner_id_value;
    END IF;

    normalized_status := CASE
      WHEN lower(trim(row_data.status)) IN ('aktif', 'active') THEN 'AKTIF'
      ELSE upper(NULLIF(trim(row_data.status), ''))
    END;

    SELECT id INTO stall_id_value
    FROM public.stalls
    WHERE market_id = market_id_value AND code = trim(row_data.stall_code)
    LIMIT 1;

    IF stall_id_value IS NULL THEN
      INSERT INTO public.stalls (market_id, sector_id, owner_id, code, number, qr_code, status)
      VALUES (
        market_id_value,
        sector_id_value,
        owner_id_value,
        trim(row_data.stall_code),
        COALESCE(NULLIF(trim(row_data.location), ''), trim(row_data.legacy_code)),
        trim(row_data.stall_code),
        COALESCE(normalized_status, 'AKTIF')
      )
      RETURNING id INTO stall_id_value;
    ELSE
      UPDATE public.stalls
      SET sector_id = sector_id_value,
          owner_id = owner_id_value,
          number = COALESCE(NULLIF(trim(row_data.location), ''), trim(row_data.legacy_code)),
          qr_code = trim(row_data.stall_code),
          status = COALESCE(normalized_status, 'AKTIF'),
          updated_at = now()
      WHERE id = stall_id_value;
    END IF;

    SELECT id INTO jastem_type_id
    FROM public.retribution_types
    WHERE market_id = market_id_value AND code = trim(row_data.market_code) || '-JASTEM'
    LIMIT 1;

    IF jastem_type_id IS NULL THEN
      INSERT INTO public.retribution_types (code, name, category, unit, amount, market_id)
      VALUES (trim(row_data.market_code) || '-JASTEM', 'Jastem', 'SEWA', 'TAHUN', 0, market_id_value)
      RETURNING id INTO jastem_type_id;
    END IF;

    SELECT id INTO daily_type_id
    FROM public.retribution_types
    WHERE market_id = market_id_value AND code = trim(row_data.market_code) || '-RETRIBUSI-HARIAN'
    LIMIT 1;

    IF daily_type_id IS NULL THEN
      INSERT INTO public.retribution_types (code, name, category, unit, amount, market_id)
      VALUES (trim(row_data.market_code) || '-RETRIBUSI-HARIAN', 'Retribusi Harian', 'RETRIBUSI', 'HARI', 0, market_id_value)
      RETURNING id INTO daily_type_id;
    END IF;

    jastem_amount := NULLIF(regexp_replace(row_data.jastem, '[^0-9]', '', 'g'), '')::numeric;
    daily_amount := NULLIF(regexp_replace(row_data.daily_retribution, '[^0-9]', '', 'g'), '')::numeric;

    IF jastem_amount IS NOT NULL THEN
      UPDATE public.retribution_rates
      SET amount = jastem_amount, updated_at = now()
      WHERE market_id = market_id_value AND stall_id = stall_id_value AND types_id = jastem_type_id;
      IF NOT FOUND THEN
        INSERT INTO public.retribution_rates (types_id, stall_id, market_id, amount)
        VALUES (jastem_type_id, stall_id_value, market_id_value, jastem_amount);
      END IF;
    END IF;

    IF daily_amount IS NOT NULL THEN
      UPDATE public.retribution_rates
      SET amount = daily_amount, updated_at = now()
      WHERE market_id = market_id_value AND stall_id = stall_id_value AND types_id = daily_type_id;
      IF NOT FOUND THEN
        INSERT INTO public.retribution_rates (types_id, stall_id, market_id, amount)
        VALUES (daily_type_id, stall_id_value, market_id_value, daily_amount);
      END IF;
    END IF;
  END LOOP;
END $$;

COMMIT;

SELECT m.id AS market_id, m.code, m.name,
       count(DISTINCT s.id) AS stalls,
       count(DISTINCT so.id) AS owners,
       count(DISTINCT rr.id) AS rates
FROM public.markets m
LEFT JOIN public.stalls s ON s.market_id = m.id
LEFT JOIN public.stall_owners so ON so.id = s.owner_id
LEFT JOIN public.retribution_rates rr ON rr.market_id = m.id
WHERE m.name IN ('Sawah', 'Panakkukang', 'Terong')
GROUP BY m.id, m.code, m.name
ORDER BY m.id;