import * as THREE from "three";
import { scene } from "./renderer.js";

// --- Ceiling Lamp SpotLight (pointing straight down) ---
export const lampLight = new THREE.SpotLight(
  0xffd97d,
  40,
  18,
  Math.PI / 4,
  0.4,
  1.5,
);
lampLight.position.set(0, 2.8, 0);
lampLight.target.position.set(0, -3, 0); // aim at floor center
lampLight.castShadow = true;
lampLight.shadow.mapSize.width = 512;
lampLight.shadow.mapSize.height = 512;
scene.add(lampLight);
scene.add(lampLight.target);

// Very dim ambient so corners aren't pitch black
const ambient = new THREE.AmbientLight(0x221a10, 1);
scene.add(ambient);
