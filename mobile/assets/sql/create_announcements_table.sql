-- =====================================================================
-- SIAGA Mobile: Tabel Pengumuman (untuk item audit 2.17)
-- =====================================================================
-- Tabel ini menggantikan pengumuman hardcoded di _buildAnnouncementCard()
-- dashboard_page.dart. Didukung multiple pengumuman, filter per market,
-- dan periode aktif (start_date / end_date).

create table if not exists announcements (
  id bigint primary key generated always as identity,
  market_id bigint references markets(id) on delete cascade,  -- NULL = global/semua pasar
  title   varchar(150) not null,
  content text,
  priority integer default 0,             -- 0 = terendah; angka lebih tinggi = lebih penting
  is_active boolean default true,
  start_date timestamp with time zone default now(),
  end_date   timestamp with time zone,
  created_by integer references users(id_user),  -- PK users = id_user (integer), lihat add_officer_id_to_sectors.sql
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index untuk performa: cari pengumuman aktif berdasarkan market + hari ini
create index if not exists idx_announcements_active
  on announcements (market_id, is_active, start_date, end_date);

-- RLS: semua role terdaftar bisa baca pengumuman
alter table announcements enable row level security;
create policy "Authenticated users can read announcements"
  on announcements for select using (auth.uid() is not null);

-- Market officer/marketer dapat membuat/edot Pengumuman market-mereka
-- NOTE: id_role adalah bigint (FK ke roles.id), jadi harus JOIN ke roles
create policy "Market officers can manage their announcements"
  on announcements for all using (
    market_id IS NULL
    OR EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.id_role = r.id
      WHERE u.auth_uid = auth.uid()
        AND u.market_id = announcements.market_id
        AND r.name IN ('ADMIN', 'MARKET_HEAD', 'TREASURER')
    )
  );

-- =====================================================================
-- CARA PAKAI di dashboard_page.dart:
--   Ganti _buildAnnouncementCard():
--     - Hapus Text('Target retribusi hari ini: 50 transaksi') hardcoded
--     - Ganti jadi: fetch dari announcements
--       final now = DateTime.now().toUtc();
--       final res = await supabase
--           .from('announcements')
--           .select('*')
--           .eq('market_id', marketId)
--           .eq('is_active', true)
--           .lte('start_date', now.toIso8601String())
--           .or('end_date.is.null,end_date.gte.' + now.toIso8601String())
--           .order('priority', ascending: false)
--           .limit(3);
-- =====================================================================