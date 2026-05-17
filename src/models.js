// models.js
// Loads every GLTF model asynchronously and places it in the scene.
// This module has no exports — it works entirely through side effects.
// Each loaded model is stored on window._xxx so animate.js and controls.js can
// reference it without creating a direct import dependency on this module.
//
// All models follow the same normalisation pattern:
//   1. Compute the raw bounding box to find the model’s world-space size
//   2. Scale it to a target world-space size
//   3. Wrap it in a Group so the pivot is the group origin
//   4. Centre the inner model inside the group
//   5. Position the group in world space (snap to floor, wall, etc.)

import * as THREE from "three";
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
  SAH,
} from "three-mesh-bvh";
import { scene, gltfLoader } from "./renderer.js";
import { winCX, winCY, winH } from "./room.js"; // needed for curtain placement

// Patch Three.js prototypes once so every BufferGeometry can build a BVH
// and every Mesh uses the accelerated raycast path automatically.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// ─────────────────────────────────────────────
// Ceiling Lamp
// ─────────────────────────────────────────────
// Initialise to { wrapper: null } immediately so controls.js can safely check
// window._ceilingLamp.wrapper before the async load completes.
window._ceilingLamp = { wrapper: null, on: true };
gltfLoader.load(
  "/ceiling lamp.glb",
  (gltf) => {
    const inner = gltf.scene;

    // Normalise to 1 unit on its longest axis
    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -2; // slight rotation so cord faces toward the room

    // Wrap and centre
    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center); // move inner so group bbox is centred at origin

    // Hang from the ceiling (y = 3)
    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.set(0, 3 - box2.max.y, 0); // ceiling centre, x/z = 0

    // Shadow casting disabled — the lamp is small and high up; any shadows it
    // casts on itself are invisible and the cost isn’t worth it.
    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);
    window._ceilingLamp.wrapper = wrapper; // expose for controls.js raycasting
  },
  undefined,
  (err) => console.error("Ceiling lamp load error:", err),
);

// ─────────────────────────────────────────────
// Bed
// ─────────────────────────────────────────────
gltfLoader.load(
  "/bed.glb",
  (gltf) => {
    const inner = gltf.scene;

    // Scale so the longest horizontal dimension = 4.5 units
    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 4.5 / Math.max(rawSize.x, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = 0;

    // Center the inner model at origin inside a wrapper
    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const centeredBox = new THREE.Box3().setFromObject(wrapper);
    const center = centeredBox.getCenter(new THREE.Vector3());
    inner.position.sub(center); // shift so wrapper bbox is centered at 0

    // Snap to walls
    const box = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.x = -5 - box.min.x; // left side touches left wall
    wrapper.position.z = -2 - box.min.z; // headboard touches back wall
    wrapper.position.y = -3 - box.min.y; // sits on floor

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Bed load error:", err),
);

// ─────────────────────────────────────────────
// Computer
// Table surface centre: (4.48, -1.45, -1.5) — matches room.js tableTop
// ─────────────────────────────────────────────
// deskY/deskX/deskZ mirror the tableTop position in room.js so the computer
// sits flush on the surface without needing to import the table geometry.
const deskY = -1.45; // table surface Y (top face of 0.1-thick top at y=-1.5)
const deskX = 4.48; // table centre X
const deskZ = -1.5; // table centre Z

window._computer = { wrapper: null, mixer: null, clip: null };
gltfLoader.load(
  "/computer.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 2 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -Math.PI / 2; // face toward the bed (left wall direction)

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    // Place on table surface
    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.set(deskX, deskY - box2.min.y, deskZ);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Make screen mesh emissive blue-white
        if (child.material) {
          child.material.emissive = new THREE.Color(0x88ccff);
          child.material.emissiveIntensity = 4.0;
        }
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);
    window._computer.wrapper = wrapper;

    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(inner);
      window._computer.mixer = mixer;
      window._computer.clip = gltf.animations[0];
    }

    // SpotLight to simulate the glow cast by the screen onto the keyboard and desk surface
    const screenSpot = new THREE.SpotLight(
      0x88ccff, // blue-white screen colour
      18, // intensity — bright enough to cast visible shadows
      6, // reach
      Math.PI / 6, // narrow cone
      0.5, // penumbra soften
      2, // quadratic decay
    );
    screenSpot.position.set(
      wrapper.position.x - 0.8,
      wrapper.position.y + 0.6,
      wrapper.position.z,
    );
    screenSpot.target.position.set(
      wrapper.position.x - 3,
      wrapper.position.y - 0.5,
      wrapper.position.z,
    );
    screenSpot.castShadow = false;
    scene.add(screenSpot);
    scene.add(screenSpot.target);
  },
  undefined,
  (err) => console.error("Computer load error:", err),
);

