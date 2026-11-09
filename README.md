# GrooveFour

Four-bar live groove pocket desk for bedroom producers.

Sample packs feel canned and never sit in your key. GrooveFour writes a repeating 4-bar pocket with live FluidR3 chairs (kit, upright, piano, nylon) on your BPM and key. Drop the WAV and MIDI on the grid.

Distinct from TagFour (last-line end), LiftTwo (pre-hook lift), PreEight, AfterHook, EndEight, LastHook.

## Pricing

One-time **$19** on Gumroad (or Lemon Squeezy). This is a focused desk, not a subscription. **License gate not yet connected** — exports are open for now. Mirror free tier with license gate or mark free. Best place: Gumroad next to other indie music tools + pinned X demo.

## Stack

Static HTML/CSS/JS. Samples pinned to PreEight@d58301e4a494555f411a2afbc448b724136eee76.

Deploy on Vercel team `release-forge` (https://groovefour.vercel.app).

## Acceptance notes

Engine follows WorkinWithAI rules: lookahead scheduler on AudioContext clock, live state, OfflineAudioContext exports (length exact, first sample at 0, tail folded for seamless loop, peak ≤ -1 dBFS), no @main, no Math.random in export path. User BPM/key persist. Missing samples named. MIDI is multi-track SMF with tempo and time signature.

Demo video: short screen capture of play + export.

**Milestone 2026-11-09**: Core exports made production-ready. Not yet shipped (missing real checkout/license delivery, full mobile onboarding verification, 24-bit WAV).