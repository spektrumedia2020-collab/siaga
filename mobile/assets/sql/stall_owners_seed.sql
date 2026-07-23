-- Create 60 stall owners with explicit IDs matching stall FKs

-- Owner ID 2
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(2, '131241241241', 'Anton', 'Jalan Mawar no.1', '0812323122', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 3
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(3, '131241241242', 'Budi', 'Jalan Melati no.2', '0812323123', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 4
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(4, '131241241243', 'Citra', 'Jalan Anggrek no.3', '0812323124', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 5
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(5, '131241241244', 'Dewi', 'Jalan Kenanga no.4', '0812323125', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 6
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(6, '131241241245', 'Eko', 'Jalan Cempaka no.5', '0812323126', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 7
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(7, '131241241246', 'Fajar', 'Jalan Dahlia no.6', '0812323127', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 8
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(8, '131241241247', 'Gina', 'Jalan Sakura no.7', '0812323128', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 9
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(9, '131241241248', 'Hadi', 'Jalan Mawar no.8', '0812323129', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 10
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(10, '131241241249', 'Indah', 'Jalan Melati no.9', '0812323130', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 11
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(11, '131241241250', 'Jaya', 'Jalan Anggrek no.10', '0812323131', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 12
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(12, '131241241251', 'Kartika', 'Jalan Kenanga no.11', '0812323132', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 13
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(13, '131241241252', 'Lukman', 'Jalan Cempaka no.12', '0812323133', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 14
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(14, '131241241253', 'Maya', 'Jalan Dahlia no.13', '0812323134', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 15
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(15, '131241241254', 'Nanda', 'Jalan Sakura no.14', '0812323135', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 16
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(16, '131241241255', 'Omar', 'Jalan Mawar no.15', '0812323136', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 17
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(17, '131241241256', 'Putri', 'Jalan Melati no.16', '0812323137', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 18
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(18, '131241241257', 'Qori', 'Jalan Anggrek no.17', '0812323138', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 19
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(19, '131241241258', 'Rizky', 'Jalan Kenanga no.18', '0812323139', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 20
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(20, '131241241259', 'Sari', 'Jalan Cempaka no.19', '0812323140', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 21
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(21, '131241241260', 'Taufik', 'Jalan Dahlia no.20', '0812323141', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 22
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(22, '131241241261', 'Umar', 'Jalan Mawar no.21', '0812323142', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 23
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(23, '131241241262', 'Vina', 'Jalan Melati no.22', '0812323143', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 24
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(24, '131241241263', 'Wawan', 'Jalan Anggrek no.23', '0812323144', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 25
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(25, '131241241264', 'Xena', 'Jalan Kenanga no.24', '0812323145', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 26
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(26, '131241241265', 'Yusuf', 'Jalan Cempaka no.25', '0812323146', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 27
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(27, '131241241266', 'Zahra', 'Jalan Dahlia no.26', '0812323147', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 28
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(28, '131241241267', 'Adi', 'Jalan Sakura no.27', '0812323148', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 29
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(29, '131241241268', 'Bella', 'Jalan Mawar no.28', '0812323149', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 30
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(30, '131241241269', 'Chandra', 'Jalan Melati no.29', '0812323150', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 31
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(31, '131241241270', 'Dina', 'Jalan Anggrek no.30', '0812323151', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 32
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(32, '131241241271', 'Eka', 'Jalan Kenanga no.31', '0812323152', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 33
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(33, '131241241272', 'Fauzi', 'Jalan Cempaka no.32', '0812323153', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 34
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(34, '131241241273', 'Gita', 'Jalan Dahlia no.33', '0812323154', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 35
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(35, '131241241274', 'Hendra', 'Jalan Sakura no.34', '0812323155', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 36
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(36, '131241241275', 'Ika', 'Jalan Mawar no.35', '0812323156', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 37
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(37, '131241241276', 'Joko', 'Jalan Melati no.36', '0812323157', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 38
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(38, '131241241277', 'Kirana', 'Jalan Anggrek no.37', '0812323158', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 39
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(39, '131241241278', 'Leo', 'Jalan Kenanga no.38', '0812323159', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 40
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(40, '131241241279', 'Mira', 'Jalan Cempaka no.39', '0812323160', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 41
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(41, '131241241280', 'Nanda', 'Jalan Dahlia no.40', '0812323161', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 42
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(42, '131241241281', 'Okta', 'Jalan Sakura no.41', '0812323162', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 43
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(43, '131241241282', 'Pandu', 'Jalan Mawar no.42', '0812323163', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 44
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(44, '131241241283', 'Qonita', 'Jalan Melati no.43', '0812323164', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 45
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(45, '131241241284', 'Rama', 'Jalan Anggrek no.44', '0812323165', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 46
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(46, '131241241285', 'Siti', 'Jalan Kenanga no.45', '0812323166', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 47
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(47, '131241241286', 'Tari', 'Jalan Cempaka no.46', '0812323167', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 48
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(48, '131241241287', 'Umi', 'Jalan Dahlia no.47', '0812323168', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 49
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(49, '131241241288', 'Vino', 'Jalan Sakura no.48', '0812323169', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 50
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(50, '131241241289', 'Wati', 'Jalan Mawar no.49', '0812323170', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 51
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(51, '131241241290', 'Yanti', 'Jalan Melati no.50', '0812323171', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 52
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(52, '131241241291', 'Zainal', 'Jalan Anggrek no.51', '0812323172', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 53
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(53, '131241241292', 'Arif', 'Jalan Kenanga no.52', '0812323173', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 54
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(54, '131241241293', 'Bima', 'Jalan Cempaka no.53', '0812323174', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 55
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(55, '131241241294', 'Cahya', 'Jalan Dahlia no.54', '0812323175', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 56
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(56, '131241241295', 'Dian', 'Jalan Sakura no.55', '0812323176', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 57
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(57, '131241241296', 'Euis', 'Jalan Mawar no.56', '0812323177', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 58
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(58, '131241241297', 'Firdaus', 'Jalan Melati no.57', '0812323178', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 59
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(59, '131241241298', 'Gisel', 'Jalan Anggrek no.58', '0812323179', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 60
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(60, '131241241299', 'Hartono', 'Jalan Kenanga no.59', '0812323180', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Owner ID 61
INSERT INTO public.stall_owners (id, nik, name, address, phone, created_at, updated_at) VALUES
(61, '131241241300', 'Intan', 'Jalan Cempaka no.60', '0812323181', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign owners to stalls (SEC001-LP01 to SEC001-LP20)
UPDATE public.stalls SET owner_id = 2 WHERE code = 'SEC001-LP01';
UPDATE public.stalls SET owner_id = 3 WHERE code = 'SEC001-LP02';
UPDATE public.stalls SET owner_id = 4 WHERE code = 'SEC001-LP03';
UPDATE public.stalls SET owner_id = 5 WHERE code = 'SEC001-LP04';
UPDATE public.stalls SET owner_id = 6 WHERE code = 'SEC001-LP05';
UPDATE public.stalls SET owner_id = 7 WHERE code = 'SEC001-LP06';
UPDATE public.stalls SET owner_id = 8 WHERE code = 'SEC001-LP07';
UPDATE public.stalls SET owner_id = 9 WHERE code = 'SEC001-LP08';
UPDATE public.stalls SET owner_id = 10 WHERE code = 'SEC001-LP09';
UPDATE public.stalls SET owner_id = 11 WHERE code = 'SEC001-LP10';
UPDATE public.stalls SET owner_id = 12 WHERE code = 'SEC001-LP11';
UPDATE public.stalls SET owner_id = 13 WHERE code = 'SEC001-LP12';
UPDATE public.stalls SET owner_id = 14 WHERE code = 'SEC001-LP13';
UPDATE public.stalls SET owner_id = 15 WHERE code = 'SEC001-LP14';
UPDATE public.stalls SET owner_id = 16 WHERE code = 'SEC001-LP15';
UPDATE public.stalls SET owner_id = 17 WHERE code = 'SEC001-LP16';
UPDATE public.stalls SET owner_id = 18 WHERE code = 'SEC001-LP17';
UPDATE public.stalls SET owner_id = 19 WHERE code = 'SEC001-LP18';
UPDATE public.stalls SET owner_id = 20 WHERE code = 'SEC001-LP19';
UPDATE public.stalls SET owner_id = 21 WHERE code = 'SEC001-LP20';

-- Assign owners to stalls (SEC002-LP01 to SEC002-LP20)
UPDATE public.stalls SET owner_id = 22 WHERE code = 'SEC002-LP01';
UPDATE public.stalls SET owner_id = 23 WHERE code = 'SEC002-LP02';
UPDATE public.stalls SET owner_id = 24 WHERE code = 'SEC002-LP03';
UPDATE public.stalls SET owner_id = 25 WHERE code = 'SEC002-LP04';
UPDATE public.stalls SET owner_id = 26 WHERE code = 'SEC002-LP05';
UPDATE public.stalls SET owner_id = 27 WHERE code = 'SEC002-LP06';
UPDATE public.stalls SET owner_id = 28 WHERE code = 'SEC002-LP07';
UPDATE public.stalls SET owner_id = 29 WHERE code = 'SEC002-LP08';
UPDATE public.stalls SET owner_id = 30 WHERE code = 'SEC002-LP09';
UPDATE public.stalls SET owner_id = 31 WHERE code = 'SEC002-LP10';
UPDATE public.stalls SET owner_id = 32 WHERE code = 'SEC002-LP11';
UPDATE public.stalls SET owner_id = 33 WHERE code = 'SEC002-LP12';
UPDATE public.stalls SET owner_id = 34 WHERE code = 'SEC002-LP13';
UPDATE public.stalls SET owner_id = 35 WHERE code = 'SEC002-LP14';
UPDATE public.stalls SET owner_id = 36 WHERE code = 'SEC002-LP15';
UPDATE public.stalls SET owner_id = 37 WHERE code = 'SEC002-LP16';
UPDATE public.stalls SET owner_id = 38 WHERE code = 'SEC002-LP17';
UPDATE public.stalls SET owner_id = 39 WHERE code = 'SEC002-LP18';
UPDATE public.stalls SET owner_id = 40 WHERE code = 'SEC002-LP19';
UPDATE public.stalls SET owner_id = 41 WHERE code = 'SEC002-LP20';

-- Assign owners to stalls (SEC003-LP01 to SEC003-LP20)
UPDATE public.stalls SET owner_id = 42 WHERE code = 'SEC003-LP01';
UPDATE public.stalls SET owner_id = 43 WHERE code = 'SEC003-LP02';
UPDATE public.stalls SET owner_id = 44 WHERE code = 'SEC003-LP03';
UPDATE public.stalls SET owner_id = 45 WHERE code = 'SEC003-LP04';
UPDATE public.stalls SET owner_id = 46 WHERE code = 'SEC003-LP05';
UPDATE public.stalls SET owner_id = 47 WHERE code = 'SEC003-LP06';
UPDATE public.stalls SET owner_id = 48 WHERE code = 'SEC003-LP07';
UPDATE public.stalls SET owner_id = 49 WHERE code = 'SEC003-LP08';
UPDATE public.stalls SET owner_id = 50 WHERE code = 'SEC003-LP09';
UPDATE public.stalls SET owner_id = 51 WHERE code = 'SEC003-LP10';
UPDATE public.stalls SET owner_id = 52 WHERE code = 'SEC003-LP11';
UPDATE public.stalls SET owner_id = 53 WHERE code = 'SEC003-LP12';
UPDATE public.stalls SET owner_id = 54 WHERE code = 'SEC003-LP13';
UPDATE public.stalls SET owner_id = 55 WHERE code = 'SEC003-LP14';
UPDATE public.stalls SET owner_id = 56 WHERE code = 'SEC003-LP15';
UPDATE public.stalls SET owner_id = 57 WHERE code = 'SEC003-LP16';
UPDATE public.stalls SET owner_id = 58 WHERE code = 'SEC003-LP17';
UPDATE public.stalls SET owner_id = 59 WHERE code = 'SEC003-LP18';
UPDATE public.stalls SET owner_id = 60 WHERE code = 'SEC003-LP19';
UPDATE public.stalls SET owner_id = 61 WHERE code = 'SEC003-LP20';