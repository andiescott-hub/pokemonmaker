import Anthropic from '@anthropic-ai/sdk'
import { buildImagePrompt, type CreatureAnalysis } from './prompt'

export interface Env {
  ANTHROPIC_API_KEY: string
  GEMINI_API_KEY: string
  /** Shared code the app must send. Stops strangers spending your API credit. */
  ACCESS_CODE: string
  ALLOWED_ORIGIN: string
}

interface GenerateRequest {
  /** The child's drawing, as a PNG data URL. */
  image: string
  /** Power ids chosen for the creature (exactly 3). */
  powers: string[]
  accessCode: string
}

/* ────────────────────────────────────────────────────────────────────────
 * GEMINI CONFIG — the most likely thing to need adjusting if Google
 * changes their image API. Everything Gemini-specific lives in this block.
 * ──────────────────────────────────────────────────────────────────────── */
const GEMINI = {
  model: 'gemini-3.1-flash-image',
  endpoint: (model: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  /** Build the request body: prompt text + the child's drawing as reference. */
  body: (prompt: string, imageBase64: string) => ({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: imageBase64 } }],
      },
    ],
    generationConfig: { responseModalities: ['IMAGE'] },
  }),
  /** Pull the generated image out of the response. */
  extractImage: (json: any): string | null => {
    const parts = json?.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      const data = part?.inlineData?.data ?? part?.inline_data?.data
      if (data) return data
    }
    return null
  },
}

const ANALYSIS_SYSTEM = `You are looking at a drawing made by a child in a creature-maker app.

Your job is to work out what creature they were trying to draw, and describe
it so an illustrator could draw a polished version of the SAME creature.

Rules:
- Take the child's intent completely seriously. They may have invented
  something that is not a real animal (a tortoise with four arms, a blob with
  wheels) — that is the point. Describe what they meant, not what it
  resembles by accident.
- Never describe the drawing as crude, childish, rough, badly drawn, or
  simple. Describe the CREATURE, not the drawing quality.
- Keep the child's actual choices: their colours, the number of limbs, the
  overall body shape, and any objects attached to the creature.
- If an everyday object is attached (a couch, a hat, a balloon), treat it as
  genuinely part of the creature's body.`

/** Ask Claude what the child drew. */
async function analyseDrawing(
  env: Env,
  imageBase64: string,
  powers: string[],
): Promise<CreatureAnalysis> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 2000,
    system: ANALYSIS_SYSTEM,
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            creatureName: {
              type: 'string',
              description: 'A short, fun name for this creature, 1-3 words.',
            },
            description: {
              type: 'string',
              description:
                'One or two sentences a child would enjoy hearing, describing what this creature is.',
            },
            keyFeatures: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Concrete visual features to preserve: body shape, colours, limb count, attached objects.',
            },
          },
          required: ['creatureName', 'description', 'keyFeatures'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
          {
            type: 'text',
            text: `What creature did this child draw? Its chosen elemental powers are: ${
              powers.join(', ') || 'none yet'
            }. Weave those powers into the description as visual details.`,
          },
        ],
      },
    ],
  })

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') throw new Error('Claude returned no text block')
  return JSON.parse(text.text) as CreatureAnalysis
}

/**
 * Ask Gemini to render the finished creature, using the drawing as
 * reference. Retries once on a transient failure — a rate limit or a 5xx
 * shouldn't cost a child their creature, and the paid tier's per-minute
 * limit is easy to brush against when regenerating.
 */
async function generateImage(env: Env, prompt: string, imageBase64: string): Promise<string> {
  const attempt = async (): Promise<string> => {
    const response = await fetch(`${GEMINI.endpoint(GEMINI.model)}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(GEMINI.body(prompt, imageBase64)),
    })

    const json = await response.json<any>()
    if (!response.ok) {
      const error = new Error(`Gemini ${response.status}: ${JSON.stringify(json).slice(0, 600)}`)
      // 429 = rate limited, 5xx = their side. Both are worth one retry.
      ;(error as { retryable?: boolean }).retryable = response.status === 429 || response.status >= 500
      throw error
    }
    const image = GEMINI.extractImage(json)
    if (!image) {
      throw new Error(`Gemini returned no image. Response: ${JSON.stringify(json).slice(0, 600)}`)
    }
    return image
  }

  try {
    return await attempt()
  } catch (error) {
    if (!(error as { retryable?: boolean }).retryable) throw error
    console.warn('gemini transient failure, retrying once:', (error as Error).message)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return attempt()
  }
}

const corsHeaders = (env: Env) => ({
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400',
})

const json = (env: Env, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(env) },
  })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }
    if (request.method !== 'POST') {
      return json(env, { error: 'POST only' }, 405)
    }

    let body: GenerateRequest
    try {
      body = await request.json<GenerateRequest>()
    } catch {
      return json(env, { error: 'Invalid JSON' }, 400)
    }

    if (!env.ACCESS_CODE || body.accessCode !== env.ACCESS_CODE) {
      return json(env, { error: 'Wrong or missing access code' }, 401)
    }
    if (typeof body.image !== 'string' || !body.image.startsWith('data:image/')) {
      return json(env, { error: 'image must be a PNG data URL' }, 400)
    }

    const imageBase64 = body.image.replace(/^data:image\/\w+;base64,/, '')
    const powers = Array.isArray(body.powers) ? body.powers.map(String) : []

    let analysis: CreatureAnalysis
    try {
      analysis = await analyseDrawing(env, imageBase64, powers)
    } catch (error) {
      // Without the analysis there is nothing useful to return.
      const message = error instanceof Error ? error.message : String(error)
      console.error('analysis failed:', message)
      return json(env, { error: message }, 502)
    }

    // The image step is allowed to fail. A child should still get their
    // creature named and described rather than a dead end, and we have
    // already paid for the analysis. The app falls back to compositing
    // their own drawing when `image` is null.
    try {
      const image = await generateImage(env, buildImagePrompt(analysis, powers), imageBase64)
      return json(env, {
        creatureName: analysis.creatureName,
        description: analysis.description,
        image: `data:image/png;base64,${image}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('image generation failed:', message)
      return json(env, {
        creatureName: analysis.creatureName,
        description: analysis.description,
        image: null,
        imageError: message,
      })
    }
  },
}
