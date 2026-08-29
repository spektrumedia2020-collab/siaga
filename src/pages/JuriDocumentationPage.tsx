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

const GITHUB_REPO_URL = 'https://github.com/spektrumedia2020-collab/siaga'
const WEB_APP_URL = 'https://siaga-pi.vercel.app'
const DRIVE_URL = 'https://drive.google.com/drive/folders/1RMOtTkinfgmxTGujOMI0jNNDwW7Yp6jX'
const MOBILE_APP_URL = 'https://drive.google.com/drive/folders/1RMOtTkinfgmxTGujOMI0jNNDwW7Yp6jX'
const PUBLIC_LANDING_PAGE = 'https://siaga-pi.vercel.app/@niaga'
const PUBLIC_STALL_DEMO = 'https://siaga-pi.vercel.app/lapak/30/NGD-0207'
const DEVELOPMENT_DOCS_URL = `${GITHUB_REPO_URL}/blob/main/DEVELOPMENT.md`
const ARCHITECTURE_DOC_URL = `${GITHUB_REPO_URL}/blob/main/ARCHITECTURE_REVIEW_COMPLETE.md`
const AUDIT_REPORT_URL = `${GITHUB_REPO_URL}/blob/main/AUDIT_REPORT.md`

const navItems = [
  { label: 'Overview', href: '#juri-overview' },
  { label: 'Problem', href: '#juri-problem' },
  { label: 'Solution', href: '#juri-solution' },
  { label: 'Features', href: '#juri-features' },
  { label: 'Demo', href: '#juri-demo' },
  { label: 'Accounts', href: '#juri-accounts' },
  { label: 'Resources', href: '#juri-resources' },
]

const quickOverview = [
  { title: 'Multi-Pasar', text: 'Satu sistem untuk mengelola beberapa pasar dalam satu ekosistem' },
  { title: 'Digitalisasi Retribusi', text: 'Mendukung pencatatan transaksi dan pengelolaan setoran dengan lebih terstruktur' },
  { title: 'Monitoring Terpusat', text: 'Data dapat dipantau lebih cepat dari satu platform untuk kebutuhan operasi dan evaluasi' },
  { title: 'Data Terintegrasi', text: 'Informasi pasar, pedagang, transaksi, dan laporan saling terhubung dalam satu system' },
]

const painPoints = [
  {
    title: 'Pencatatan',
    text: 'Proses manual membutuhkan waktu, rentan terhadap kesalahan, dan sulit dilacak saat terjadi perubahan data.',
  },
  {
    title: 'Monitoring',
    text: 'Pengelolaan berbagai pasar membutuhkan satu view yang lebih terpusat agar pergerakan operasional mudah diawasi.',
  },
  {
    title: 'Data',
    text: 'Informasi retribusi perlu tersimpan secara rapi dan dapat digunakan kembali untuk audit, laporan, dan keputusan.',
  },
]

const featureCards = [
  { icon: '🏪', title: 'Manajemen Pasar', text: 'Mengelola identitas pasar, sektor, data pasar, dan pengaturan operasional dari satu platform.' },
  { icon: '👥', title: 'Manajemen Pedagang', text: 'Mengelola data pedagang, lapak, dan komposisi usaha dalam satu basis data yang lebih konsisten.' },
  { icon: '💸', title: 'Retribusi', text: 'Membantu proses pemungutan, pencatatan, dan rekonsiliasi retribusi pasar secara lebih transparan.' },
  { icon: '📱', title: 'Petugas Lapangan', text: 'Petugas dapat mencatat transaksi dari mobile app dengan alur yang sederhana dan mudah dipantau.' },
  { icon: '🔎', title: 'QR / Barcode', text: 'Penggunaan QR lapak mempercepat identifikasi lokasi transaksi dan mengurangi kesalahan pencatatan.' },
  { icon: '📊', title: 'Monitoring & Laporan', text: 'Laporan dan dashboard memberikan visibilitas terhadap kinerja pasar dan potensi pendapatan.' },
]

const workFlow = [
  'Pedagang / Lapak',
  'Identifikasi',
  'Retribusi',
  'Transaksi',
  'Data SIAGA',
  'Monitoring',
  'Laporan',
]

