import { rgbToHex } from '../../engine/color.ts'

/*
 * Photo handling, entirely in the browser: the picture is scaled down,
 * re-encoded, and its main colour is read. Nothing is uploaded anywhere.
 */

const MAX_SIDE = 720
const SAMPLE_SIDE = 24

export interface ProcessedPhoto {
  /** The scaled-down image, ready to store. */
  blob: Blob
  /** The average colour of the middle of the picture, as "#rrggbb". */
  color: string
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
      'image/webp',
      0.82,
    )
  })
}

/** Averages the pixels in the middle half of the image, where the garment usually is. */
export function averageCenterColor(pixels: Uint8ClampedArray, side: number): string {
  const from = Math.floor(side / 4)
  const to = Math.ceil((side * 3) / 4)
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let y = from; y < to; y += 1) {
    for (let x = from; x < to; x += 1) {
      const offset = (y * side + x) * 4
      r += pixels[offset] ?? 0
      g += pixels[offset + 1] ?? 0
      b += pixels[offset + 2] ?? 0
      count += 1
    }
  }
  return count === 0 ? '#808080' : rgbToHex(r / count, g / count, b / count)
}

export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await toBlob(canvas)

  // A tiny copy is enough to read the main colour.
  const sample = document.createElement('canvas')
  sample.width = SAMPLE_SIDE
  sample.height = SAMPLE_SIDE
  const sampleContext = sample.getContext('2d')
  if (!sampleContext) throw new Error('Canvas is not available')
  sampleContext.drawImage(bitmap, 0, 0, SAMPLE_SIDE, SAMPLE_SIDE)
  const { data } = sampleContext.getImageData(0, 0, SAMPLE_SIDE, SAMPLE_SIDE)
  bitmap.close()

  return { blob, color: averageCenterColor(data, SAMPLE_SIDE) }
}
