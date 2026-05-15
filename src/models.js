import * as THREE from "three";
import { scene, gltfLoader } from "./renderer.js";
import { winCX, winCY, winH } from "./room.js";

// ─────────────────────────────────────────────
// Ceiling Lamp
// ─────────────────────────────────────────────
window._ceilingLamp = { wrapper: null, on: true };
gltfLoader.load(
  "/ceiling lamp.glb",
  (gltf) => {
    const inner = gltf.scene;

    const rawBox = new THREE.Box3().setFromObject(inner);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const scale = 1 / Math.max(rawSize.x, rawSize.y, rawSize.z);
    inner.scale.setScalar(scale);
    inner.rotation.y = -2;

    const wrapper = new THREE.Group();
    wrapper.add(inner);
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const box2 = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.set(0, 3 - box2.max.y, 0);

    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    scene.add(wrapper);
    window._ceilingLamp.wrapper = wrapper;
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
      }
    });
    scene.add(wrapper);
  },
  undefined,
  (err) => console.error("Bed load error:", err),
);

// ─────────────────────────────────────────────
// Computer
// Table surface: center (4.48, -1.45, -1.5)
// ─────────────────────────────────────────────
const deskY = -1.45;
const deskX = 4.48;
const deskZ = -1.5;

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
      }
    });
    scene.add(wrapper);
    window._computer.wrapper = wrapper;

    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(inner);
      window._computer.mixer = mixer;
      window._computer.clip = gltf.animations[0];
    }

    // SpotLight shining from the screen toward the room
    const screenSpot = new THREE.SpotLight(
      0x88ccff,
      18,
      6,
      Math.PI / 6,
      0.5,
      2,
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

    const neonColor = new THREE.Color(0xff2ef7); // pink/magenta neon
    const neonMeshes = [];
    wrapper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.material = new THREE.MeshStandardMaterial({
          color: neonColor,
          emissive: neonColor,
          emissiveIntensity: 6.0,
          roughness: 0.4,
          metalness: 0.0,
        });
        neonMeshes.push(child);
      }
    });
    scene.add(wrapper);

    // PointLight to cast neon glow into the room
    const neonLight = new THREE.PointLight(0xff2ef7, 6, 8);
    neonLight.position.set(
      wrapper.position.x - 0.3,
      wrapper.position.y,
      wrapper.position.z + 0.5,
    );
    scene.add(neonLight);

    // Flicker state — accessed by animate loop via window
    window._neonFlicker = {
      light: neonLight,
      meshes: neonMeshes,
      timer: 0,
      flickering: false,
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
      }
    });
    scene.add(wrapper);
    window._curtain.wrapper = wrapper;

    // Soft daylight leaking through the curtain into the room
    const curtainLight = new THREE.PointLight(0xb8d4f0, 2.5, 8, 1.8);
    curtainLight.position.set(winCX, winCY, -2.1);
    scene.add(curtainLight);
    window._curtainLight = curtainLight; // used by thunder flash in animate loop

    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(wrapper);
      window._curtainMixer = mixer;
      window._curtain.mixer = mixer;

      // Idle wind sway — loops continuously
      const windClip =
        gltf.animations.find((a) => a.name === "Armature|Vento Forte") ||
        gltf.animations[0];
      const windAction = mixer.clipAction(windClip);
      windAction.setLoop(THREE.LoopRepeat, Infinity);
      windAction.play();
      window._curtain.windAction = windAction;

      // Open clip — triggered on click
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
      }
    });
    scene.add(wrapper);

    // Derive world-space table surface for lamp placement
    const miniTableTopY = wrapper.position.y + box2.max.y;
    const miniTableCenterX = wrapper.position.x;
    const miniTableCenterZ = wrapper.position.z;

    // --- Desk Lamp on top of mini table ---
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
          }
        });
        scene.add(lWrapper);

        // PointLight shining from the lamp shade downward
        const tableLight = new THREE.PointLight(0xffaa33, 1.5, 3);
        tableLight.position.set(
          lWrapper.position.x,
          lWrapper.position.y + lBox2.max.y,
          lWrapper.position.z,
        );
        tableLight.castShadow = false;
        scene.add(tableLight);

        window._deskLamp = {
          wrapper: lWrapper,
          light: tableLight,
          meshes: lampMeshes,
          on: true,
        };
      },
      undefined,
      (err) => console.error("Lamp load error:", err),
    );
  },
  undefined,
  (err) => console.error("Mini table load error:", err),
);
