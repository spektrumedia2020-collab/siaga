import { useState, useRef } from 'react'
import type { ReactNode } from 'react'
import QRCode from 'react-qr-code'
import { IconQr } from './Icons'
import './QRCodeGenerator.css'

interface Props {
  value: string
  heading?: string
  label?: string
  hint?: string
  size?: number
  icon?: ReactNode
  title?: string
}

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const fileBase = (text: string) => (text || 'qr').replace(/[^A-Za-z0-9._-]+/g, '_')

export function QRCodeGenerator({ value, heading, label, hint, size = 260, icon, title }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const buildExport = () => {
    const svg = containerRef.current?.querySelector('svg') as SVGSVGElement | null
    if (!svg) return null

    // Export at a print-friendly resolution regardless of the on-screen size.
    const qrSize = Math.max(size * 4, 800)
    const modules = svg.viewBox?.baseVal?.width || 0
    const margin = modules > 0 ? Math.round((qrSize / modules) * 4) : Math.round(qrSize * 0.08)
    const outerSize = qrSize + margin * 2

    const headingText = heading?.trim() || ''
    const labelText = label?.trim() || ''
    const headingHeight = headingText ? Math.round(outerSize * 0.1) : 0
    const labelHeight = labelText ? Math.round(outerSize * 0.09) : 0
    const totalHeight = headingHeight + outerSize + labelHeight

    const qr = svg.cloneNode(true) as SVGSVGElement
    qr.setAttribute('x', String(margin))
    qr.setAttribute('y', String(headingHeight + margin))
    qr.setAttribute('width', String(qrSize))
    qr.setAttribute('height', String(qrSize))

    const parts = [
      `<rect width="${outerSize}" height="${totalHeight}" fill="#ffffff"/>`,
      headingText
        ? `<text x="${outerSize / 2}" y="${Math.round(headingHeight * 0.66)}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="${Math.round(outerSize * 0.05)}" fill="#111111">${escapeXml(headingText)}</text>`
        : '',
      new XMLSerializer().serializeToString(qr),
      labelText
        ? `<text x="${outerSize / 2}" y="${Math.round(headingHeight + outerSize + labelHeight * 0.58)}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="${Math.round(outerSize * 0.045)}" fill="#111111">${escapeXml(labelText)}</text>`
        : ''
    ]

    return {
      markup: `<svg xmlns="http://www.w3.org/2000/svg" width="${outerSize}" height="${totalHeight}" viewBox="0 0 ${outerSize} ${totalHeight}">${parts.join('')}</svg>`,
      width: outerSize,
      height: totalHeight
    }
  }

  const triggerDownload = (href: string, filename: string) => {
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const downloadPNG = () => {
    const built = buildExport()
    if (!built) return
    const blob = new Blob([built.markup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = built.width
      canvas.height = built.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        triggerDownload(canvas.toDataURL('image/png'), `${fileBase(label || heading || 'qr')}.png`)
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const downloadSVG = () => {
    const built = buildExport()
    if (!built) return
    const blob = new Blob([built.markup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, `${fileBase(label || heading || 'qr')}.svg`)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <button
        className="btn-qr"
        onClick={() => setOpen(true)}
        title={title || 'Tampilkan QR'}
        aria-label={title || 'Tampilkan QR'}
      >
        {icon ?? <IconQr />}
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
            {heading && <h3 className="qr-modal-heading">{heading}</h3>}
            <div style={{ display: 'inline-block', padding: 16, background: '#fff' }} ref={containerRef}>
              <QRCode value={value} size={size} level="M" bgColor="#ffffff" fgColor="#000000" />
            </div>
            {label && <h4 style={{ marginTop: 12, marginBottom: 0 }}>{label}</h4>}
            <p className="qr-modal-hint">{hint || 'Pindai dengan kamera atau Google Lens.'}</p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigator.clipboard?.writeText(value)} className="btn-secondary">
                Salin link
              </button>
              <button onClick={downloadPNG} className="btn-primary">
                Unduh PNG
              </button>
              <button onClick={downloadSVG} className="btn-secondary">
                Unduh SVG
              </button>
              <button onClick={() => setOpen(false)} className="btn-secondary">
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
