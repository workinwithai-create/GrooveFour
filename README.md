# GrooveFour

Four-bar live groove pocket desk for bedroom producers.

Sample packs feel canned and never sit in your key. GrooveFour writes a repeating 4-bar pocket with live FluidR3 chairs (kit, upright, piano, nylon) on your BPM and key. Drop the WAV and MIDI on the grid.

Distinct from TagFour (last-line end), LiftTwo (pre-hook lift), PreEight, AfterHook, EndEight, LastHook.

## Pricing

One-time **$19** on Gumroad (or Lemon Squeezy). This is a focused desk, not a subscription. Mirror free tier with license gate or mark free. Best place: Gumroad next to other indie music tools + pinned X demo.

## Stack

Static HTML/CSS/JS. Samples pinned to PreEight@d58301e4a494555f411a2afbc448b724136eee76.

Deploy on Vercel team `release-forge`.

## Acceptance notes

Engine follows WorkinWithAI rules: lookahead scheduler on AudioContext clock, live state, OfflineAudioContext exports (length exact, first sample at 0, tail folded), no @main, no Math.random in export path. User BPM/key persist. Missing samples named. 

Demo video: short screen capture of play + export.