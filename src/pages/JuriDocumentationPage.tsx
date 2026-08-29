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

const WEB_APP_URL = 'https://siaga-pi.vercel.app'
const DRIVE_URL = 'https://drive.google.com/drive/folders/1RMOtTkinfgmxTGujOMI0jNNDwW7Yp6jX'
const MOBILE_APP_URL = 'https://drive.google.com/drive/folders/1RMOtTkinfgmxTGujOMI0jNNDwW7Yp6jX'
const PUBLIC_LANDING_PAGE = 'https://siaga-pi.vercel.app/@niaga'
const PUBLIC_STALL_DEMO = 'https://siaga-pi.vercel.app/lapak/30/NGD-0207'

const DEMO_ACCOUNTS: AccountRow[] = [
  { role: 'ADMIN', roleBadge: 'Superadmin', nama: 'Super Admin', email: 'admin@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: '#superadmin/dashboard — kelola semua pasar, petugas, lapak, retribusi, pengguna, impersonate' },
  { role: 'MARKET_HEAD', roleBadge: 'Kepala Pasar', nama: 'Kepala Pasar', email: 'kepala@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: '#market/dashboard — dashboard pasar, kelola lapak, petugas, retribusi & transaksi pasar miliknya' },
  { role: 'OFFICER', roleBadge: 'Petugas', nama: 'Petugas Lapangan', email: 'petugas@siaga.id', password: 'DemiSiaga2026!', platform: 'Mobile', akses: 'Aplikasi mobile — scan QR lapak, catat transaksi retribusi, absensi, setoran harian' },
  { role: 'TREASURER', roleBadge: 'Bendahara', nama: 'Bendahara', email: 'bendahara@siaga.id', password: 'DemiSiaga2026!', platform: 'Web', akses: 'Web dashboard — verifikasi/approve setoran petugas, rekonsiliasi' },
]

const navItems = [
  { label: 'Overview', href: '#juri-overview' },
  { label: 'Publik', href: '#juri-publik' },
  { label: 'Akun', href: '#juri-akun' },
  { label: 'Unduh', href: '#juri-download' },
  { label: 'Fitur', href: '#juri-fitur' },
]

const summaryMetrics = [
  { label: 'Peserta ditugaskan', value: '18', meta: '+3 minggu ini', tone: 'blue' },
  { label: 'Sudah dinilai', value: '12', meta: '67% selesai', tone: 'green' },
  { label: 'Draft', value: '3', meta: 'Perlu review', tone: 'amber' },
  { label: 'Status panel', value: 'Aktif', meta: 'Ready to judge', tone: 'slate' },
]

const contestantList = [
  { id: '#023', name: 'Pasar Niaga Daya', status: 'Belum dinilai', accent: 'pending' },
  { id: '#018', name: 'Pasar Sekar Wangi', status: 'Draft', accent: 'draft' },
  { id: '#011', name: 'Pasar Manggala', status: 'Submitted', accent: 'done' },
  { id: '#007', name: 'Pasar Suka Maju', status: 'Submitted', accent: 'done' },
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
            <span className="juri-brand-subtitle">Juri Workspace</span>
          </div>
        </div>

        <nav className="juri-header-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>

        <div className="juri-user-pill" aria-label="Current judge profile">
          <div className="juri-avatar">J</div>
          <div>
            <strong>Tim Juri</strong>
            <small>Panel Penilai</small>
          </div>
        </div>
      </header>

      <main className="juri-page">
        <section id="juri-overview" className="juri-hero-card">
          <div className="juri-hero-copy">
            <p className="juri-kicker">PIDI DIGDAYA Hackathon 2026 · Live Demo</p>
            <h1>Juri Dashboard SIAGA</h1>
            <p className="juri-hero-text">
              Platform penilaian digital untuk memantau peserta, menilai performa pasar,
              dan memastikan proses evaluasi berjalan jelas, akuntabel, dan cepat.
            </p>

            <div className="juri-cta-row">
              <a className="juri-btn juri-btn-primary" href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">
                Akses Web App
              </a>
              <a className="juri-btn juri-btn-secondary" href={PUBLIC_LANDING_PAGE} target="_blank" rel="noopener noreferrer">
                Lihat Landing Page
              </a>
            </div>
          </div>

          <div className="juri-status-panel">
            <div className="juri-status-header">
              <span className="status-dot" aria-hidden="true" />
              <span>Aktif</span>
            </div>

            <div className="juri-session-block">
              <small>Session saat ini</small>
              <strong>Penilaian Pasar Niaga Daya</strong>
            </div>

            <div className="juri-progress-block">
              <div className="juri-progress-meta">
                <span>68% selesai</span>
                <span>12/18 peserta</span>
              </div>
              <div className="juri-progress-bar" aria-label="Progress penilaian">
                <span style={{ width: '68%' }} />
              </div>
            </div>
          </div>
        </section>

        <section className="juri-summary-grid" aria-label="Overview metrics">
          {summaryMetrics.map((metric) => (
            <div key={metric.label} className={`juri-metric-card juri-metric-${metric.tone}`}>
              <small>{metric.label}</small>
              <strong>{metric.value}</strong>
              <span>{metric.meta}</span>
            </div>
          ))}
        </section>

        <section className="juri-workbench">
          <aside className="juri-sidebar" aria-label="Contestants list">
            <div className="juri-card juri-card-compact">
              <div className="juri-card-header">
                <h3>Kontestan aktif</h3>
                <span className="pill pill-neutral">18 total</span>
              </div>

              <div className="juri-contestant-list">
                {contestantList.map((contestant) => (
                  <button key={contestant.id} type="button" className="juri-contestant-item">
                    <div>
                      <strong>{contestant.id}</strong>
                      <span>{contestant.name}</span>
                    </div>
                    <span className={`tag tag-${contestant.accent}`}>{contestant.status}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="juri-main-column">
            <section className="juri-card" id="juri-publik">
              <SectionTitle
                id="juri-public-title"
                title="Halaman publik"
                subtitle="Contoh akses terbuka untuk melihat bagaimana pasar dan lapak ditampilkan ke publik."
              />

              <div className="juri-public-grid">
                <div className="juri-public-card">
                  <div className="juri-feature-icon">🏪</div>
                  <h3>Landing Page Pasar</h3>
                  <p>Menampilkan profil pasar, deskripsi, highlight, serta informasi umum yang dapat diakses masyarakat.</p>
                  <a href={PUBLIC_LANDING_PAGE} target="_blank" rel="noopener noreferrer">Lihat landing page Niaga Daya →</a>
                </div>

                <div className="juri-public-card">
                  <div className="juri-feature-icon">🏬</div>
                  <h3>Detail Lapak</h3>
                  <p>Halaman publik untuk melihat detail lapak tertentu, termasuk pemilik, lokasi, sektor, dan status operasional.</p>
                  <a href={PUBLIC_STALL_DEMO} target="_blank" rel="noopener noreferrer">Lihat lapak NGD-0207 →</a>
                </div>
              </div>
            </section>

            <section className="juri-card" id="juri-tentang">
              <SectionTitle
                id="juri-about"
                title="Tentang aplikasi"
                subtitle="Masalah yang dipecahkan dan solusi yang dibuat melalui SIAGA."
              />

              <div className="juri-info-grid">
                <div className="juri-info-item">
                  <h3>💡 Masalah</h3>
                  <p>Pengelolaan retribusi pasar masih sering dilakukan secara manual dan terpencar, sehingga berpotensi kehilangan data dan sulit diaudit.</p>
                </div>
                <div className="juri-info-item">
                  <h3>🚀 Solusi</h3>
                  <p>SIAGA mengintegrasikan pencatatan transaksi, verifikasi setoran, dan monitoring pasar ke dalam satu ekosistem yang lebih transparan.</p>
                </div>
                <div className="juri-info-item">
                  <h3>🎯 Dampak</h3>
                  <p>Pengelolaan pasar menjadi lebih akuntabel, cepat, dan mudah dipantau oleh kepala pasar, bendahara, serta pihak yang berkepentingan.</p>
                </div>
              </div>
            </section>

            <section className="juri-card" id="juri-akun">
              <SectionTitle
                id="juri-accounts"
                title="Akun demo"
                subtitle="Gunakan akun di bawah untuk mengecek pengalaman per role dalam platform SIAGA."
              />

              <div className="juri-table-wrap">
                <table className="juri-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Password</th>
                      <th>Platform</th>
                      <th>Akses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_ACCOUNTS.map((account) => (
                      <tr key={account.role}>
                        <td>
                          <span className={`juri-role-badge juri-role-${account.role.toLowerCase()}`}>{account.roleBadge}</span>
                          <div className="juri-role-code">{account.role}</div>
                        </td>
                        <td>{account.nama}</td>
                        <td><code>{account.email}</code></td>
                        <td><code>{account.password}</code></td>
                        <td>{account.platform}</td>
                        <td className="juri-akses">{account.akses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="juri-card" id="juri-download">
              <SectionTitle
                id="juri-download-title"
                title="Download & akses"
                subtitle="Semua jalur akses cepat untuk web, mobile, dan dokumentasi pendukung."
              />

              <div className="juri-download-grid">
                <div className="juri-download-card">
                  <div className="juri-feature-icon">🌐</div>
                  <h3>Web App</h3>
                  <p>Platform untuk admin dan kepala pasar dalam memantau transaksi serta seluruh operasional pasar.</p>
                  <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer">Buka web app →</a>
                </div>

                <div className="juri-download-card">
                  <div className="juri-feature-icon">📱</div>
                  <h3>Mobile Demo</h3>
                  <p>Digunakan khusus untuk petugas lapangan dalam proses pencatatan transaksi dan setoran harian.</p>
                  <a href={MOBILE_APP_URL} target="_blank" rel="noopener noreferrer">Buka mobile demo →</a>
                </div>

                <div className="juri-download-card">
                  <div className="juri-feature-icon">📁</div>
                  <h3>Google Drive</h3>
                  <p>Dokumentasi, arsip demo, dan file pendukung proyek yang bisa diakses secara langsung.</p>
                  <a href={DRIVE_URL} target="_blank" rel="noopener noreferrer">Buka Google Drive →</a>
                </div>
              </div>
            </section>

            <section className="juri-card" id="juri-fitur">
              <SectionTitle
                id="juri-features"
                title="Fitur utama"
                subtitle="Kemampuan utama yang membuat SIAGA bersifat operasional, aman, dan siap dipakai dalam dunia nyata."
              />

              <div className="juri-feature-grid">
                <div className="juri-feature">
                  <div className="juri-feature-icon">📱</div>
                  <h3>Aplikasi Mobile Petugas</h3>
                  <p>Scan QR lapak, catat transaksi retribusi, absensi, dan setoran dengan dukungan mode offline.</p>
                </div>
                <div className="juri-feature">
                  <div className="juri-feature-icon">🖥️</div>
                  <h3>Web Admin</h3>
                  <p>Dashboard multi-role dengan akses yang dibatasi sesuai kebutuhan setiap pengguna.</p>
                </div>
                <div className="juri-feature">
                  <div className="juri-feature-icon">🔒</div>
                  <h3>Keamanan RLS</h3>
                  <p>Setiap role hanya melihat data yang sesuai dengan lingkup dan kewenangannya.</p>
                </div>
                <div className="juri-feature">
                  <div className="juri-feature-icon">📊</div>
                  <h3>Dashboard Real-time</h3>
                  <p>Data pendapatan, setoran, dan kondisi pasar dapat dimonitor secara lebih cepat dan akurat.</p>
                </div>
                <div className="juri-feature">
                  <div className="juri-feature-icon">🧾</div>
                  <h3>Setoran & Rekonsiliasi</h3>
                  <p>Setoran petugas diverifikasi oleh bendahara dan dimonitor oleh kepala pasar dengan lebih jelas.</p>
                </div>
                <div className="juri-feature">
                  <div className="juri-feature-icon">🏪</div>
                  <h3>Halaman Publik</h3>
                  <p>Landing page dan detail lapak dibuat terbuka untuk menjamin transparansi terhadap masyarakat.</p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  )
}


