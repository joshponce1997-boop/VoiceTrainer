# Regal Voice Trainer

A mobile-first browser voice-training game that turns pitch, inflection, timing and vocal control into a rhythm-game loop. The target is an original, practical voice profile: articulate, deliberate, certain, composed, and natural. It does not contain copyrighted character dialogue or actor voice cloning.

## What is actually implemented

- Microphone capture with `getUserMedia`
- Browser-side autocorrelation pitch detection
- First-run voice calibration: median comfortable pitch, approximate low/high range, RMS loudness baseline
- Target pitch/inflection corridor relative to your own calibrated voice
- Live target line + live detected pitch line + moving playhead
- Real-time feedback including LOWER, RAISE SLIGHTLY, LESS FORCE, SPEAK and GOOD
- Combo and live scoring
- Profiles: Regal Professional, Lelouch-inspired abstract style, Gilgamesh-inspired abstract style, Executive / Statesman
- Regality slider with added naturalness/theatricality penalty at high levels
- 30/45/60/90 second rounds
- 12 drill categories (core exercises share the same reliable pitch/timing engine; several have specialized prompts)
- Mimic Mode using browser speech synthesis as an original reference delivery, followed by contour comparison
- SpeechRecognition integration where Chrome exposes it, with graceful fallback if unavailable
- Filler-word counting and transcript overlap when SpeechRecognition works
- Detailed scorecards and persistent progress stored in localStorage
- Adaptive Daily Training: a 10-round, roughly 10-minute session biased toward the weakest recent skill
- PWA manifest + service worker for install/offline use after first load

## Important analysis limitations

Browser-only audio can reliably estimate fundamental pitch, pitch movement, RMS amplitude, timing and voiced/unvoiced regions. It cannot reliably infer human concepts such as “resonance,” perfect pronunciation, emotional composure, or articulation from pitch alone. This version therefore:

- directly measures pitch/inflection/timing/amplitude;
- uses calibrated, transparent proxies for several higher-level scores;
- uses browser SpeechRecognition, when available, for transcript similarity and filler detection;
- labels pronunciation/articulation as estimated when speech recognition is unavailable;
- never treats a lower pitch as automatically better;
- warns against forcing pitch below the calibrated comfortable region.

## Desktop quick start

From this folder:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in Chrome. Microphone access is allowed on `localhost`.

## Android Chrome: the important HTTPS rule

Android Chrome generally requires microphone pages to be served from a **secure context (HTTPS)**. Opening the files directly (`file://...`) or visiting a normal LAN URL such as `http://192.168.x.x:8080` may load the UI but block microphone access.

### Easiest reliable phone test: HTTPS static hosting

Upload the entire `RegalVoiceTrainer` folder to any static HTTPS host (GitHub Pages, Cloudflare Pages, Netlify, etc.). Then open the HTTPS URL in Android Chrome, grant microphone permission, and optionally use Chrome → Add to Home screen / Install app.

No private API key is required. The core pitch game runs locally in the browser.

### Local PC + temporary HTTPS tunnel

If you have Node/Python available:

1. In the project folder run `python -m http.server 8080`.
2. In a second terminal use an HTTPS tunneling tool you trust, for example Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:8080`).
3. Open the HTTPS address it prints on your Android phone.
4. Grant microphone permission.

The service worker lets the app keep its static assets available after the initial successful HTTPS load.

## First test sequence

1. Open the app in Android Chrome over HTTPS.
2. Tap **Voice Calibration**.
3. Grant microphone permission.
4. Speak naturally for 12 seconds; do not deepen your voice.
5. Pick a profile and set Regality near 50.
6. Tap **Quick Exercise** and start a 30-second Medium round.
7. Rotate to landscape if you want a larger rhythm-game view.
8. Speak while following the green target corridor. Your detected pitch is blue.
9. Watch the feedback pill and combo counter.
10. Finish the round and inspect the scorecard.
11. Open **Mimic**, hear the synthesized original example, then repeat it.
12. Close and reopen the app. Calibration/history should remain on that browser unless site data is cleared.

## Microphone troubleshooting

- Confirm the URL begins with `https://` (or is `http://localhost` on the same desktop).
- In Chrome site settings, allow Microphone.
- If no pitch line appears, move to a quieter room and speak continuously at normal volume.
- Bluetooth microphones can add latency. The phone’s built-in mic is usually better for rhythm feedback.
- If a selected microphone disappears, Settings → Microphone → Default microphone.
- If the app seems stale after an update, Chrome site settings → Storage → Clear, then reload. This clears local progress too.

## Safety / vocal use

This is practice software, not medical or speech-therapy software. Do not force the larynx down, growl, push excessive loudness, or continue through pain/hoarseness. A useful “deeper” voice should feel relaxed and sustainable.

## Project layout

- `index.html` — screens and controls
- `css/styles.css` — responsive dark UI
- `js/audio-engine.js` — microphone + analyzer lifecycle
- `js/pitch-detector.js` — autocorrelation pitch estimator
- `js/scoring-engine.js` — live and final scoring
- `js/game-renderer.js` — target/actual pitch canvas
- `js/speech-analysis.js` — optional browser speech recognition
- `js/profiles.js` — training profiles + Regality transforms
- `js/exercises.js` — original sentences, drills, scenarios
- `js/storage.js` — local persistent state
- `js/app.js` — application controller
- `manifest.json`, `service-worker.js` — PWA/offline shell

## Development notes

This is a functional first version, not a research-grade speech lab. Good next technical upgrades would be: AudioWorklet/YIN pitch extraction, phoneme-level ASR with a local model, formant/resonance estimation, true word timestamps, and a native wrapper if you need lower-latency Android audio.

## v1.1 pitch/contour update

- Normal exercises now score **relative pitch contour / inflection shape** instead of requiring an exact absolute musical pitch.
- The dedicated Depth drill still uses pitch relative to your calibrated comfortable voice.
- Difficulty corridors are wider and easier to understand: Easy ±350 cents, Medium ±250, Hard ±150, Expert ±90.
- Live pitch is smoothed and common octave-doubling/halving detector errors are corrected conservatively.
- The training screen now labels what is being measured and shows green = target, blue = your voice, plus current Hz.
- Mimic Mode opens the microphone before the countdown and starts its timeline on your **first detected voiced sound**, so the blue trace begins at the start of the green target rather than partway through it.

If you are updating an existing GitHub Pages deployment, replace the repository files with this version and commit them. The service worker cache version was bumped so the new build can replace the older cached build; closing and reopening the installed PWA after the deployment updates is recommended.
