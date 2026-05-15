# Rainy Bedroom — Three.js Scene

A moody, interactive bedroom scene rendered in WebGL with Three.js. Rain streams down a city window at night, neon signs flicker, thunder flashes through the curtains, and everything in the room is clickable.

---

## Concept and Mood

The goal was a lo-fi, late-night bedroom feel — dim warm lighting, a cold rainy city outside the window, and enough interactivity to make it feel lived-in. The colour palette deliberately mixes warm incandescent tones (ceiling lamp, desk lamp) against cold blue-green accents (computer screen, rain, sky glow) to create visual tension.

---

## Lighting Decisions

**Why not rely purely on HDRI for lighting?**  
The HDRI (`DaySkyHDRI020A.exr`) is used only for image-based *reflections* (`scene.environment`). It contributes physically correct specular highlights on glossy surfaces. It is also set as the scene background for the sky visible through the window. Using it as the primary light source was rejected because the scene is an *interior at night* — a daytime sky HDRI would wash out the moody artificial lighting.

**Actual light sources:**
- `SpotLight` (warm, 40 intensity, PCF soft shadows) — ceiling lamp, the primary scene light. Togglable by clicking the lamp model.
- `PointLight` (pink/magenta, 3 intensity, radius 5) — neon sign, casts coloured glow onto the back wall. Flickers procedurally every 100–400 frames.
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
- The computer screen emissive (`emissiveIntensity: 4.0`) and desk lamp emissive (`emissiveIntensity: 4.0`) are high enough to trigger bloom without needing any per-object layer override (see Bloom section).

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
- Threshold: `0.9` — only pixels whose HDR luminance exceeds 0.9 contribute to bloom. This means only the neon sign (`emissiveIntensity: 3.0`), the computer screen (`4.0`), and the desk lamp (`4.0`) visibly bloom. Diffuse surfaces and low-intensity point lights do not.
- Bloom is *global* (not per-layer). A selective two-composer approach was tried earlier but caused a significant FPS drop (two full scene traversals per frame) and was replaced with this single-pass threshold approach.

**Tone mapping:** `ACESFilmicToneMapping` at exposure `0.5`. Applied by `OutputPass`.

**Anti-aliasing:** `antialias: true` on the `WebGLRenderer` is bypassed by the `EffectComposer` (which renders to an offscreen RT). `SMAAPass` is added as the final composer pass operating at the physical pixel resolution (`innerWidth × devicePixelRatio`).

---

## Interactions

| Action | Effect |
|---|---|
| Click ceiling lamp model | Toggles `SpotLight` on/off, plays switch sound |
| Click desk lamp model | Toggles desk `PointLight` + emissive on/off, plays switch sound |
| Click curtain | Plays open/close animation clip; idle wind sway resumes on close |
| Click TV | Focuses camera on TV, plays GLB animation forward/reverse |
| Click computer | Focuses camera on computer, plays GLB animation forward/reverse |
| Click speaker | Focuses camera on speaker, plays/pauses *Creep* audio |
| Mouse move | Subtle parallax — camera position and look-at follow the cursor |

Thunder strikes fire automatically on a 15–45 second random timer: the curtain `PointLight` spikes to intensity 900 for a double-flash, then decays over ~0.4 s. Thunder audio plays 1.6–2.4 s after the visual flash.

---

## What Was Attempted but Not Finished

- **Selective bloom per object** — tried with two composers and a dedicated bloom layer. Dropped due to the per-frame cost.
- **GSAP camera animations** — GSAP is listed as a dependency but camera focus transitions ended up as simple `lerp` calls in the animate loop instead.
- **Raindrop splash particles** at the window sill — scoped out but not implemented.
- **TV screen texture animation** — the TV GLB animation plays but the screen itself has no dynamic texture (video or canvas).
