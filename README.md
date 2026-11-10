# GrooveFour

Four-bar live groove pocket desk for bedroom producers.

Sample packs feel canned and never sit in your key. GrooveFour writes a repeating 4-bar pocket with live FluidR3 chairs (kit, upright, piano, nylon) on your BPM and key. Drop the WAV and MIDI on the grid.

Distinct from TagFour (last-line end), LiftTwo (pre-hook lift), PreEight, AfterHook, EndEight, LastHook.

## Pricing

**Free** for now. (License gate for $19 not yet connected; exports open. Will add Gumroad/Lemon Squeezy or WorkinWithAI entitlement when ready. Mirror free tier.)

## Stack

Static HTML/CSS/JS. Samples pinned to PreEight@d58301e4a494555f411a2afbc448b724136eee76.

Deploy on Vercel team `release-forge` (https://groovefour.vercel.app).

## Acceptance notes

Engine follows WorkinWithAI rules: lookahead scheduler on AudioContext clock, live state, OfflineAudioContext exports (length exact, first sample at 0, tail folded for seamless loop, peak ≤ -1 dBFS), no @main, no Math.random in export path. User BPM/key persist. Missing samples named. MIDI is multi-track SMF with tempo and time signature. WAV is 48 kHz 24-bit stereo.

**Milestone 2026-11-10**: Fixed WAV to true 24-bit (previously 16-bit despite claim). Marked free until license gate. Core exports production-ready. Not yet fully shipped (missing real checkout/license if priced later, full mobile onboarding verification in production).

Demo video: short screen capture of play + export.
