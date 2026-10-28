# dictation-cleanup

A Claude Code mod that turns dictated brain dumps into a clear, structured prompt — before Claude reads them.

When you dictate a prompt, it comes out the way people talk: filler words, restarts, self-corrections ("Friday — no wait, Thursday"), jumps between topics, misheard product names. This mod sends each prompt you submit through **Claude Haiku** first and hands Claude the cleaned-up version instead:

- filler words, stutters and false starts removed
- self-corrections resolved to the final version
- repeated thoughts merged, related points grouped, main request first
- unresolved contradictions kept and marked as an open question — never decided for you
- spelling, grammar and punctuation fixed, in the language you spoke (no translation)
- known speech-recognition errors fixed from a vocabulary list ("Cloud Code" → "Claude Code")

Claude only ever sees the rewritten prompt, so it gets a clearer task and fewer tokens.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install dictation-cleanup --marketplace larskohlenberg/dictation-cleanup
```

Answer `y` to add the marketplace, then pick a scope (user scope = all your sessions).

From a shell:

```bash
claude plugin install dictation-cleanup --marketplace larskohlenberg/dictation-cleanup
```

In the Claude Code desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `larskohlenberg/dictation-cleanup`, then **Add plugin**.

Requires a Claude Code version with mod support (built and tested on Claude Code 2.1.309). The mod API is early access and may change between releases.

## What you see

Above each rewritten prompt the transcript shows a few lines (visible to you, not to Claude):

```
dictation-cleanup — 1.4 s · 820 in / 240 out tokens · ≈ 0.020 ¢ · 610 → 430 chars
Claude reads:
    <the rewritten prompt, one line per paragraph>
```

- **time** — how long the Haiku call added to sending your prompt
- **tokens** — as reported by the API for this call
- **cost** — estimated from those tokens at Haiku's list price (see `PRICE` in the code); on a Claude subscription there is no per-call charge, the calls count toward your usage limit

## What it leaves alone

- prompts shorter than 40 characters ("yes, go on") — see `MIN_CHARS`
- slash commands, and messages from scheduled tasks, background tasks or other sessions
- pasted content (code, logs, transcripts): it is swapped for a placeholder before Haiku sees the prompt and put back unchanged afterwards

If Haiku fails, times out (20 s) or drops pasted content, the prompt is sent exactly as typed and a short notice tells you why. The mod never blocks a prompt.

## Customize

Everything is at the top of [`hooks/register.ts`](hooks/register.ts):

| Constant | What it does |
| --- | --- |
| `VOCABULARY` | Names and terms Haiku must spell exactly so — add your own names, companies and projects |
| `MISHEARINGS` | Known speech-recognition errors as `[heard, meant]` pairs |
| `MIN_CHARS` | Prompts shorter than this are sent as typed |
| `PRICE` | Haiku list price per million tokens, used for the cost estimate |
| `SYSTEM` | The full instruction Haiku follows |

Each vocabulary entry costs about 3–5 tokens per prompt; even 100 entries add well under a hundredth of a cent. After editing an installed copy, run `/reload-plugins`.

## Privacy

Every prompt of 40 characters or more is sent to Claude Haiku through your own Claude Code account (the same connection your session uses) before it is sent to your main model. Nothing goes to any other service.

## Develop

```bash
claude plugin validate .
claude plugin test .
```

---

## Deutsch

Ein Mod für Claude Code, der diktierte Gedankenschwälle in einen klaren, strukturierten Prompt umbaut, bevor Claude sie liest.

Diktierte Prompts klingen, wie Menschen sprechen: Füllwörter, Neuansätze, Selbstkorrekturen („bis Freitag, nee warte, Donnerstag“), Themensprünge, falsch verstandene Produktnamen. Der Mod schickt jede Eingabe zuerst durch **Claude Haiku** und gibt Claude die bereinigte Fassung: ohne Füllwörter, Selbstkorrekturen aufgelöst, Wiederholungen zusammengefasst, Hauptanliegen zuerst, offene Widersprüche als Frage markiert, Rechtschreibung und Kommas korrigiert, in der gesprochenen Sprache. Claude sieht nur die umgebaute Fassung.

**Installation:** siehe [Install](#install) oben.

**Anpassen:** Am Anfang von [`hooks/register.ts`](hooks/register.ts) stehen die Vokabelliste (`VOCABULARY`), bekannte Hörfehler (`MISHEARINGS`) und die Mindestlänge (`MIN_CHARS`). Nach einer Änderung `/reload-plugins` ausführen.

**Unverändert bleiben:** kurze Eingaben unter 40 Zeichen, Slash-Befehle, Nachrichten anderer Sitzungen und eingefügter Text (Code, Logs). Schlägt Haiku fehl, geht die Eingabe unverändert raus.

**Datenschutz:** Eingaben ab 40 Zeichen gehen vorab über deinen eigenen Claude-Code-Zugang an Claude Haiku, an keinen anderen Dienst.

## License

MIT