const DEMO_ACCOUNTS: AccountRow[] = [
  { role: 'ADMIN', roleBadge: 'Superadmin', nama: 'Super Admin', email: 'admin@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: 'Kelola semua pasar, petugas, lapak, retribusi, pengguna, dan impersonate' },
  { role: 'MARKET_HEAD', roleBadge: 'Kepala Pasar', nama: 'Kepala Pasar', email: 'kepala@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: 'Dashboard pasar miliknya untuk memantau lapak, petugas, retribusi, dan transaksi' },
  { role: 'OFFICER', roleBadge: 'Petugas', nama: 'Petugas Lapangan', email: 'petugas@siaga.id', password: 'DemiSiaga2026!', platform: 'Mobile', akses: 'Scan QR lapak, catat transaksi, absensi, dan setoran harian' },
  { role: 'TREASURER', roleBadge: 'Bendahara', nama: 'Bendahara', email: 'bendahara@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: 'Verifikasi dan approve setoran petugas serta rekonsiliasi' },
]

const impactValues = [
  { title: 'Efisien', text: 'Mendukung proses pengelolaan retribusi yang lebih cepat, lebih teratur, dan lebih mudah dijalankan.' },
  { title: 'Transparan', text: 'Data tersimpan dan dapat dipantau dalam satu sistem agar lebih mudah diaudit dan dikontrol.' },
  { title: 'Terintegrasi', text: 'Berbagai pasar dapat dikelola melalui satu platform dengan struktur data yang konsisten.' },
  { title: 'Terukur', text: 'Monitoring dan laporan memungkinkan pengambilan keputusan berbasis data yang lebih baik.' },
]

const productPreview = [
  { label: 'Dashboard', text: 'Visual operasional utama untuk melihat kondisi pasar dan aktivitas retribusi.' },
  { label: 'Transaksi', text: 'Alur transaksi yang jelas untuk mencatat dan mengelola retribusi pasar.' },
  { label: 'Pedagang', text: 'Informasi lapak dan pemilik tersusun untuk memudahkan pengelolaan data pasar.' },
  { label: 'Laporan', text: 'Ringkasan data yang siap digunakan untuk monitoring, evaluasi, dan pengambilan keputusan.' },
]

const technology = [
  'React + TypeScript + Vite',
  'Flutter mobile app',
  'Supabase (Postgres + Auth + Storage + RLS)',
  'Express backend routes',
  'QR-based operational workflow',
  'Deployment via Vercel',
]

const resources = [
  { name: 'Source Code', href: GITHUB_REPO_URL, label: 'Lihat repository' },
  { name: 'Development Guide', href: DEVELOPMENT_DOCS_URL, label: 'Buka dokumentasi' },
  { name: 'Architecture Review', href: ARCHITECTURE_DOC_URL, label: 'Lihat review arsitektur' },
  { name: 'Audit Report', href: AUDIT_REPORT_URL, label: 'Buka laporan audit' },
]

function SectionTitle({ id, title, subtitle }: { id: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="juri-section-title">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

export function JuriDocumentationPage() {
  return (
    <div className="juri-docs">
      <header className="juri-header">
        <div className="juri-brand-wrap">
          <div className="juri-brand-mark">S</div>
          <div className="juri-brand-copy">
            <span className="juri-brand-name">SIAGA</span>
            <span className="juri-brand-subtitle">Judge Portal</span>
          </div>
        </div>

        <nav className="juri-header-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>

        <a className="juri-topbar-cta" href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">
          Buka Demo
        </a>
      </header>

      <main className="juri-page">
        <section id="juri-overview" className="juri-hero">
          <div className="juri-hero-copy">
            <p className="juri-eyebrow">HACKATHON DEMO • SIAGA</p>
            <h1>SIAGA</h1>
            <h2>Sistem Manajemen Retribusi Pasar</h2>
            <p>
              Platform terintegrasi untuk membantu pengelolaan berbagai pasar secara lebih mudah, transparan,
              dan terukur. SIAGA menghubungkan data pasar, pedagang, pendapatan, dan operasi dalam satu sistem.
            </p>

            <div className="juri-cta-row">
              <a className="juri-btn juri-btn-primary" href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">
                🚀 Eksplorasi SIAGA
              </a>
              <a className="juri-btn juri-btn-secondary" href="#juri-demo">
                📖 Lihat Cara Kerja
              </a>
            </div>

            <ul className="juri-hero-meta" aria-label="Highlights">
              <li>Multi-pasar</li>
              <li>Digitalisasi retribusi</li>
              <li>Monitoring terpusat</li>
            </ul>
          </div>

          <div className="juri-hero-panel">
            <div className="juri-panel-badge">SIAGA ready</div>
            <h3>Produk yang sudah terimplementasi</h3>
            <div className="juri-panel-grid">
              <div>
                <strong>8+</strong>
                <span>Fungsi utama</span>
              </div>
              <div>
                <strong>4</strong>
                <span>Role utama</span>
              </div>
              <div>
                <strong>1</strong>
                <span>Sistem terpusat</span>
              </div>
            </div>
            <p>
              SIAGA dirancang sebagai platform pengelolaan pasar yang tidak hanya fokus pada satu pasar,
              tetapi dapat memperluas cakupan ke banyak pasar dalam satu ekosistem.
            </p>
          </div>
        </section>

        <section className="juri-section" aria-labelledby="juri-overview-summary">
          <SectionTitle
            id="juri-overview-summary"
            title="SIAGA dalam singkat"
            subtitle="Konsep produk yang menjelaskan mengapa SIAGA relevan untuk pengelolaan pasar modern."
          />

          <div className="juri-overview-grid">
            {quickOverview.map((item) => (
              <div key={item.title} className="juri-overview-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="juri-section" id="juri-problem">
          <SectionTitle
            id="juri-problem-title"
            title="Tantangan yang dihadapi"
            subtitle="SIAGA menjawab kebutuhan operasional pasar yang sering masih berjalan secara manual dan terpisah."
          />

          <div className="juri-problem-grid">
            {painPoints.map((item) => (
              <div key={item.title} className="juri-card">
                <div className="juri-card-ribbon">{item.title}</div>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="juri-section" id="juri-solution">
          <SectionTitle
            id="juri-solution-title"
            title="SIAGA menghubungkan pengelolaan pasar"
            subtitle="SIAGA bukan produk untuk satu pasar saja. SIAGA adalah sistem terpusat untuk mengelola banyak pasar, data, dan proses operasional."
          />

          <div className="juri-solution-graph" aria-label="SIAGA architecture overview">
            <div className="juri-node">Pasar A</div>
            <div className="juri-node">Pasar B</div>
            <div className="juri-node">Pasar C</div>
            <div className="juri-connector juri-connector-main">SIAGA</div>
            <div className="juri-connector">Retribusi</div>
            <div className="juri-connector">Pedagang</div>
            <div className="juri-connector">Laporan</div>
          </div>
        </section>

        <section className="juri-section" id="juri-features">
          <SectionTitle
            id="juri-features-title"
            title="Fitur utama"
            subtitle="Fitur yang benar-benar relevan dengan pengalaman kerja SIAGA di dunia nyata."
          />

          <div className="juri-feature-grid">
            {featureCards.map((item) => (
              <div key={item.title} className="juri-feature-card">
                <div className="juri-feature-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="juri-section" id="juri-demo">
          <SectionTitle
            id="juri-how-it-works"
            title="How it works"
            subtitle="Alur sederhana yang menunjukkan bagaimana SIAGA mengubah proses pasar dari manual menjadi terstruktur."
          />

          <div className="juri-flow" aria-label="Product workflow">
            {workFlow.map((step, index) => (
              <div key={step} className="juri-flow-item">
                <span className="juri-flow-label">0{index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>

          <div className="juri-demo-center">
            <div className="juri-demo-card juri-demo-primary">
              <div className="juri-demo-icon">🌐</div>
              <h3>Demo public</h3>
              <p>Contoh implementasi publik SIAGA untuk pasar tertentu, yang menampilkan pengalaman masyarakat terhadap pasar.</p>
              <a href={PUBLIC_LANDING_PAGE} target="_blank" rel="noopener noreferrer">Buka Demo Pasar Niaga Daya →</a>
            </div>

            <div className="juri-demo-card">
              <div className="juri-demo-icon">🧭</div>
              <h3>Coba aplikasi SIAGA</h3>
              <p>Eksplorasi pengalaman admin dan operasional melalui aplikasi utama SIAGA yang sudah tersedia.</p>
              <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">Buka Aplikasi →</a>
            </div>

            <div className="juri-demo-card">
              <div className="juri-demo-icon">📁</div>
              <h3>Dokumen & support</h3>
              <p>Semua sumber pendukung seperti dokumentasi, review arsitektur, dan laporan audit dapat diakses sepenuhnya.</p>
              <a href={DRIVE_URL} target="_blank" rel="noopener noreferrer">Buka Google Drive →</a>
            </div>
          </div>
        </section>

        <section className="juri-section" id="juri-accounts">
          <SectionTitle
            id="juri-accounts-title"
            title="Akun demo"
            subtitle="Juri dapat mencoba pengalaman dari berbagai role dan melihat bagaimana SIAGA bekerja untuk tiap kebutuhan operasional."
          />

          <div className="juri-account-grid">
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.role} className="juri-account-card">
                <div className="juri-account-topline">
                  <span className={`juri-role-badge juri-role-${account.role.toLowerCase()}`}>{account.roleBadge}</span>
                  <span className="juri-role-code">{account.role}</span>
                </div>

                <h3>{account.nama}</h3>
                <div className="juri-credential-row">
                  <label>Email</label>
                  <code>{account.email}</code>
                </div>
                <div className="juri-credential-row">
                  <label>Password</label>
                  <code>{account.password}</code>
                </div>
                <div className="juri-credential-row">
                  <label>Platform</label>
                  <span>{account.platform}</span>
                </div>
                <p>{account.akses}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="juri-section">
          <SectionTitle
            id="juri-public-demo"
            title="Contoh implementasi public"
            subtitle="SIAGA tidak hanya diperuntukkan untuk admin. Platform ini juga menyediakan pengalaman publik untuk pasar tertentu."
          />

          <div className="juri-public-demo-box">
            <div>
              <span className="juri-public-tag">Public Demo</span>
              <h3>Pasar Niaga Daya</h3>
              <p>
                Ini adalah salah satu contoh halaman public yang menunjukkan bagaimana SIAGA menghadirkan pengalaman
                untuk pengunjung dan pedagang dalam satu pasar tertentu.
              </p>
            </div>
            <a href={PUBLIC_LANDING_PAGE} target="_blank" rel="noopener noreferrer">Lihat Public Demo →</a>
          </div>

          <div className="juri-aux-links">
            <a href={PUBLIC_STALL_DEMO} target="_blank" rel="noopener noreferrer">Lihat detail lapak demo →</a>
          </div>
        </section>

        <section className="juri-section" id="juri-impact">
          <SectionTitle
            id="juri-value"
            title="Dampak / value yang ditawarkan"
            subtitle="SIAGA berfokus pada efisiensi, transparansi, integrasi, dan pengambilan keputusan berbasis data."
          />

          <div className="juri-impact-grid">
            {impactValues.map((item) => (
              <div key={item.title} className="juri-impact-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="juri-section">
          <SectionTitle
            id="juri-preview"
            title="Product preview"
            subtitle="Visual produk yang menunjukkan bahwa SIAGA bukan sekadar konsep, melainkan solusi yang sudah terimplementasi."
          />

          <div className="juri-preview-grid">
            {productPreview.map((item) => (
              <div key={item.label} className="juri-preview-card">
                <div className="juri-preview-badge">{item.label}</div>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="juri-section">
          <SectionTitle
            id="juri-tech"
            title="Built with"
            subtitle="Teknologi yang digunakan dalam implementasi produk SIAGA."
          />

          <div className="juri-tech-list" aria-label="Technology stack">
            {technology.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="juri-section" id="juri-resources">
          <SectionTitle
            id="juri-resources-title"
            title="Hackathon resources"
            subtitle="Semua sumber pendukung untuk memahami SIAGA secara lebih lengkap sebelum evaluasi."
          />

          <div className="juri-resource-grid">
            {resources.map((item) => (
              <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="juri-resource-card">
                <span>{item.name}</span>
                <strong>{item.label}</strong>
              </a>
            ))}
          </div>
        </section>

        <section className="juri-section" id="juri-quick-start">
          <SectionTitle
            id="juri-start"
            title="Mulai eksplorasi"
            subtitle="Langkah cepat agar juri dapat memahami, mencoba, dan menilai SIAGA tanpa kebingungan."
          />

          <div className="juri-step-grid">
            <div className="juri-step-card">
              <span>01</span>
              <h3>Pahami</h3>
              <p>Baca overview produk dan nilai problem statement yang diangkat oleh SIAGA.</p>
            </div>
            <div className="juri-step-card">
              <span>02</span>
              <h3>Coba</h3>
              <p>Buka aplikasi dan gunakan akunnya untuk mengeksplorasi berbagai role.</p>
            </div>
            <div className="juri-step-card">
              <span>03</span>
              <h3>Eksplorasi</h3>
              <p>Uji fitur utama seperti transaksi, pasar, laporan, dan monitoring dari sisi operasional.</p>
            </div>
            <div className="juri-step-card">
              <span>04</span>
              <h3>Pelajari</h3>
              <p>Buka dokumentasi dan source code untuk melihat fondasi teknis dan desain produk.</p>
            </div>
          </div>
        </section>

        <section className="juri-final-cta">
          <div>
            <p className="juri-eyebrow">SIAGA</p>
            <h2>Kenali SIAGA lebih dekat</h2>
          </div>
          <div className="juri-final-actions">
            <a className="juri-btn juri-btn-primary" href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">
              🚀 Buka Demo SIAGA
            </a>
            <a className="juri-btn juri-btn-secondary" href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              🔗 Lihat Source Code
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}


