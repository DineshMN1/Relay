// Generates simple orange square PNG icons for PWA
// Run: node scripts/gen-icons.mjs

import { writeFileSync } from 'fs'
import { createCanvas } from 'canvas'

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  const r = size * 0.18
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  // Text
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.45}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('R', size / 2, size / 2)

  const buffer = canvas.toBuffer('image/png')
  writeFileSync(outputPath, buffer)
  console.log(`Created ${outputPath}`)
}

generateIcon(192, 'public/icon-192.png')
generateIcon(512, 'public/icon-512.png')
