import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import './ContactSettingsPage.css'

export function ContactSettingsPage() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'contact_phone')
        .maybeSingle()

      if (error) {
        setMessage(`Gagal memuat pengaturan: ${error.message}`)
        setIsError(true)
      } else {
        setPhone(data?.value || '')
      }
      setLoading(false)
    }

    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setIsError(false)

    const trimmed = phone.trim()
    if (trimmed && trimmed.replace(/\D/g, '').length < 8) {
      setMessage('Nomor kontak tidak valid')
      setIsError(true)
      return
    }

    setSaving(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: 'contact_phone', value: trimmed || null, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
      if (error) throw error
      setMessage('Nomor kontak admin tersimpan.')
    } catch (err: any) {
      setMessage(err?.message || 'Gagal menyimpan nomor kontak')
      setIsError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="contact-settings-page">
      <div className="contact-settings-card">
        <h2>Kontak Bantuan</h2>
        <p>
          Nomor ini ditampilkan di halaman pemilik lapak untuk tombol WhatsApp/Telepon, terutama saat
          nomor HP pemilik belum terdaftar. Nomor khusus per pasar (jika diisi di <strong>Edit Pasar</strong>)
          akan dipakai lebih dulu; nomor ini menjadi cadangan untuk semua pasar.
        </p>

        {loading ? (
          <p className="contact-settings-muted">Memuat pengaturan...</p>
        ) : (
          <form className="contact-settings-form" onSubmit={handleSubmit}>
            <label htmlFor="admin-contact-phone">Nomor Kontak Admin</label>
            <input
              id="admin-contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx (WhatsApp/telepon)"
            />
            <button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            {message && (
              <p className={isError ? 'contact-settings-error' : 'contact-settings-success'}>{message}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
