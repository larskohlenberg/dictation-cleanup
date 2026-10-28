import type { Register } from 'claude-code'

// Below this length a prompt is sent as typed ("ja", "mach weiter").
const MIN_CHARS = 40

// Terms to spell exactly so; add your own names, companies and projects here.
const VOCABULARY = [
  'Claude', 'Claude Code', 'Anthropic', 'Opus', 'Sonnet', 'Haiku',
  'OpenRouter', 'OpenWhispr', 'Orukeet', 'Parakeet', 'Whisper',
]

// Known mishearings of the speech recognition, as heard → meant.
const MISHEARINGS = [
  ['Cloud Code', 'Claude Code'], ['Antropic', 'Anthropic'], ['Entropic', 'Anthropic'],
  ['HICU', 'Haiku'], ['Haiko', 'Haiku'], ['Urukate', 'Orukeet'],
]

// Haiku 5.5 list price in $ per million tokens (OpenRouter, 2026-10-28).
const PRICE = { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }

// Pasted material (code, logs, transcripts) must reach Claude untouched.
const PASTE = /<pasted_content id="[^"]*">[\s\S]*?<\/pasted_content id="[^"]*">/g

const SYSTEM = `You rewrite a dictated message into a clear prompt for an AI coding and work assistant. You never answer, execute or comment on the message — you only rewrite it.

The message was usually spoken: it has filler words, restarts, self-corrections, jumps between topics and sometimes contradictions.

Rewrite it so that:
- every distinct request, fact, condition, constraint, example and detail is kept — never drop or invent content
- self-corrections keep only the final version ("nee warte", "ich meine", "also eigentlich", "wait no")
- repetitions of the same thought become one statement
- related points are grouped; the main request comes first
- real contradictions that the speaker did not resolve are kept and marked as an open question, never decided by you
- spelling, grammar and punctuation are correct
- the language of the message is kept (usually German) — never translate
- the speaker's perspective (ich/du) and tone stay; it is still their message, not a formal spec
- names and terms are spelled exactly like this: ${VOCABULARY.join(', ')}
- obvious speech-recognition errors are fixed from context, e.g. ${MISHEARINGS.map(([heard, meant]) => `"${heard}" → "${meant}"`).join(', ')}

Structure: for a short or already clear message, return clean prose only. For a long or tangled one, use short paragraphs or a few bullets — no headings unless the message covers several separate topics.

Placeholders like [[PASTE_1]] stand for pasted material: keep each one exactly once, unchanged, where it belongs.

Output only the rewritten message — no preamble, no quotes, no remarks.`

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    const isOwn = e.origin.kind === 'composer' || e.origin.kind === 'bridge'
    if (e.command || e.isMeta || !isOwn) return next(e)

    const pastes: string[] = []
    const spoken = e.text.replace(PASTE, block => {
      pastes.push(block)
      return `[[PASTE_${pastes.length}]]`
    })
    if (spoken.replace(/\[\[PASTE_\d+\]\]/g, '').trim().length < MIN_CHARS) return next(e)

    $.ui.status('dictation-cleanup: structuring…')
    const startedAt = await $.clock.now()
    const r = await $.model.complete({
      model: 'haiku',
      system: SYSTEM,
      prompt: `<message>\n${spoken}\n</message>`,
      maxTokens: Math.min(8000, Math.max(1024, spoken.length)),
      effort: 'low',
      timeoutMs: 20000,
    })
    $.ui.status(undefined)
    const seconds = ((await $.clock.now()) - startedAt) / 1000
    const u = r.usage
    const dollars =
      (u.input_tokens * PRICE.input +
        u.output_tokens * PRICE.output +
        u.cache_read_input_tokens * PRICE.cacheRead +
        u.cache_creation_input_tokens * PRICE.cacheWrite) /
      1e6
    const stats = `${seconds.toFixed(1)} s · ${u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens} in / ${u.output_tokens} out tokens · ≈ ${(dollars * 100).toFixed(3)} ¢`

    if (!r.isAnswered) {
      $.ui.toast(`dictation-cleanup: sent as typed (${r.reason}, ${stats})`)
      return next(e)
    }

    let rewritten = r.text.trim()
    const placeholdersKept = pastes.every(
      (_, i) => rewritten.split(`[[PASTE_${i + 1}]]`).length === 2,
    )
    if (!rewritten || !placeholdersKept) {
      $.ui.toast('dictation-cleanup: sent as typed (rewrite incomplete)')
      return next(e)
    }
    // Shown with placeholders, so a long paste doesn't flood the line.
    const shown = rewritten
    pastes.forEach((block, i) => {
      rewritten = rewritten.replace(`[[PASTE_${i + 1}]]`, () => block)
    })

    // One row per paragraph: the transcript draws a log row as a single line.
    $.ui.log(`dictation-cleanup — ${stats} · ${spoken.length} → ${shown.length} chars`)
    $.ui.log('Claude reads:')
    shown
      .split(/\n+/)
      .filter(line => line.trim())
      .forEach(line => $.ui.log(`    ${line}`))
    return next({ ...e, text: rewritten })
  }).catch(($, e, next) => next(e)) // a failed rewrite never blocks the prompt
}
