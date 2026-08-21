import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import png2icons from 'png2icons'

const root = process.cwd()
const svgPath = resolve(root, 'build/icons/source/rowport-icon.svg')
const svg = readFileSync(svgPath)

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

/**
 * @param {number} size
 * @returns {Promise<Buffer>}
 */
async function renderPng(size) {
  return sharp(svg, { density: (72 * size) / 1024 })
    .resize(size, size)
    .png()
    .toBuffer()
}

/**
 * @returns {Promise<void>}
 */
async function main() {
  const icoPngs = await Promise.all(ICO_SIZES.map(renderPng))
  const ico = await pngToIco(icoPngs)
  writeFileSync(resolve(root, 'resources/icon.ico'), ico)
  writeFileSync(resolve(root, 'build/icon.ico'), ico)

  const icon512 = await renderPng(512)
  writeFileSync(resolve(root, 'resources/icon.png'), icon512)

  const icon1024 = await renderPng(1024)
  writeFileSync(resolve(root, 'build/icon.png'), icon1024)

  const icns = png2icons.createICNS(icon1024, png2icons.BILINEAR, 0)
  if (!icns) {
    throw new Error('Failed to generate ICNS')
  }
  writeFileSync(resolve(root, 'build/icon.icns'), icns)

  console.log('Icons generated from build/icons/source/rowport-icon.svg')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
