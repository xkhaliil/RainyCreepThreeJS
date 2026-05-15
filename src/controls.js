// controls.js
// Handles all user interaction: mouse parallax, raycasting, and the pointer
// (mouse + touch) click handlers for every interactive object in the scene.
//
// Exports shared state objects so animate.js and main.js can read them:
//   camBase     — resting camera position (used for parallax target)
//   camLookAt   — look-at target Vector3 (lerped each frame in animate.js)
//   camState    — { transitioning: bool } written here and in main.js
//   mouse / smoothMouse — raw and smoothed NDC-space mouse position
//   tvState / computerState / speakerState — per-object interaction phase

import * as THREE from "three";
import gsap from "gsap";
import { camera } from "./renderer.js";
import { lampLight } from "./lights.js"; // toggled by ceiling lamp click
import { switchSound, creepAudio } from "./audio.js"; // sounds for lamp toggle and speaker easter egg

// ─────────────────────────────────────────────
// Camera state
// ─────────────────────────────────────────────

// Capture camera’s current position as the resting base.
// This is read here (before main.js sets the intro position to z=10),
// so it always stores the in-room resting position (1, -1, 5).
export const camBase = {
  x: camera.position.x,
  y: camera.position.y,
  z: camera.position.z,
};

// The camera looks at this point every frame. GSAP tweens it during focus
// transitions; the animate loop lerps it toward the parallax target when idle.
export const camLookAt = new THREE.Vector3(0, 0, 0);

// Using an object (not a primitive) so any importing module can mutate
// .transitioning and the change is visible to all other importers.
export const camState = { transitioning: false };

// ─────────────────────────────────────────────
// Mouse parallax
// ─────────────────────────────────────────────
// Raw mouse position in [-1, 1] NDC range, updated on every mousemove.
export const mouse = { x: 0, y: 0 };
// Smoothed version lerped toward mouse each frame in animate.js (factor 0.03).
export const smoothMouse = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  // Map from [0, viewport] to [-1, 1]
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ─────────────────────────────────────────────
// Per-object interaction states
// ─────────────────────────────────────────────
// TV and computer use a 3-phase state machine (see handleModelClick below).
// Speaker uses a multi-phase cycle that depends on whether music is already playing.
//   playing=false: phase 0→focus, phase 1→play+return camera, music persists.
//   playing=true:  phase 0→focus, phase 1→pause, phase 2→return camera.
export const tvState = { phase: 0, forward: true }; // forward = play direction
export const computerState = { phase: 0, forward: true };
export const speakerState = { phase: 0, playing: false };

// ─────────────────────────────────────────────
// Raycaster
// ─────────────────────────────────────────────
// A single shared raycaster re-used for every click check to avoid allocating
// a new one on each pointer event.
export const raycaster = new THREE.Raycaster();
export const clickNDC = new THREE.Vector2(); // reusable NDC coordinate for raycasting

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────

/** GSAP tween that flies the camera back to its resting position (camBase). */
function returnCamera() {
  camState.transitioning = true;
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(camLookAt);
  gsap.to(camera.position, {
    x: camBase.x,
    y: camBase.y,
    z: camBase.z,
    duration: 1.2,
    ease: "power2.inOut",
    onComplete: () => {
      camState.transitioning = false;
    },
  });
  gsap.to(camLookAt, { x: 0, y: 0, z: 0, duration: 1.2, ease: "power2.inOut" });
}

/**
 * Multi-phase click handler for objects that have open/close animations
 * (TV, computer).
 *   phase 0 → raycast check; if hit → phase 1
 *   phase 1 → play animation forward/backward → phase 2
 *   phase 2 → any click returns camera → phase 0
 */
