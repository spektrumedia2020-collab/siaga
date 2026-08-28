\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE niaga_daya_csv (
  no_lama text,
  kode_lama text,
  lokasi text,
  kode text,
  nama_pedagang text,
  sewa_tahunan text,
  sewa_harian text
) ON COMMIT DROP;

\copy niaga_daya_csv FROM '/Users/sugenghariadi/Siaga/NIAGA DAYA - NIAGA DAYA.csv' WITH (FORMAT csv, HEADER true, NULL '');

DO $$
DECLARE
  v_market_id bigint;
  v_annual_type_id bigint;
  v_daily_type_id bigint;
  row_data record;
  v_owner_id bigint;
  v_stall_id bigint;
  v_sector_id bigint;
  owner_name text;
  sector_name text;
  stall_number text;
  v_current_sector_name text;
  annual_amount numeric;
  daily_amount numeric;
BEGIN
  SELECT id INTO v_market_id
  FROM public.markets
  WHERE code = 'NGD' OR lower(name) = lower('Niaga Daya')
  ORDER BY (code = 'NGD') DESC, id
  LIMIT 1;

  IF v_market_id IS NULL THEN
    INSERT INTO public.markets (code, name, city, status)
    VALUES ('NGD', 'Niaga Daya', 'Makassar', 'AKTIF')
    RETURNING id INTO v_market_id;
  ELSE
    UPDATE public.markets
    SET code = COALESCE(code, 'NGD'), name = 'Niaga Daya', status = COALESCE(status, 'AKTIF'), updated_at = now()
    WHERE id = v_market_id;
  END IF;

  SELECT id INTO v_annual_type_id
  FROM public.retribution_types
  WHERE code = 'NGD-SEWA-TAHUNAN' AND public.retribution_types.market_id = v_market_id
  LIMIT 1;

  IF v_annual_type_id IS NULL THEN
    INSERT INTO public.retribution_types (code, name, category, unit, market_id, amount)
    VALUES ('NGD-SEWA-TAHUNAN', 'Sewa Tempat Tahunan', 'SEWA', 'TAHUN', v_market_id, 0)
    RETURNING id INTO v_annual_type_id;
  END IF;

  SELECT id INTO v_daily_type_id
  FROM public.retribution_types
  WHERE code = 'NGD-SEWA-HARIAN' AND public.retribution_types.market_id = v_market_id
  LIMIT 1;

  IF v_daily_type_id IS NULL THEN
    INSERT INTO public.retribution_types (code, name, category, unit, market_id, amount)
    VALUES ('NGD-SEWA-HARIAN', 'Sewa Tempat Harian', 'SEWA', 'HARI', v_market_id, 0)
    RETURNING id INTO v_daily_type_id;
  END IF;

  FOR row_data IN SELECT * FROM niaga_daya_csv WHERE nullif(trim(kode), '') IS NOT NULL LOOP
    owner_name := COALESCE(NULLIF(trim(row_data.nama_pedagang), ''), 'Belum diisi - ' || trim(row_data.kode));
    IF trim(row_data.lokasi) ~* '^Blok\s+' THEN
      v_current_sector_name := trim(regexp_replace(row_data.lokasi, '\s+No\.?\s*.*$', ''));
    ELSIF trim(row_data.kode_lama) ~ '^NDY\.K\.[A-Z]' THEN
      v_current_sector_name := 'Kios ' || substring(trim(row_data.kode_lama) from '^NDY\.K\.([A-Z])');
    ELSIF trim(row_data.kode_lama) ~ '^NDY\.R\.[IV]+[AB]' THEN
      v_current_sector_name := 'Ruko ' || substring(trim(row_data.kode_lama) from '^NDY\.R\.([IV]+[AB])');
    END IF;

    sector_name := COALESCE(v_current_sector_name, 'Tanpa Blok');
    stall_number := COALESCE(
      NULLIF(trim(regexp_replace(row_data.lokasi, '^.*?(No\.?\s*.*)$', '\1')), ''),
      NULLIF('No. ' || trim(row_data.lokasi), 'No. '),
      'No. ' || trim(row_data.no_lama)
    );
    annual_amount := NULLIF(regexp_replace(row_data.sewa_tahunan, '[^0-9]', '', 'g'), '')::numeric;
    daily_amount := NULLIF(regexp_replace(row_data.sewa_harian, '[^0-9]', '', 'g'), '')::numeric;

    SELECT id INTO v_sector_id
    FROM public.market_sectors
    WHERE public.market_sectors.market_id = v_market_id
      AND public.market_sectors.name = sector_name
    LIMIT 1;

    IF v_sector_id IS NULL THEN
      INSERT INTO public.market_sectors (market_id, name)
      VALUES (v_market_id, sector_name)
      RETURNING id INTO v_sector_id;
    END IF;

    SELECT id INTO v_owner_id
    FROM public.stall_owners
    WHERE name = owner_name
    ORDER BY id
    LIMIT 1;

    IF v_owner_id IS NULL THEN
      INSERT INTO public.stall_owners (name)
      VALUES (owner_name)
      RETURNING id INTO v_owner_id;
    END IF;

    SELECT id INTO v_stall_id
    FROM public.stalls
    WHERE public.stalls.market_id = v_market_id AND public.stalls.code = trim(row_data.kode)
    LIMIT 1;

    IF v_stall_id IS NULL THEN
      INSERT INTO public.stalls (market_id, sector_id, owner_id, code, number, qr_code, status)
      VALUES (v_market_id, v_sector_id, v_owner_id, trim(row_data.kode), stall_number, trim(row_data.kode), 'AKTIF')
      RETURNING id INTO v_stall_id;
    ELSE
      UPDATE public.stalls
      SET sector_id = v_sector_id, owner_id = v_owner_id, number = stall_number, qr_code = trim(row_data.kode), status = 'AKTIF', updated_at = now()
      WHERE id = v_stall_id;
    END IF;

    IF annual_amount IS NOT NULL THEN
      UPDATE public.retribution_rates
      SET amount = annual_amount, updated_at = now()
      WHERE retribution_rates.stall_id = v_stall_id AND retribution_rates.market_id = v_market_id AND retribution_rates.types_id = v_annual_type_id;
      IF NOT FOUND THEN
        INSERT INTO public.retribution_rates (amount, stall_id, market_id, types_id)
        VALUES (annual_amount, v_stall_id, v_market_id, v_annual_type_id);
      END IF;
    END IF;

    IF daily_amount IS NOT NULL THEN
      UPDATE public.retribution_rates
      SET amount = daily_amount, updated_at = now()
      WHERE retribution_rates.stall_id = v_stall_id AND retribution_rates.market_id = v_market_id AND retribution_rates.types_id = v_daily_type_id;
      IF NOT FOUND THEN
        INSERT INTO public.retribution_rates (amount, stall_id, market_id, types_id)
        VALUES (daily_amount, v_stall_id, v_market_id, v_daily_type_id);
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Seed selesai untuk market_id=%', v_market_id;

  DELETE FROM public.market_sectors existing_sector
  WHERE existing_sector.market_id = v_market_id
    AND NOT EXISTS (
      SELECT 1 FROM public.stalls existing_stall
      WHERE existing_stall.market_id = v_market_id
        AND existing_stall.sector_id = existing_sector.id
    );
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
WHERE m.name = 'Niaga Daya'
GROUP BY m.id, m.code, m.name;
