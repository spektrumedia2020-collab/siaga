import { useState, useRef } from 'react'
import QRCode from 'react-qr-code'

interface Props {
  value: string
  label?: string
  size?: number
}

export function QRCodeGenerator({ value, label, size = 160 }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const downloadPNG = () => {
    try {
      const svg = containerRef.current?.querySelector('svg') as SVGSVGElement | null
      if (!svg) return

      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svg)
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const pngUrl = canvas.toDataURL('image/png')
          const link = document.createElement('a')
          link.href = pngUrl
          link.download = `${(label || 'qr').replace(/\s+/g, '_')}.png`
          document.body.appendChild(link)
          link.click()
          link.remove()
        }
        URL.revokeObjectURL(url)
      }
      img.onerror = () => URL.revokeObjectURL(url)
      img.src = url
    } catch (e) {
      // ignore
    }
  }

  return (
    <>
      <button
        className="btn-qr"
        onClick={() => setOpen(true)}
        title="Tampilkan QR"
        style={{ padding: 6, borderRadius: 6 }}
      >
        🔳
      </button>

      {open && (
        <div
          className="qr-modal"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            className="qr-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              padding: 20,
              borderRadius: 8,
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            {label && <h4 style={{ marginTop: 0 }}>{label}</h4>}
            <div style={{ display: 'inline-block', padding: 8, background: '#fff' }} ref={containerRef}>
              <QRCode value={value} size={size} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={downloadPNG} className="btn-secondary">
                Unduh PNG
              </button>
              <button onClick={() => setOpen(false)} className="btn-primary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default QRCodeGenerator