// ─────────────────────────────────────────────
// Plant (next to table)
// ─────────────────────────────────────────────
gltfLoader.load(
  "/plant.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Place on floor, just in front of the table's left-front corner
    wrapper.position.set(4.7, -3 - box2.min.y, -0.2);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Plant load error:", err),
);

// ─────────────────────────────────────────────
// Speaker (next to plant)
// ─────────────────────────────────────────────
window._speaker = { wrapper: null };
gltfLoader.load(
  "/speaker.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1.7 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = Math.PI;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.set(2.8, -3 - box2.min.y, 1.5);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);
    window._speaker.wrapper = wrapper;
  },
  undefined,
  (err) => console.error("Speaker load error:", err),
);

// ─────────────────────────────────────────────
// Chair (in front of table)
// ─────────────────────────────────────────────
gltfLoader.load(
  "/chair.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1.9 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = Math.PI / 4; // face left wall, rotated 45°

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Place on floor, in front of table's front edge
    wrapper.position.set(3.2, -3 - box2.min.y, -2);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Chair load error:", err),
);

// ─────────────────────────────────────────────
// TV (on the floor, against the back wall, right of window)
// ─────────────────────────────────────────────
window._tv = { wrapper: null, mixer: null, clip: null };
gltfLoader.load(
  "/tv.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 2.5 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -Math.PI / 2; // face toward the camera

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.x = 0.5;
    wrapper.position.y = -3 - box2.min.y;
    wrapper.position.z = -1 - box2.min.z;

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);

    window._tv.wrapper = wrapper;
    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(inner);
      window._tv.mixer = mixer;
      window._tv.clip = gltf.animations[0];
    }
  },
  undefined,
  (err) => console.error("TV load error:", err),
);

// ─────────────────────────────────────────────
// Neon Sign (back wall, right of window)
// ─────────────────────────────────────────────
gltfLoader.load(
  "/neon sign.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 2.9 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = Math.PI / 2; // face toward the room

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Mount on back wall, right of window (window right edge ~x=0.25)
    wrapper.position.x = 2.5;
    wrapper.position.y = 0.5; // mid-upper height
    wrapper.position.z = -2.7 - box2.max.z + 0.02; // flush against back wall

    const neonColor = new THREE.Color(0xff2ef7); // hot pink/magenta
    const neonMeshes = [];
    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false; // neon tubes are thin — cost outweighs benefit
        child.receiveShadow = false;
        child.material = new THREE.MeshStandardMaterial({
          color: neonColor,
          emissive: neonColor,
          emissiveIntensity: 6.0, // high intensity so it’s clearly self-luminous
          roughness: 0.4,
          metalness: 0.0,
        });
        neonMeshes.push(child);
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);

    // PointLight: range=8 so the glow falls off before reaching the ceiling
    const neonLight = new THREE.PointLight(0xff2ef7, 6, 8);
    neonLight.position.set(
      wrapper.position.x - 0.3,
      wrapper.position.y,
      wrapper.position.z + 0.5, // slightly in front of the sign
    );
    scene.add(neonLight);

    // Flicker state — animate.js reads window._neonFlicker each frame
    window._neonFlicker = {
      light: neonLight,
      meshes: neonMeshes,
      timer: 0, // frames until next state change
      flickering: false, // false = quiet period, true = rapid on/off burst
    };
  },
  undefined,
  (err) => console.error("Neon sign load error:", err),
);

// ─────────────────────────────────────────────
// Posters (right wall)
// ─────────────────────────────────────────────
gltfLoader.load(
  "/posters.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 3.5 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -Math.PI / 2; // face left toward room interior

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Mount just inside right wall, centered in z, at mid height
    wrapper.position.x = 5 - box2.max.x - 0.05;
    wrapper.position.y = 0.5;
    wrapper.position.z = -1;

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = true;
        // Keep original material, slightly dim the color
        if (child.material) {
          child.material.color.multiplyScalar(0.25);
        }
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Posters load error:", err),
);

