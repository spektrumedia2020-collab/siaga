-- Kode lama lapak dari sistem sebelumnya (mis. SWH.L.A.0001 atau 1).
-- Diisi dari kolom "KODE LAMA" pada CSV legacy maupun form lapak.

alter table public.stalls add column if not exists legacy_code text;

comment on column public.stalls.legacy_code is 'Kode lapak pada sistem lama (CSV KODE LAMA)';
