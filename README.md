# Rainy Bedroom — Three.js Scene

A moody, interactive bedroom scene rendered in WebGL with Three.js. Rain streams down a city window at night, neon signs flicker, thunder flashes through the curtains, and everything in the room is clickable.

Live site: **[xkhaliil.github.io/RainyCreepThreeJS](https://xkhaliil.github.io/RainyCreepThreeJS)**

---

## Project Structure

```
src/
  main.js        ← entry point: imports modules, Enter handler, starts animate()
  renderer.js    ← scene, camera, renderer, EffectComposer, loaders, loading screen, resize
  lights.js      ← ceiling SpotLight + ambient
  room.js        ← textures, walls, floor, ceiling, window frame, sky plane, table, GPU rain
  audio.js       ← all 4 Audio instances + iOS unlock logic
  models.js      ← all GLTF model loads (sets window._xxx globals)
  controls.js    ← mouse parallax, camera state, raycaster, pointer interactions
  animate.js     ← render loop: thunder, neon flicker, mixers, rain uniform
  shaders/
    rainVertex.js
    rainFrag.js
public/           ← all static assets (GLBs, textures, audio, EXR)
```

---

## Concept and Mood

The goal was a lo-fi, late-night bedroom feel — dim warm lighting, a cold rainy city outside the window, and enough interactivity to make it feel lived-in. The colour palette deliberately mixes warm incandescent tones (ceiling lamp, desk lamp) against cold blue-green accents (computer screen, rain, sky glow) to create visual tension.

---

## Lighting Decisions

**Why not rely purely on HDRI for lighting?**  
The HDRI (`DaySkyHDRI020A.exr`) is used only for image-based _reflections_ (`scene.environment`). It contributes physically correct specular highlights on glossy surfaces. It is also set as the scene background for the sky visible through the window. Using it as the primary light source was rejected because the scene is an _interior at night_ — a daytime sky HDRI would wash out the moody artificial lighting.

**Actual light sources:**

- `SpotLight` (warm, 40 intensity, PCF soft shadows) — ceiling lamp, the primary scene light. Togglable by clicking the lamp model.
- `PointLight` (pink/magenta, 6 intensity, radius 8) — neon sign, casts coloured glow onto the back wall. Flickers procedurally every 100–400 frames.
- `PointLight` (blue-white, 18 intensity) — computer screen SpotLight aimed toward the room.
- `PointLight` (warm orange, 1.5 intensity, radius 3) — desk lamp shade, togglable independently.
- `PointLight` (cold blue, 2.5 intensity) — soft daylight leaking through the curtain. Doubles as the thunder flash light (intensity spikes to 900 during a strike).
- `AmbientLight` (very dim, `0x221a10`) — prevents pure-black corners.

**Shadow map:** `PCFSoftShadowMap` at 512×512. A larger map (1024 or 2048) would produce sharper shadow edges but costs GPU memory. At this scene scale and camera distance the softness looks intentional and performant.

---

## Model Optimisation

No geometry was decimated or re-exported. All GLB files are loaded as-is. The optimisations that were applied at runtime:

- Every model is wrapped in a `Group`, its bounding box computed, and then scaled to a target world-space size. This avoids needing to pre-process models in Blender just to normalise scale.
- Shadow casting is disabled on the ceiling lamp and neon sign meshes — they are small, high up, and self-shadowing them added no visible value.
- The neon sign emissive (`emissiveIntensity: 6.0`), computer screen (`4.0`), and desk lamp (`4.0`) are all high enough to trigger bloom without needing any per-object layer override (see Bloom section).

---

## GPU Rain Shader

Rain is rendered as `THREE.LineSegments` — 1 600 streaks, each a top + bottom vertex pair. All animation runs entirely on the GPU; no JavaScript position updates happen per frame.

**How it works:**

- At init, each vertex is given two custom attributes: `aSpeed` (fall speed, 10.8–16.8 units/second) and `aDy` (0.0 for the top vertex, `-streakLen` for the bottom).
- The vertex shader receives a `uTime` uniform (seconds elapsed) and computes the current Y position with a `mod()` loop so streaks wrap from bottom back to top seamlessly.
- A `vAlpha` varying fades each streak from opaque at the top vertex to transparent at the bottom, giving a motion-blur appearance.
- The fragment shader multiplies `uColor × uOpacity × vAlpha`.

This approach uses zero CPU per frame for rain animation — the only per-frame cost is writing one float uniform.

---

## Post-Processing

**Pipeline order:** `RenderPass → UnrealBloomPass → OutputPass → SMAAPass`

**Bloom (`UnrealBloomPass`):**

- Strength: `0.4` — subtle, not a music-video glow.
- Radius: `0.5`
- Threshold: `0.9` — only pixels whose HDR luminance exceeds 0.9 contribute to bloom. This means only the neon sign (`emissiveIntensity: 6.0`), the computer screen (`4.0`), and the desk lamp (`4.0`) visibly bloom. Diffuse surfaces and low-intensity point lights do not.
- Bloom is _global_ (not per-layer). A selective two-composer approach was tried earlier but caused a significant FPS drop (two full scene traversals per frame) and was replaced with this single-pass threshold approach.

**Tone mapping:** `ACESFilmicToneMapping` at exposure `0.5`. Applied by `OutputPass`.

**Anti-aliasing:** `antialias: true` on the `WebGLRenderer` is bypassed by the `EffectComposer` (which renders to an offscreen RT). `SMAAPass` is added as the final composer pass operating at the physical pixel resolution (`innerWidth × devicePixelRatio`).

---

## Loading Screen

A full-screen overlay with a neon-pink aesthetic covers the scene while assets load. A `THREE.LoadingManager` is wired to the `TextureLoader`, `GLTFLoader`, and `EXRLoader` — the progress bar and percentage counter update as each asset resolves. Once everything is ready, an **Enter** button fades in. Clicking it:

1. Fades out the overlay (CSS `fade-out` + `display:none` after 950 ms).
2. Starts `rainAudio`.
3. Fires a GSAP camera fly-in: `z = 10 → 5` over 2.5 s (`power3.inOut`).

---

## Interactions

All interactions use `pointerup` (not `click`) for reliable response on both mouse and iOS touch. A 10 px drag guard prevents accidental fires when scrolling on mobile.

| Action                   | Effect                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| Click ceiling lamp model | Toggles `SpotLight` on/off, plays switch sound                     |
| Click desk lamp model    | Toggles desk `PointLight` + emissive on/off, plays switch sound    |
| Click curtain            | Plays open animation clip; idle wind sway stops                    |
| Click TV                 | GSAP camera focus on TV, plays GLB animation forward/reverse       |
| Click computer           | GSAP camera focus on computer, plays GLB animation forward/reverse |
| Click speaker            | GSAP camera focus on speaker; second click plays _Creep_ audio     |
| Mouse move               | Subtle parallax — camera position and look-at follow the cursor    |

Thunder strikes fire automatically on a 15–45 second random timer: the curtain `PointLight` spikes to intensity 900 for a double-flash, then decays over ~0.4 s. Thunder audio plays 1.6–2.4 s after the visual flash.

---

## iOS / Mobile Notes

- Canvas height uses `100dvh` with a `100vh` fallback for correct sizing when the iOS address bar is visible.
- `viewport-fit=cover` in the `<meta>` tag handles the iPhone notch/home-bar safe area.
- `touch-action: none` on the canvas prevents scroll interference.
- `visualViewport.resize` listener alongside `window.resize` keeps the renderer correct when the iOS address bar shows or hides.

---

## What Was Attempted but Not Finished

- **Selective bloom per object** — tried with two composers and a dedicated bloom layer. Dropped due to the per-frame cost.
- **Raindrop splash particles** at the window sill — scoped out but not implemented.
- **TV screen texture animation** — the TV GLB animation plays but the screen itself has no dynamic texture (video or canvas).
