// lights.js
// Places all static light sources into the scene.
// The neon PointLight and the curtain/thunder PointLight live in models.js
// alongside the meshes they belong to.

import * as THREE from "three";
import { scene } from "./renderer.js";

// --- Ceiling Lamp SpotLight ---
// Primary scene light — a warm incandescent spot aimed straight down from
// where the ceiling lamp model hangs (y = 2.8).
// Toggled on/off when the player clicks the ceiling lamp model (controls.js).
//
// intensity  40   — strong enough to illuminate the whole room floor
// distance   18   — falls off before reaching the back wall (z = -3)
// angle      π/4  — 45° cone, realistic for a pendant lamp shade
// penumbra   0.4  — soft edge that blends into shadow naturally
// decay      1.5  — physically based inverse-square-ish fall-off
export const lampLight = new THREE.SpotLight(
  0xffd97d, // warm incandescent yellow
  40, // intensity
  18, // distance (range)
  Math.PI / 4, // angle (cone half-width)
  0.4, // penumbra (soft edge ratio)
  1.5, // decay
);
lampLight.position.set(0, 2.8, 0); // hang from ceiling centre
lampLight.target.position.set(0, -3, 0); // aim at floor centre
lampLight.castShadow = true;
// 512×512 shadow map — soft shadows at this resolution look intentional
// and are cheap enough for low-end hardware.
lampLight.shadow.mapSize.width = 512;
lampLight.shadow.mapSize.height = 512;
scene.add(lampLight);
scene.add(lampLight.target); // target MUST be added to the scene to take effect

// --- Ambient light ---
// Extremely dim warm fill so pitch-black corners still have a hint of colour.
// 0x221a10 is a very dark brownish-orange that complements the incandescent
// palette without washing out the moody shadows.
const ambient = new THREE.AmbientLight(0x221a10, 1);
scene.add(ambient);
