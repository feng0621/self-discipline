# FORMA — Quiet Orbit Design System

## Direction

FORMA uses a **Quiet Orbit** visual language: editorial restraint, training-instrument precision and a single living signal color. The interface should feel calm before it feels futuristic.

## Principles

1. **One dominant moment.** Motion is concentrated in the landing-page entrance and the readiness orbit.
2. **Data before decoration.** Every ring, pulse and marker represents readiness, progress or system state.
3. **Restraint creates value.** Most surfaces are near-black or bone; signal lime is reserved for action and live state.
4. **Motion must degrade gracefully.** All continuous motion stops under `prefers-reduced-motion`.

## Palette

- Ink `#070907`: primary canvas.
- Panel `#10110f`: elevated surface.
- Bone `#f1f0e8`: primary copy.
- Fog `#9fa398`: secondary copy.
- Signal `#d9ff69`: action, readiness and connected state.
- Heat `#ff7255`: warning or exceptional effort only.

## Typography

- Display: Bodoni/Didot/STSong fallback stack for a high-contrast editorial voice.
- Interface: Avenir Next/Noto Sans SC/Microsoft YaHei for compact operational copy.
- Labels use small sizes with generous tracking; they are metadata, not body copy.

## Icon language

The custom `FormaIcon` set is built from 1.55 px rounded strokes. Its vocabulary combines orbit paths, body joints and training instruments. Icons inherit `currentColor`, require no icon font and remain sharp at mobile navigation sizes.

## Motion choreography

- 0–800 ms: navigation and eyebrow arrive.
- 240–1,200 ms: headline, supporting copy and actions reveal in sequence.
- 350–1,650 ms: body orbit resolves and readiness meter draws to 82.
- Continuous: only the two low-speed orbit rings and subtle pointer parallax remain active.

The implementation borrows the *principles* of beam, aurora and progressive-blur components while remaining native React/CSS/Canvas. Vue is not bundled into the React application.