// ─────────────────────────────────────────────
// Curtain (hanging at window)
// ─────────────────────────────────────────────
window._curtain = {
  wrapper: null,
  mixer: null,
  windAction: null,
  openClip: null,
  opened: false,
};
gltfLoader.load(
  "/curtain.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 5.5 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = 0;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.x = winCX - 0.9;
    wrapper.position.y = winCY + winH / 1.5 - box2.max.y;
    wrapper.position.z = -2.25 + 0.05;

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);
    window._curtain.wrapper = wrapper;

    // Soft blue-grey daylight leaking through the curtain fabric
    const curtainLight = new THREE.PointLight(0xb8d4f0, 2.5, 8, 1.8);
    curtainLight.position.set(winCX, winCY, -2.1);
    scene.add(curtainLight);
    window._curtainLight = curtainLight; // thunder flash in animate.js overrides .intensity

    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(wrapper);
      window._curtainMixer = mixer;
      window._curtain.mixer = mixer;

      // "Vento Forte" = strong wind — idle sway that plays on loop continuously
      const windClip =
        gltf.animations.find((a) => a.name === "Armature|Vento Forte") ||
        gltf.animations[0];
      const windAction = mixer.clipAction(windClip);
      windAction.setLoop(THREE.LoopRepeat, Infinity);
      windAction.play();
      window._curtain.windAction = windAction; // stored so controls.js can stop it on open

      // "Abrindo" = opening — plays once when the user clicks the curtain
      window._curtain.openClip =
        gltf.animations.find((a) => a.name === "Armature|Abrindo") || null;
    }
  },
  undefined,
  (err) => console.error("Curtain load error:", err),
);

// ─────────────────────────────────────────────
// Mini Table + Desk Lamp (next to bed, against left wall)
// ─────────────────────────────────────────────
gltfLoader.load(
  "/minitable.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = 0;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    // Snap to left wall (x), sit on floor (y), place beside the bed foot (z)
    wrapper.position.x = -4.7 - box2.min.x; // flush left wall
    wrapper.position.y = -3 - box2.min.y; // sit on floor
    wrapper.position.z = -3 + 3.5 - box2.min.z; // beside bed foot (bed depth ~3.5)

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeBoundsTree({ strategy: SAH });
      }
    });
    scene.add(wrapper);

    // Derive world-space table surface for lamp placement
    const miniTableTopY = wrapper.position.y + box2.max.y;
    const miniTableCenterX = wrapper.position.x;
    const miniTableCenterZ = wrapper.position.z;

    // --- Desk Lamp on top of mini table ---
    // Loaded inside the minitable callback so we can use the computed
    // miniTableTopY / center values directly, avoiding a second bounding-box query.
    gltfLoader.load(
      "/lamp.glb",
      (gltf2) => {
        const lInner = gltf2.scene;

        const lRaw = new THREE.Box3().setFromObject(lInner);
        const lRawSize = lRaw.getSize(new THREE.Vector3());
        const lScale = 0.8 / Math.max(lRawSize.x, lRawSize.y, lRawSize.z);
        lInner.scale.setScalar(lScale);
        lInner.rotation.y = 0;

        const lWrapper = new THREE.Group();
        lWrapper.add(lInner);
        const lBox = new THREE.Box3().setFromObject(lWrapper);
        const lCenter = lBox.getCenter(new THREE.Vector3());
        lInner.position.sub(lCenter);

        const lBox2 = new THREE.Box3().setFromObject(lWrapper);
        lWrapper.position.set(
          miniTableCenterX,
          miniTableTopY - lBox2.min.y,
          miniTableCenterZ,
        );

        const lampMeshes = [];
        lWrapper.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffdd88,
              emissive: new THREE.Color(0xffaa33),
              emissiveIntensity: 4.0,
              roughness: 0.6,
              metalness: 0.1,
            });
            lampMeshes.push(child);
            child.geometry.computeBoundsTree({ strategy: SAH });
          }
        });
        scene.add(lWrapper);

        // PointLight shining downward from under the lamp shade
        const tableLight = new THREE.PointLight(0xffaa33, 1.5, 3);
        tableLight.position.set(
          lWrapper.position.x,
          lWrapper.position.y + lBox2.max.y, // top of the lamp
          lWrapper.position.z,
        );
        tableLight.castShadow = false; // small area light — shadow cost not justified
        scene.add(tableLight);

        // Expose for controls.js toggle (on/off switch click interaction)
        window._deskLamp = {
          wrapper: lWrapper,
          light: tableLight,
          meshes: lampMeshes,
          on: true, // start on
        };
      },
      undefined,
      (err) => console.error("Lamp load error:", err),
    );
  },
  undefined,
  (err) => console.error("Mini table load error:", err),
);
