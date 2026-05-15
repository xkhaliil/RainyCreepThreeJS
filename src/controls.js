import * as THREE from "three";
import gsap from "gsap";
import { camera } from "./renderer.js";
import { lampLight } from "./lights.js";
import { switchSound, creepAudio } from "./audio.js";

// ─────────────────────────────────────────────
// Camera state
// ─────────────────────────────────────────────

// Base (resting) camera position — captured from initial camera position
export const camBase = {
  x: camera.position.x,
  y: camera.position.y,
  z: camera.position.z,
};

// Look target (lerped toward each frame)
export const camLookAt = new THREE.Vector3(0, 0, 0);

// Object so any module can mutate .transitioning by reference
export const camState = { transitioning: false };

// ─────────────────────────────────────────────
// Mouse parallax
// ─────────────────────────────────────────────
export const mouse = { x: 0, y: 0 };
export const smoothMouse = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ─────────────────────────────────────────────
// Interaction states
// ─────────────────────────────────────────────
export const tvState = { phase: 0, forward: true };
export const computerState = { phase: 0, forward: true };
export const speakerState = { phase: 0 };

// ─────────────────────────────────────────────
// Raycaster
// ─────────────────────────────────────────────
export const raycaster = new THREE.Raycaster();
export const clickNDC = new THREE.Vector2();

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Animate camera back to its resting position. */
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

// Track pointer-down position to ignore drags
let _pointerDownX = 0;
let _pointerDownY = 0;

window.addEventListener("pointerdown", (e) => {
  _pointerDownX = e.clientX;
  _pointerDownY = e.clientY;
});

window.addEventListener("pointerup", (e) => {
  if (e.button !== 0) return; // primary button only

  // Ignore if pointer was dragged (>10 px)
  const dx = e.clientX - _pointerDownX;
  const dy = e.clientY - _pointerDownY;
  if (dx * dx + dy * dy > 100) return;

  // Update raycaster NDC for all checks below
  clickNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  clickNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(clickNDC, camera);

  // ── Ceiling lamp toggle ──
  if (window._ceilingLamp && window._ceilingLamp.wrapper) {
    if (
      raycaster.intersectObject(window._ceilingLamp.wrapper, true).length > 0
    ) {
      window._ceilingLamp.on = !window._ceilingLamp.on;
      lampLight.intensity = window._ceilingLamp.on ? 40 : 0;
      switchSound.currentTime = 0;
      switchSound.play().catch(() => {});
      return;
    }
  }

  // ── Desk lamp toggle ──
  if (window._deskLamp && window._deskLamp.wrapper) {
    if (raycaster.intersectObject(window._deskLamp.wrapper, true).length > 0) {
      window._deskLamp.on = !window._deskLamp.on;
      const intensity = window._deskLamp.on ? 1.5 : 0;
      window._deskLamp.light.intensity = intensity;
      window._deskLamp.meshes.forEach((m) => {
        m.material.emissiveIntensity = window._deskLamp.on ? 4.0 : 0;
      });
      switchSound.currentTime = 0;
      switchSound.play().catch(() => {});
      return;
    }
  }

  // ── Curtain open ──
  if (window._curtain && window._curtain.wrapper && !window._curtain.opened) {
    if (raycaster.intersectObject(window._curtain.wrapper, true).length > 0) {
      if (window._curtain.openClip && window._curtain.mixer) {
        // Stop wind animation, play open clip once
        if (window._curtain.windAction) window._curtain.windAction.stop();
        const openAction = window._curtain.mixer.clipAction(
          window._curtain.openClip,
        );
        openAction.setLoop(THREE.LoopOnce, 1);
        openAction.clampWhenFinished = true;
        openAction.reset();
        openAction.play();
        window._curtain.opened = true;
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
        x: tvPos.x - 2,
        y: tvPos.y + 0.5,
        z: tvPos.z + 1.5,
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
          x: tvPos.x - 2,
          y: tvPos.y + 0.5,
          z: tvPos.z + 1.5,
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

  // ── Speaker (plays creepAudio on click) ──
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
      } else {
        // Play the easter-egg track
        creepAudio.currentTime = 0;
        creepAudio.play().catch(() => {});
        returnCamera();
        speakerState.phase = 0;
      }
      return;
    }
  }

  // ── Click anywhere else while a focus is active → return camera ──
  if (!camState.transitioning) {
    if (
      tvState.phase !== 0 ||
      computerState.phase !== 0 ||
      speakerState.phase !== 0
    ) {
      returnCamera();
      tvState.phase = 0;
      computerState.phase = 0;
      speakerState.phase = 0;
    }
  }
});
