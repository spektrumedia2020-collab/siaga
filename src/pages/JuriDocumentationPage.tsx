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

// ---- Link akses aplikasi (ISI SESUAI DADO LIVE) ----
const WEB_APP_URL = 'https://siaga-pi.vercel.app'
const DRIVE_URL = 'https://drive.google.com/drive/folders/1RMOtTkinfgmxTGujOMI0jNNDwW7Yp6jX'
// Mobile APK link — hanya role PETUGAS (OFFICER) memakai apps mobile
const MOBILE_APP_URL = 'https://drive.google.com/drive/folders/1RMOtTkinfgmxTGujOMI0jNNDwW7Yp6jX'

// ---- Link akses halaman publik (landing page & lapak) ----
const PUBLIC_LANDING_PAGE = 'https://siaga-pi.vercel.app/@niaga'
const PUBLIC_STALL_DEMO = 'https://siaga-pi.vercel.app/lapak/1/A-001'

// ---- Blok kredensial demo (ISI SESUAI SEED SUPABASE ANDA) ----
const DEMO_ACCOUNTS: AccountRow[] = [
  { role: 'ADMIN', roleBadge: 'Superadmin', nama: 'Super Admin', email: 'admin@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: '#superadmin/dashboard — kelola semua pasar, petugas, lapak, retribusi, pengguna, impersonate' },
  { role: 'MARKET_HEAD', roleBadge: 'Kepala Pasar', nama: 'Kepala Pasar', email: 'kepala@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: '#market/dashboard — dashboard pasar, kelola lapak, petugas, retribusi & transaksi pasar miliknya' },
  { role: 'OFFICER', roleBadge: 'Petugas', nama: 'Petugas Lapangan', email: 'petugas@siaga.id', password: 'DemiSiaga2026!', platform: 'Mobile', akses: 'Aplikasi mobile — scan QR lapak, catat transaksi retribusi, absensi, setoran harian' },
  { role: 'TREASURER', roleBadge: 'Bendahara', nama: 'Bendahara', email: 'bendahara@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: 'Web dashboard — verifikasi/approve setoran petugas, rekonsiliasi' },
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
          <div className="juri-access-buttons">
            <a className="juri-access-btn juri-access-web" href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">
              🌐 Akses Web — Admin / Kepala Pasar
            </a>
            <a className="juri-access-btn juri-access-mobile" href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">
              📱 Mobile Demo — Hanya Petugas
            </a>
          </div>
          <a className="juri-drive-btn" href={DRIVE_URL} target="_blank" rel="noopener noreferrer">
            📁 Google Drive — Semua Dokumentasi &amp; Demo
          </a>
        </div>
      </header>

      <JuriNav />

      <div className="juri-body">
        <JuriPublikPages />
        <JuriTentang />
        <JuriDownload />
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
      <a className="juri-tab" href="#juri-publik">🌍 Halaman Publik</a>
      <a className="juri-tab" href="#juri-tentang">📘 Tentang</a>
      <a className="juri-tab" href="#juri-akun">🔑 Akun Demo</a>
      <a className="juri-tab" href="#juri-download">📥 Download Apps</a>
      <a className="juri-tab" href="#juri-fitur">⚙️ Fitur</a>
      <a className="juri-tab" href="#juri-arsitektur">🏗️ Arsitektur</a>
      <a
        className="juri-tab juri-tab-drive"
        href={DRIVE_URL}
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

function JuriPublikPages() {
  const publicPages = [
    {
      icon: '🏪',
      title: 'Landing Page Pasar',
      desc: 'Halaman publik untuk setiap pasar yang menampilkan profil, sektor, lapak, dan informasi penting pasar secara menarik. Tanpa autentikasi — dapat diakses siapa saja.',
      url: PUBLIC_LANDING_PAGE,
      label: 'Lihat Landing Page Niaga Daya',
    },
    {
      icon: '🏬',
      title: 'Halaman Detail Lapak',
      desc: 'Halaman publik untuk detail lapak (toko) tertentu yang menampilkan nama, pemilik, sektor, lokasi, dan status lapak. Dapat diakses dari landing page atau langsung via URL.',
      url: PUBLIC_STALL_DEMO,
      label: 'Lihat Detail Lapak A-001',
    },
  ]

  return (
    <section className="juri-section">
      <SectionTitle
        id="juri-publik"
        title="Halaman Publik (Tanpa Login)"
        subtitle="Halaman yang dapat diakses siapa saja tanpa autentikasi — untuk transparansi pasar kepada pedagang dan masyarakat."
      />
      <div className="juri-public-grid">
        {publicPages.map((page) => (
          <div className="juri-public-card" key={page.title}>
            <div className="juri-feature-icon">{page.icon}</div>
            <h3>{page.title}</h3>
            <p>{page.desc}</p>
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="juri-public-link"
            >
              {page.label} →
            </a>
          </div>
        ))}
      </div>
      <div className="juri-note">
        🌍 <strong>Transparansi Pasar:</strong> Halaman publik dirancang untuk menampilkan informasi pasar ke pedagang dan masyarakat umum.
        Setiap pasar punya landing page di URL <code>/@nama-pasar</code> dan setiap lapak punya halaman detail di <code>/lapak/[id]/[kode]</code>.
        <br />
        💡 <strong>Format URL:</strong> Buka halaman publik dengan pola <code>https://siaga-pi.vercel.app/@niaga</code> untuk melihat pasar yang terdaftar.
      </div>
    </section>
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


function JuriDownload() {
  const apps = [
    {
      icon: '🗂️',
      name: 'File Instalasi & Build',
      desc: 'Semua file build dijaga di folder Drive — web build & mobile APK.',
      steps: [
        'Buka tombol Google Drive di atas (au tab navigasi).',
        'Klick folder "Siaga-Web" au "SiAga-Mobile" di Drive.',
        'Klick file .zip / .apk dan pilih Download.',
        'Extrai file .zip (web) au install .apk (mobile) na device Anda.',
      ],
    },
    {
      icon: '🌐',
      name: 'Web App (Superadmin / Kepala Pasar)',
      desc: 'Aplikasi web dashboard manajemen — deploy via Vercel. Login direct di browser.',
      steps: [
        'Download folder/zip SiAga-Web di Drive.',
        'Unzip dan buka index.html di browser (au deploy ke Vercel).',
        'Buka halaman login au platform dan pakai demo direct.',
        'Login uba kredensial ADMIN/MARKET_HEAD — lihat section Akun Demo.',
      ],
    },
    {
      icon: '📱',
      name: 'Mobile App (Petugas / Bendahara) — Android',
      desc: 'Aplikasi Flutter mobile petugas lapangan: scan QR, catat transaksi, absensi & setoran.',
      steps: [
        'Download file Siaga-Mobile.apk di Drive.',
        'Transfer file ba Android device (nau download direct).',
        'Tap file .apk lalu install (allow "Unknown sources").',
        'Login uba akun OFFICER/TREASURER di aplikasi mobile.',
      ],
    },
    {
      icon: '🔐',
      name: 'Google Drive — Dokumentasi, Demo & Binari',
      desc: 'Folder Drive punya build log demo, nota brief, installer binario, wireframe & apk mobile.',
      steps: [
        'Buka Google Drive — SiAga App Files di tautan di atas.',
        'Download dokumentasi, demo video, & build binary app.',
        'Semua file ini versi update dan sinkron otomatis.',
      ],
    },
  ]
  return (
    <section className="juri-section">
      <SectionTitle
        id="juri-download"
        title="Download Aplikasi (Apps)"
        subtitle="Cara download & instalasi aplikasi SiAga Web + Mobile dari Google Drive."
      />
      <div className="juri-download-grid">
        {apps.map((a) => (
          <div className="juri-download-card" key={a.name}>
            <div className="juri-feature-icon">{a.icon}</div>
            <h3>{a.name}</h3>
            <p>{a.desc}</p>
            <ol>
              {a.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <div className="juri-note">
        📥 <strong>Link akses:</strong>&nbsp;
        <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">🌐 Web App</a> &nbsp;·&nbsp;
        <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">📱 Mobile (Petugas)</a> &nbsp;·&nbsp;
        <a href={DRIVE_URL} target="_blank" rel="noopener noreferrer">📁 Google Drive</a>
        <br />
        <span style={{ fontSize: '12.5px' }}>⚠️ Aplikasi mobile dikhususkan untuk PETUGAS (OFFICER) saja.</span>
      </div>
    </section>
  )
}


function JuriDaftarAkun() {
  return (
    <section className="juri-section">
      <SectionTitle id="juri-akun" title="Daftar Akun untuk Mengakses Semua Role" subtitle="Gunakan kredensial di bawah untuk masuk ke setiap peran. Akun ADMIN di platform web membuka superadmin dashboard." />
      <div className="juri-note">
        💡 <strong>Alur login Web:</strong> buka halaman Web App → <em>Login</em> → masukkan email &amp; password.
        Akun ADMIN otomatis dialihkan ke Superadmin Dashboard; akun MARKET_HEAD ke Dashboard Pasar.
        <br />
        💡 <strong>Aplikasi Mobile:</strong> login dengan akun OFFICER pada aplikasi mobile di atas.
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


