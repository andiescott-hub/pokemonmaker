/**
 * One-command smoke test for the deployed worker.
 *
 *   node test-local.mjs https://creature-maker.<you>.workers.dev <access-code>
 *
 * Sends a tiny test drawing and prints what came back. If the Gemini call
 * needs adjusting, the error message here names exactly what went wrong.
 */
const [, , url, accessCode] = process.argv
if (!url || !accessCode) {
  console.error('Usage: node test-local.mjs <worker-url> <access-code>')
  process.exit(1)
}

// A minimal PNG: a black-outlined blob on white, base64-encoded.
const canvas = `iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAB4ElEQVR4nO3dsW3DMBBA0S+
QAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJ
BkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA
6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAd
IkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBki
TAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJ
BkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA
6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAd
IkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBki
TAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJ
BkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdIkA6RJBkiTAdLkD6ZLBWDkA9pYAAAAAElFTkSuQmCC`.replace(/\s/g, '')

console.log(`POSTing a test drawing to ${url} …`)
const started = Date.now()
const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    image: `data:image/png;base64,${canvas}`,
    powers: ['water', 'fire', 'electricity'],
    accessCode,
  }),
})

const body = await res.json().catch(() => ({ error: 'response was not JSON' }))
const seconds = ((Date.now() - started) / 1000).toFixed(1)

if (!res.ok) {
  console.error(`\n✗ HTTP ${res.status} after ${seconds}s`)
  console.error(body.error ?? body)
  console.error('\nPaste this error back to Claude to get it fixed.')
  process.exit(1)
}

console.log(`\n✓ Worked in ${seconds}s`)
console.log(`  Creature name: ${body.creatureName}`)
console.log(`  Description:   ${body.description}`)
console.log(`  Image:         ${body.image ? `${Math.round(body.image.length / 1024)}KB data URL` : 'MISSING'}`)
if (!body.image) process.exit(1)
