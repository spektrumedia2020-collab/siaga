import './JuriDocumentationPage.css'

interface AccountRow {
  role: string
  roleBadge: string
  nama: string
  email: string
  password: string
  platform: string
  akses: string
}

// ---- Blok kredensial demo (ISI SESUAI SEED SUPABASE ANDA) ----
const DEMO_ACCOUNTS: AccountRow[] = [
  { role: 'ADMIN', roleBadge: 'Superadmin', nama: 'Super Admin', email: 'admin@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: '#superadmin/dashboard — kelola semua pasar, petugas, lapak, retribusi, pengguna, impersonate' },
  { role: 'MARKET_HEAD', roleBadge: 'Kepala Pasar', nama: 'Kepala Pasar', email: 'kepala@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: '#market/dashboard — dashboard pasar, kelola lapak, petugas, retribusi & transaksi pasar miliknya' },
  { role: 'OFFICER', roleBadge: 'Petugas', nama: 'Petugas Lapangan', email: 'petugas@siaga.id', password: 'DemiSiaga2026!', platform: 'Mobile', akses: 'Aplikasi mobile — scan QR lapak, catat transaksi retribusi, absensi, setoran harian' },
  { role: 'TREASURER', roleBadge: 'Bendahara', nama: 'Bendahara', email: 'bendahara@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: 'Aplikasi mobile — verifikasi/approve setoran petugas, rekonsiliasi' },
  ]

export function JuriDocumentationPage() {
  return (
    <div className="juri-docs">
      <header className="juri-hero">
        <div className="juri-hero-inner">
          <div className="juri-badge">PIDI DIGDAYA Hackathon 2026 · Demo</div>
          <h1>SiAga</h1>
          <p className="juri-tagline">Sistem Informasi Manajemen Pasar</p>
          <p className="juri-desc">
            Platform digital untuk pengelolaan retribusi pasar yang transparan &amp; akuntabel —
            dari pencatatan transaksi lapangan, setoran petugas, hingga rekonsiliasi keuangan
            pasar. Dilengkapi web admin + aplikasi mobile petugas dengan konektivitas offline.
          </p>
          <a
            className="juri-drive-btn"
            href="https://drive.google.com/drive/folders/1RMOtTkinfgmxTGujOMI0jNNDwW7Yp6jX"
            target="_blank"
            rel="noopener noreferrer"
          >
            📁 Google Drive — Semua Dokumentasi &amp; Demo
          </a>
        </div>
      </header>

      <JuriNav />

      <div className="juri-body">
        <JuriTentang />
        <JuriDaftarAkun />
        <JuriFitur />
        <JuriArsitektur />
      </div>
    </div>
  )
}

function JuriNav() {
  return (
    <div className="juri-tabs">
      <a className="juri-tab" href="#juri-tentang">📘 Tentang</a>
      <a className="juri-tab" href="#juri-akun">🔑 Akun Demo</a>
      <a className="juri-tab" href="#juri-fitur">⚙️ Fitur</a>
      <a className="juri-tab" href="#juri-arsitektur">🏗️ Arsitektur</a>
      <a
        className="juri-tab juri-tab-drive"
        href="https://drive.google.com/drive/folders/1RMOtTkinfgmxTGujOMI0jNNDwW7Yp6jX"
        target="_blank"
        rel="noopener noreferrer"
      >📁 Google Drive</a>
    </div>
  )
}

function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="juri-section-title">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

function JuriTentang() {
  return (
    <section className="juri-section">
      <SectionTitle id="juri-tentang" title="Tentang Aplikasi" subtitle="Masalah yang dipecahkan & solusi SiAga" />
      <div className="juri-cards">
        <div className="juri-card"><h3>💡 Masalah</h3><p>Pengelolaan retribusi pasar sering dilakukan manual &amp; terpencar — berpotensi kebocoran, sulit dilacak, dan laporan keuangan tidak transparan antara petugas, bendahara, kepala pasar, dan dinas.</p></div>
        <div className="juri-card"><h3>🚀 Solusi</h3><p>SiAga mendigitalkan seluruh siklus retribusi: petugas mencatat transaksi via scan QR lapak di aplikasi mobile (bisa offline), data tersinkron ke cloud, setoran harian diverifikasi bendahara, dan kepala pasar/administrator melihat dashboard real-time.</p></div>
        <div className="juri-card"><h3>🎯 Dampak</h3><p>Transparansi penerimaan, akurasi pelaporan, pengawasan berbasis data, dan peningkatan pendapatan daerah yang akuntabel serta mudah diaudit.</p></div>
      </div>
    </section>
  )
}

function JuriDaftarAkun() {
  return (
    <section className="juri-section">
      <SectionTitle id="juri-akun" title="Daftar Akun untuk Mengakses Semua Role" subtitle="Gunakan kredensial di bawah untuk masuk ke setiap peran. Akun ADMIN di platform web membuka superadmin dashboard." />
      <div className="juri-note">
        💡 <strong>Alur login Web:</strong> buka halaman utama → <em>Login</em> → masukkan email &amp; password.
        Akun ADMIN otomatis dialihkan ke Superadmin Dashboard; akun MARKET_HEAD ke Dashboard Pasar.
        <br />
        💡 <strong>Aplikasi Mobile:</strong> login dengan akun OFFICER / TREASURER / CASHIER pada aplikasi Flutter.
      </div>
      <div className="juri-table-wrap">
        <table className="juri-table">
          <thead>
            <tr><th>Role</th><th>Nama</th><th>Email</th><th>Password</th><th>Platform</th><th>Akses</th></tr>
          </thead>
          <tbody>
            {DEMO_ACCOUNTS.map((acc) => (
              <tr key={acc.role}>
                <td>
                  <span className={`juri-role-badge juri-role-${acc.role.toLowerCase()}`}>{acc.roleBadge}</span>
                  <div className="juri-role-code">{acc.role}</div>
                </td>
                <td>{acc.nama}</td>
                <td><code>{acc.email}</code></td>
                <td><code>{acc.password}</code></td>
                <td>{acc.platform}</td>
                <td className="juri-akses">{acc.akses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function JuriFitur() {
  const fitur = [
    { icon: '📱', title: 'Aplikasi Mobile Petugas', desc: 'Flutter + supabase-flutter. Scan QR lapak, catat transaksi retribusi, absensi, dan setoran — mendukung mode offline.' },
    { icon: '🖥️', title: 'Web Admin / Superadmin', desc: 'Dashboard manajemen pasar, petugas, lapak, sektor, jenis retribusi, transaksi, dan pengguna. Impersonate untuk meninjau peran lain.' },
    { icon: '🔒', title: 'Keamanan RLS', desc: 'Row Level Security di Supabase — setiap role hanya mengakses data sesuai lingkup (admin lintas pasar, petugas sesuai pasar &amp; dirinya).' },
    { icon: '📊', title: 'Dashboard Real-time', desc: 'Ringkasan pendapatan harian, target setoran, dan kesehatan pasar dalam tampilan terpusat untuk kepala pasar &amp; admin.' },
    { icon: '🧾', title: 'Setoran & Rekonsiliasi', desc: 'Petugas setor hasil pungutan, bendahara verifikasi &amp; approve, kepala pasar memantau rekonsiliasi.' },
    { icon: '🏪', title: 'Halaman Publik Pasar', desc: 'Setiap pasar punya landing page publik (via /#@slug) menampilkan sektor, lapak, dan pemilik — untuk transparansi ke pedagang/masyarakat.' },
  ]
  return (
    <section className="juri-section">
      <SectionTitle id="juri-fitur" title="Fitur Unggulan" subtitle="Kemampuan utama SiAga yang diimplementasikan lintas platform." />
      <div className="juri-feature-grid">
        {fitur.map((f) => (
          <div className="juri-feature" key={f.title}>
            <div className="juri-feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function JuriArsitektur() {
  const tech = [
    { name: 'Web App', stack: 'React 19 · TypeScript · Vite', role: 'Admin &amp; superadmin, deploy Vercel' },
    { name: 'Mobile App', stack: 'Flutter · Riverpod · go_router', role: 'Petugas lapangan, supabase-flutter + QR scan' },
    { name: 'Backend & Database', stack: 'Supabase (Postgres + Auth + Storage + RLS)', role: 'Single source of truth, keamanan row-level' },
    { name: 'CI/CD', stack: 'GitHub Actions', role: 'Build web, analyzer Flutter, lint SQL otomatis' },
  ]
  return (
    <section className="juri-section">
      <SectionTitle id="juri-arsitektur" title="Arsitektur Teknis" subtitle="Supabase-first: satu basis data &amp; autentikasi untuk web dan mobile." />
      <table className="juri-arch-table">
        <thead>
          <tr><th>Lapisan</th><th>Teknologi</th><th>Peran</th></tr>
        </thead>
        <tbody>
          {tech.map((t) => (
            <tr key={t.name}>
              <td><strong>{t.name}</strong></td>
              <td><code>{t.stack}</code></td>
              <td>{t.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="juri-note">
        🔐 Semua akun memakai autentikasi <strong>Supabase Auth</strong> (email + password).
        Akses data dijaga <strong>Row Level Security</strong> berdasarkan role &amp; lingkup pasar,
        sehingga demo antar role aman dan sesuai batas wewenang.
      </div>
    </section>
  )
}

