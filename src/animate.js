import * as THREE from "three";
import { camera, composer, stats } from "./renderer.js";
import { rainMesh } from "./room.js";
import { thunderAudio } from "./audio.js";
import {
  mouse,
  smoothMouse,
  camBase,
  camLookAt,
  camState,
  tvState,
  computerState,
  speakerState,
} from "./controls.js";

const clock = new THREE.Clock();

// ─────────────────────────────────────────────
// Thunder state
// ─────────────────────────────────────────────
const thunder = {
  nextStrike: 10 + Math.random() * 20, // seconds until first flash
  phase: "idle",
  elapsed: 0,
  baseIntensity: 2.5, // curtainLight resting intensity
};

// ─────────────────────────────────────────────
// Main render loop
// ─────────────────────────────────────────────
export function animate() {
  requestAnimationFrame(animate);

  // Smooth mouse parallax
  smoothMouse.x += (mouse.x - smoothMouse.x) * 0.03;
  smoothMouse.y += (mouse.y - smoothMouse.y) * 0.03;

  // Camera parallax — only when idle (not during focus transitions)
  const isIdle =
    !camState.transitioning &&
    tvState.phase === 0 &&
    computerState.phase === 0 &&
    speakerState.phase === 0;

  if (isIdle) {
    const targetX = camBase.x + smoothMouse.x * 0.4;
    const targetY = camBase.y - smoothMouse.y * 0.2;
    camera.position.x += (targetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.position.z += (camBase.z - camera.position.z) * 0.03;

    // Subtle look-at drift
    const lookTarget = new THREE.Vector3(
      smoothMouse.x * 0.6,
      -smoothMouse.y * 0.3,
      0,
    );
    camLookAt.lerp(lookTarget, 0.05);
  }
  camera.lookAt(camLookAt);

  // ── Neon sign flicker ──
  if (window._neonFlicker) {
    const f = window._neonFlicker;
    f.timer -= 1;
    if (f.timer <= 0) {
      if (f.flickering) {
        // Restore to full brightness after a flicker burst
        f.light.intensity = 6;
        f.meshes.forEach((m) => (m.material.emissiveIntensity = 6.0));
        f.flickering = false;
        f.timer = Math.random() * 300 + 100; // quiet for a while
      } else {
        const on = Math.random() > 0.5;
        f.light.intensity = on ? 6 : 0;
        f.meshes.forEach(
          (m) => (m.material.emissiveIntensity = on ? 6.0 : 0.1),
        );
        f.timer = Math.floor(Math.random() * 6) + 1; // very fast flicker
        f.flickering = Math.random() > 0.6;
      }
    }
  }

  const delta = clock.getDelta();

  // ── Thunder flash (drives curtainLight intensity) ──
  if (window._curtainLight) {
    if (thunder.phase === "idle") {
      thunder.nextStrike -= delta;
      if (thunder.nextStrike <= 0) {
        thunder.phase = "flashing";
        thunder.elapsed = 0;
        // Play thunder sound ~1.6–2.4 s after the visual flash
        const delay = 1600 + Math.random() * 800;
        setTimeout(() => {
          thunderAudio.currentTime = 0;
          thunderAudio.play().catch(() => {});
        }, delay);
      }
    } else {
      // Flash sequence: two bright peaks then fade back
      thunder.elapsed += delta;
      const t = thunder.elapsed;
      let fl = thunder.baseIntensity;

      if (t < 0.06) fl = 900;
      else if (t < 0.14)
        fl = THREE.MathUtils.lerp(
          900,
          thunder.baseIntensity,
          (t - 0.06) / 0.08,
        );
      else if (t < 0.22) fl = 500;
      else if (t < 0.42)
        fl = THREE.MathUtils.lerp(500, thunder.baseIntensity, (t - 0.22) / 0.2);
      else {
        fl = thunder.baseIntensity;
        thunder.phase = "idle";
        thunder.nextStrike = 15 + Math.random() * 30;
      }

      window._curtainLight.intensity = fl;
      window._curtainLight.distance = fl > thunder.baseIntensity + 1 ? 40 : 8;
    }
  }

  // ── Animation mixers ──
  if (window._curtainMixer) window._curtainMixer.update(delta);
  if (window._tv && window._tv.mixer) window._tv.mixer.update(delta);
  if (window._computer && window._computer.mixer)
    window._computer.mixer.update(delta);

  // ── GPU rain shader time ──
  rainMesh.material.uniforms.uTime.value = clock.elapsedTime;

  // ── Render ──
  stats.begin();
  composer.render();
  stats.end();
}
