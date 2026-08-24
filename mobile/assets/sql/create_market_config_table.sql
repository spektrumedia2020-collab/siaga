-- =====================================================================
-- SIAGA Mobile: Tabel Konfigurasi Pasar (untuk item audit 2.16)
-- =====================================================================
-- Tabel ini menggantikan hardcoded _targetStalls = 50 dan target hariannya
-- di dashboard_page.dart. Bisa di-extend untuk konfig urut-urutan lain.

create table if not exists market_config (
  id bigint primary key generated always as identity,
  market_id bigint not null references markets(id) on delete cascade,
  key   varchar(50) not null,          -- misal: 'daily_target_stalls', 'announcement_id', ...
  value text,                          -- nilai bebas (bisa angka, string, json)
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- constraint: satu key unik per market
  constraint market_config_unique_per_market unique (market_id, key)
);

-- RLS: semua role yang terdaftar bisa baca
alter table market_config enable row level security;
create policy "Authenticated users can read market_config"
  on market_config for select using (auth.uid() is not null);

-- Owner/Manager: bisa edit konfig pasar-mereka
-- NOTE: id_role adalah bigint (FK ke roles.id), jadi harus JOIN ke roles
create policy "Market officers can update their market config"
  on market_config for update using (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.id_role = r.id
      WHERE u.auth_uid = auth.uid()
        AND u.market_id = market_config.market_id
        AND r.name IN ('ADMIN', 'MARKET_HEAD', 'TREASURER')
    )
  );

-- Seed data: target harian lapak lunas = 50 (default)
insert into market_config (market_id, key, value)
  select id, 'daily_target_stalls', '50'
  from markets
  on conflict (market_id, key) do nothing;

-- =====================================================================
-- CARA PAKAI di dashboard_page.dart:
--   Ganti:  int _targetStalls = 50;
--   Dengan: int _targetStalls = 50; // default, override setelah fetch
--   Fetch:
--     final res = await supabase
--         .from('market_config')
--         .select('value')
--         .eq('market_id', marketId)
--         .eq('key', 'daily_target_stalls')
--         .maybeSingle();
-- =====================================================================