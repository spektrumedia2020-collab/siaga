export interface ImageCompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxBytes?: number
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(data)
  const array = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i)
  }

  return new Blob([array], { type: mime })
}

export async function compressImageFile(file: File, options: ImageCompressionOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }

  const maxWidth = options.maxWidth ?? 1200
  const maxHeight = options.maxHeight ?? 1200
  const maxBytes = options.maxBytes ?? 700 * 1024
  let quality = options.quality ?? 0.8

  const imageUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Gagal membaca gambar'))
      img.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    let width = image.width
    let height = image.height
    const ratio = Math.min(maxWidth / width, maxHeight / height, 1)

    width = Math.max(1, Math.round(width * ratio))
    height = Math.max(1, Math.round(height * ratio))

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      return file
    }

    context.drawImage(image, 0, 0, width, height)

    const mimeType = file.type.includes('png') ? 'image/png' : 'image/jpeg'
    let dataUrl = canvas.toDataURL(mimeType, quality)
    let blob = dataUrlToBlob(dataUrl)

    while (blob.size > maxBytes && quality > 0.5) {
      quality -= 0.1
      dataUrl = canvas.toDataURL(mimeType, quality)
      blob = dataUrlToBlob(dataUrl)
    }

    const fileName = file.name.replace(/\.[^/.]+$/, '') + `.${mimeType === 'image/png' ? 'png' : 'jpg'}`
    return new File([blob], fileName, { type: mimeType, lastModified: Date.now() })
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}