function handleModelClick(e, modelRef, state) {
  if (!modelRef || !modelRef.wrapper) return;

  if (state.phase === 0) {
    clickNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    clickNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(clickNDC, camera);
    if (raycaster.intersectObject(modelRef.wrapper, true).length > 0)
      state.phase = 1;
  } else if (state.phase === 1) {
    if (modelRef.mixer && modelRef.clip) {
      const action = modelRef.mixer.clipAction(modelRef.clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      if (state.forward) {
        action.reset();
        action.timeScale = 1;
        action.play();
        state.forward = false;
      } else {
        action.reset();
        action.timeScale = -1;
        action.time = modelRef.clip.duration;
        action.play();
        state.forward = true;
      }
    }
    state.phase = 2;
  } else {
    // phase 2 — click anywhere to return
    returnCamera();
    state.phase = 0;
  }
}

// ─────────────────────────────────────────────
// Pointer interaction
// ─────────────────────────────────────────────
// We use pointerup (not click) so the handler fires on both mouse and touch
// without needing separate touch event listeners.

// Record pointer-down position so we can ignore drags (panning the camera
// should not accidentally trigger an object interaction).
let _pointerDownX = 0;
let _pointerDownY = 0;

window.addEventListener("pointerdown", (e) => {
  _pointerDownX = e.clientX;
  _pointerDownY = e.clientY;
});

window.addEventListener("pointerup", (e) => {
  if (e.button !== 0) return; // primary button only (ignore right-click, middle-click)

  // Drag guard — if the pointer moved more than 10 px, treat as a pan gesture, not a click.
  // Threshold is distance² (100 = 10px) to avoid a Math.sqrt call.
  const dx = e.clientX - _pointerDownX;
  const dy = e.clientY - _pointerDownY;
  if (dx * dx + dy * dy > 100) return;

  // Update raycaster NDC for all checks below
  clickNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  clickNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(clickNDC, camera);

  // ── Ceiling lamp toggle ──
  // Flip the on/off flag and set lampLight intensity 40 (on) or 0 (off).
  if (window._ceilingLamp && window._ceilingLamp.wrapper) {
    if (
      raycaster.intersectObject(window._ceilingLamp.wrapper, true).length > 0
    ) {
      window._ceilingLamp.on = !window._ceilingLamp.on;
      lampLight.intensity = window._ceilingLamp.on ? 40 : 0; // SpotLight on/off
      switchSound.currentTime = 0;
      switchSound.play().catch(() => {});
      return;
    }
  }

  // ── Desk lamp toggle ──
  // Toggles both the PointLight intensity AND the emissive on the bulb mesh so
  // the mesh itself goes dark when off rather than staying bright.
  if (window._deskLamp && window._deskLamp.wrapper) {
    if (raycaster.intersectObject(window._deskLamp.wrapper, true).length > 0) {
      window._deskLamp.on = !window._deskLamp.on;
      const intensity = window._deskLamp.on ? 1.5 : 0;
      window._deskLamp.light.intensity = intensity;
      window._deskLamp.meshes.forEach((m) => {
        m.material.emissiveIntensity = window._deskLamp.on ? 4.0 : 0; // dim bulb glow
      });
      switchSound.currentTime = 0;
      switchSound.play().catch(() => {});
      return;
    }
  }

  // ── Curtain toggle (open / close) ──
  // First click opens the curtain (plays "Abrindo" forward, stops wind).
  // Second click closes it (plays "Abrindo" in reverse), then restarts the
  // wind animation once the close clip finishes.
  if (window._curtain && window._curtain.wrapper) {
    if (raycaster.intersectObject(window._curtain.wrapper, true).length > 0) {
      if (window._curtain.openClip && window._curtain.mixer) {
        const openAction = window._curtain.mixer.clipAction(
          window._curtain.openClip,
        );
        openAction.setLoop(THREE.LoopOnce, 1);
        openAction.clampWhenFinished = true;

        if (!window._curtain.opened) {
          // ── Open ──
          if (window._curtain.windAction) window._curtain.windAction.stop();
          openAction.reset();
          openAction.timeScale = 1;
          openAction.play();
          window._curtain.opened = true;
        } else {
          // ── Close ──
          // Play the open clip backwards from its end to its beginning.
          openAction.reset();
          openAction.timeScale = -1;
          openAction.time = window._curtain.openClip.duration;
          openAction.play();
          window._curtain.opened = false;

          // Once the reverse clip finishes, restart the looping wind animation.
          const onFinished = (e) => {
            if (e.action === openAction) {
              window._curtain.mixer.removeEventListener("finished", onFinished);
              if (window._curtain.windAction) {
                window._curtain.windAction.reset();
                window._curtain.windAction.setLoop(THREE.LoopRepeat, Infinity);
                window._curtain.windAction.play();
              }
            }
          };
          window._curtain.mixer.addEventListener("finished", onFinished);
        }
      }
      return;
    }
  }

  // ── TV open/close ──
  if (tvState.phase > 0) {
    // Already interacted — handle multi-phase
    handleModelClick(e, window._tv, tvState);
    if (tvState.phase === 0) return; // returned

    if (tvState.phase === 1) {
      // Focus camera toward TV
      camState.transitioning = true;
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(camLookAt);
      const tvPos = window._tv.wrapper.position;
      gsap.to(camera.position, {
        x: tvPos.x,
        y: tvPos.y + 0.5,
        z: tvPos.z + 3,
        duration: 1.2,
        ease: "power2.inOut",
        onComplete: () => {
          camState.transitioning = false;
        },
      });
      gsap.to(camLookAt, {
        x: tvPos.x,
        y: tvPos.y,
        z: tvPos.z,
        duration: 1.2,
        ease: "power2.inOut",
      });
    }
    return;
  }
  if (window._tv && window._tv.wrapper) {
    if (raycaster.intersectObject(window._tv.wrapper, true).length > 0) {
      handleModelClick(e, window._tv, tvState);
      if (tvState.phase === 1) {
        camState.transitioning = true;
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(camLookAt);
        const tvPos = window._tv.wrapper.position;
        gsap.to(camera.position, {
          x: tvPos.x,
          y: tvPos.y + 0.5,
          z: tvPos.z + 3,
          duration: 1.2,
          ease: "power2.inOut",
          onComplete: () => {
            camState.transitioning = false;
          },
        });
        gsap.to(camLookAt, {
          x: tvPos.x,
          y: tvPos.y,
          z: tvPos.z,
          duration: 1.2,
          ease: "power2.inOut",
        });
      }
      return;
    }
  }

  // ── Computer open/close ──
  if (computerState.phase > 0) {
    handleModelClick(e, window._computer, computerState);
    if (computerState.phase === 0) return;

    if (computerState.phase === 1) {
      camState.transitioning = true;
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(camLookAt);
      const cPos = window._computer.wrapper.position;
      gsap.to(camera.position, {
        x: cPos.x - 2.5,
        y: cPos.y + 0.5,
        z: cPos.z,
        duration: 1.2,
        ease: "power2.inOut",
        onComplete: () => {
          camState.transitioning = false;
        },
      });
      gsap.to(camLookAt, {
        x: cPos.x,
        y: cPos.y,
        z: cPos.z,
        duration: 1.2,
        ease: "power2.inOut",
      });
    }
    return;
  }
  if (window._computer && window._computer.wrapper) {
    if (raycaster.intersectObject(window._computer.wrapper, true).length > 0) {
      handleModelClick(e, window._computer, computerState);
      if (computerState.phase === 1) {
        camState.transitioning = true;
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(camLookAt);
        const cPos = window._computer.wrapper.position;
        gsap.to(camera.position, {
          x: cPos.x - 2.5,
          y: cPos.y + 0.5,
          z: cPos.z,
          duration: 1.2,
          ease: "power2.inOut",
          onComplete: () => {
            camState.transitioning = false;
          },
        });
        gsap.to(camLookAt, {
          x: cPos.x,
          y: cPos.y,
          z: cPos.z,
          duration: 1.2,
          ease: "power2.inOut",
        });
      }
      return;
    }
  }

  // ── Speaker ──
  // When music is NOT playing:
  //   click 1 → focus camera (phase 0→1)
  //   click 2 → start music + return camera to default (phase 1→0, playing=true)
  //            music keeps playing freely in the background.
  // When music IS playing:
  //   click 1 → focus camera (phase 0→1)
  //   click 2 → pause music (phase 1→2)
  //   click 3 → return camera (phase 2→0)
  if (window._speaker && window._speaker.wrapper) {
    if (raycaster.intersectObject(window._speaker.wrapper, true).length > 0) {
      if (speakerState.phase === 0) {
        // Focus camera on speaker
        camState.transitioning = true;
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(camLookAt);
        const sPos = window._speaker.wrapper.position;
        gsap.to(camera.position, {
          x: sPos.x - 2,
          y: sPos.y + 0.5,
          z: sPos.z + 2,
          duration: 1.2,
          ease: "power2.inOut",
          onComplete: () => {
            camState.transitioning = false;
          },
        });
        gsap.to(camLookAt, {
          x: sPos.x,
          y: sPos.y,
          z: sPos.z,
          duration: 1.2,
          ease: "power2.inOut",
        });
        speakerState.phase = 1;
      } else if (speakerState.phase === 1) {
        if (!speakerState.playing) {
          // Start music and return camera — music keeps playing after camera leaves
          creepAudio.currentTime = 0;
          creepAudio.play().catch(() => {});
          speakerState.playing = true;
          returnCamera();
          speakerState.phase = 0;
        } else {
          // Pause music, stay focused
          creepAudio.pause();
          speakerState.playing = false;
          speakerState.phase = 2;
        }
      } else {
        // Phase 2: return camera (audio stays paused)
        returnCamera();
        speakerState.phase = 0;
      }
      return;
    }
  }

  // ── Click anywhere else while a focus is active → return camera ──
  // Catches clicks on the floor, ceiling, or empty air while the camera is
  // pointed at a focused object.
  if (!camState.transitioning) {
    if (
      tvState.phase !== 0 ||
      computerState.phase !== 0 ||
      speakerState.phase !== 0
    ) {
      // Note: do NOT touch creepAudio here — music should keep playing
      // even after the camera returns to default.
      returnCamera();
      tvState.phase = 0;
      computerState.phase = 0;
      speakerState.phase = 0;
    }
  }
});
