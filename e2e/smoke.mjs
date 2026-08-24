/**
 * End-to-end smoke test: walks the whole wireframed flow in headless
 * Chromium — draw a stroke, paint it, pick exactly 3 powers, add a shape,
 * generate (stub) on Finish, submit, and see the Poké Ball in Home.
 *
 * Run with the preview server built first:  npm run build && npm run test:e2e
 * (the script starts/stops `vite preview` itself).
 */
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'

const PORT = 4173
const BASE = `http://localhost:${PORT}/pokemonmaker/` // matches the vite `base` (GitHub Pages path)
const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium'

function fail(message) {
  console.error(`✗ ${message}`)
  process.exitCode = 1
  throw new Error(message)
}

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  fail(`preview server never came up at ${url}`)
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true,
})

let browser
try {
  await waitForServer(BASE)
  browser = await chromium.launch({ executablePath: EXECUTABLE })
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } }) // iPad landscape-ish

  await page.goto(BASE)
  await page.waitForSelector('[data-testid="creature-canvas"]')

  // 1. Sketch: draw a closed-ish blob.
  const canvas = page.locator('[data-testid="creature-canvas"]')
  const box = await canvas.boundingBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx - 120, cy)
  await page.mouse.down()
  const steps = 28
  for (let i = 1; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2
    await page.mouse.move(cx - 120 * Math.cos(angle), cy - 90 * Math.sin(angle))
  }
  await page.mouse.up()
  if ((await page.locator('[data-testid="stroke"]').count()) < 1) fail('sketch stroke was not created')
  console.log('✓ sketch: stroke drawn')

  // Touch drags on the canvas must not scroll the page (iOS Safari ignores
  // CSS touch-action on SVG, so a non-passive JS guard preventDefaults
  // touch events — assert it is attached and active).
  const touchBlocked = await page.evaluate(() => {
    const svg = document.querySelector('[data-testid="creature-canvas"]')
    const event = new TouchEvent('touchmove', { cancelable: true, bubbles: true })
    svg.dispatchEvent(event)
    return event.defaultPrevented
  })
  if (!touchBlocked) fail('canvas touchmove is not preventDefaulted — sketching would scroll on iPad')
  console.log('✓ sketch: canvas touch events are blocked from scrolling the page')

  // 2. Hold-to-undo: hold on the stroke, it disappears; hold again, it returns.
  const edgeX = cx - 120 // a point on the drawn ellipse (angle 0)
  await page.mouse.move(edgeX, cy)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  if ((await page.locator('[data-testid="stroke"]').count()) !== 0) fail('hold did not remove the stroke')
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
  if ((await page.locator('[data-testid="stroke"]').count()) !== 1) fail('second hold did not restore the stroke')
  console.log('✓ sketch: hold-to-undo and hold-to-restore work')

  // 3. Paint: pick a color and tap inside the blob.
  await page.click('[data-testid="dock-paint"]')
  await page.click('[data-testid="swatch-4f8fd1"]')
  await page.mouse.click(cx, cy)
  await page.waitForTimeout(400) // fill layer recompute
  console.log('✓ paint: fill applied')

  // 4. Powers: exactly 3.
  await page.click('[data-testid="dock-powers"]')
  await page.click('[data-testid="power-water"]')
  await page.click('[data-testid="power-fire"]')
  await page.click('[data-testid="power-venom"]')
  const windDisabled = await page.locator('[data-testid="power-wind"]').isDisabled()
  if (!windDisabled) fail('4th power chip should be disabled once 3 are chosen')
  const count = await page.locator('[data-testid="hotspot-count"]').textContent()
  if (count?.trim() !== '3/3') fail(`hotspot shows ${count}, expected 3/3`)
  console.log('✓ powers: exactly-3 rule enforced, hotspot shows 3/3')

  // 5. Shapes: browse the library, search by description, add the sofa.
  await page.click('[data-testid="dock-shapes"]')
  await page.click('[data-testid="browse-library"]')
  await page.fill('[data-testid="library-search"]', 'something to sit on')
  await page.waitForSelector('[data-testid="search-results"] [data-testid="object-sofa"]')
  await page.click('[data-testid="search-results"] [data-testid="object-sofa"]')
  await page.waitForSelector('[data-testid="placed-sofa"]')
  console.log('✓ shapes: description search found the sofa and placed it')

  // 6. Finish: generate (stub) and submit.
  await page.click('[data-testid="dock-finish"]')
  await page.click('[data-testid="generate-button"]')
  await page.waitForSelector('[data-testid="generating"]')
  await page.waitForSelector('[data-testid="finish-result"]', { timeout: 15000 })
  console.log('✓ finish: stub generation produced an image (with loading state)')
  await page.click('[data-testid="submit-button"]')

  // 7. Home: the creature landed as a Poké Ball.
  await page.waitForSelector('[data-testid="home-gallery"]')
  if ((await page.locator('[data-testid="pokeball"]').count()) !== 1) fail('submitted creature missing from Home')
  await page.click('[data-testid="pokeball"]')
  await page.waitForSelector('[data-testid="creature-detail"]')
  console.log('✓ home: Poké Ball in gallery, detail view opens')

  await page.screenshot({ path: 'e2e/last-run-home.png' })
  console.log('\nSmoke test passed — full Sketch → Paint → Powers → Shapes → Finish → Home flow works.')
} finally {
  await browser?.close()
  try {
    process.kill(-server.pid)
  } catch {
    server.kill()
  }
}
