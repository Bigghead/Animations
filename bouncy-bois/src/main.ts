import * as three from "three";
import Stats from "stats.js";
import GUI from "lil-gui";
import {
  floorWidth,
  WorkerEnum,
  type WorldObjects,
  type MeshPool,
  type PointPosition,
} from "./lib/constants";
import { createMesh, disposeMesh } from "./lib/three-helper";
import { GUIManager } from "./lib/gui-manager";
import { ThreeCanvas } from "./lib/canvas";

const worker = new Worker(new URL("worker.ts", import.meta.url), {
  type: "module",
});

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

// Canvas
const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;
const threeCanvas = new ThreeCanvas(canvas);

// Object Containers
let worldObjects: Map<string, WorldObjects> = new Map();

let meshPool: MeshPool[] = [];

let sharedFloatArray: Float32Array | null = null;

/**
 * GUI Functions
 */
const guiManager = new GUIManager(
  meshPool,
  worldObjects,
  threeCanvas.scene,
  worker,
  threeCanvas.directionalLighthelper,
  threeCanvas.shadowHelper
);
const gui = new GUI();

gui.add(guiManager, "createObject").name("Add Ball");
gui.add(guiManager, "tipFloor").name("Tip Floor");
gui.add(guiManager, "resetFloor").name("Reset Floor");
gui.add(guiManager, "makeItRain").name("Make It Rain!");

// we're going to use this to check performance later
// like defaulting to 1 to make that CPU work
gui
  .add(guiManager, "rainSpeedTimer", 5, 100, 5)
  .name("Rain Speed!")
  .onFinishChange((speed: number) => {
    guiManager.updateRain(speed, guiManager.rainingDuration);
  });

gui
  .add(guiManager, "rainingDuration", 1, 60, 1)
  .name("Rain Duration ( Seconds )")
  .onFinishChange((duration: number) => {
    guiManager.updateRain(guiManager.rainSpeedTimer, duration);
  });

gui.add(guiManager, "clearRain").name("Stop Rain!");
gui.add(guiManager, "toggleShadowhelper").name("Toggle Shadow Helper");

/**
 * Worker Actions
 */

const initStartingObjects = (): void => {
  Array.from({ length: 20 }).forEach(() => {
    const threeMesh = createMesh("sphere");
    worldObjects.set(threeMesh.id, threeMesh);
    threeCanvas.scene.add(threeMesh.mesh);
  });

  worker.postMessage({
    type: WorkerEnum.ADD_OBJECTS,
    payload: {
      data: Array.from(worldObjects.values()).map(({ id, geometry, mesh }) => ({
        id,
        geometry,
        position: mesh.position.toArray(),
        randomScale: mesh.scale.x,
      })),
    },
  });
};

const udpateAndSyncMeshBodies = ({
  buffer,
  ids,
  count,
}: {
  buffer: SharedArrayBuffer;
  ids: string[];
  count: number;
}): void => {
  const objectCount = count;

  if (!sharedFloatArray || sharedFloatArray.buffer !== buffer) {
    sharedFloatArray = new Float32Array(buffer);
  }

  let i = 0;
  for (let objIdx = 0; objIdx < objectCount; objIdx++) {
    const id = ids[objIdx];
    // 3 slices for each position x/y/z
    const px = sharedFloatArray[i++];
    const py = sharedFloatArray[i++];
    const pz = sharedFloatArray[i++];
    // 4 slices for rapier rotation x/y/z/w
    const rx = sharedFloatArray[i++];
    const ry = sharedFloatArray[i++];
    const rz = sharedFloatArray[i++];
    const rw = sharedFloatArray[i++];
    const mesh = worldObjects.get(id.toString())?.mesh;

    if (mesh) {
      mesh.position.set(px, py, pz);
      mesh.quaternion.set(rx, ry, rz, rw);
    }
  }
};

const updateAndRotateFloor = ({
  newFloorRotationX,
  translation,
  rotation,
}: {
  newFloorRotationX: number;
  translation: PointPosition;
  rotation: PointPosition & { w: number };
}): void => {
  guiManager.floorRotationX = newFloorRotationX;
  floor.position.copy(translation);
  floor.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
};

const removeInactiveMeshBodies = ({ ids }: { ids: string[] }): void => {
  ids.forEach((id: string) => {
    const meshObject = worldObjects.get(id);
    if (meshObject) {
      worldObjects.delete(id);
      threeCanvas.scene.remove(meshObject.mesh);
      disposeMesh(meshObject.mesh);
    }
  });
};

const checkAndRemoveFallingObjects = (): void => {
  worldObjects.forEach(({ id, geometry, mesh }) => {
    // get rid of object if it's below floor ( assuming cause it fell off the sides )
    if (mesh.position.y <= -20) {
      worldObjects.delete(id);

      const workerMessage = {
        type: WorkerEnum.REMOVE_BODY,
        payload: {
          id,
          reusable: false,
        },
      };

      meshPool.push({ id, geometry, mesh });
      mesh.visible = false;
      workerMessage.payload.reusable = true;

      worker.postMessage(workerMessage);
    }
  });
};

const worldStepTick = (timeDelta: number): void => {
  worker.postMessage({
    type: WorkerEnum.WORLD_STEP,
    payload: {
      isFloorAnimating: guiManager.isFloorAnimating,
      floorRotationX: guiManager.floorRotationX,
      endFloorRotationAngle: guiManager.endFloorRotationAngle,
      timeDelta,
      isRaining: guiManager.isRaining,
      rainSpeedTimer: guiManager.rainSpeedTimer,
    },
  });
};

/**
 *
 * Worker Message Capture
 */
worker.onmessage = ({ data: { type, payload } }) => {
  if (type === WorkerEnum.RAPIER_READY) {
    initStartingObjects();
  }

  if (type === WorkerEnum.UPDATE_MESHES) {
    udpateAndSyncMeshBodies(payload);
  }

  if (type === WorkerEnum.ROTATE_FLOOR) {
    updateAndRotateFloor(payload);
  }

  if (type === WorkerEnum.REMOVE_INACTIVES) {
    removeInactiveMeshBodies(payload);
  }
};

const floorGeometry = new three.BoxGeometry(
  floorWidth * 2,
  0.1,
  floorWidth * 2
);
const floorMaterial = new three.MeshStandardMaterial({
  color: "#fff4ce",
  metalness: 0.3,
  roughness: 0.4,
  envMapIntensity: 0.5,
});

// forgot standard material needs lighting
const floor = new three.Mesh(floorGeometry, floorMaterial);
floor.receiveShadow = true;
threeCanvas.scene.add(floor);

window.addEventListener("resize", () => {
  threeCanvas.resizeCanvas();
});

/**
 * Animate
 */
const clock = new three.Clock();
let deltaTime = 0; // for smnoother rotation of the fllor
const fpsCap = 240; // capping this at my personal monitor max, idk what this looks like at higher refresh rates
const fpsInterval = 1 / fpsCap; // how many miiliseconds per frame
let fpsDelta = 0;

const tick = (): void => {
  window.requestAnimationFrame(tick);

  stats.begin();
  fpsDelta += clock.getDelta();
  if (fpsDelta < fpsInterval) return;

  const elapsedTime = clock.getElapsedTime();
  const timeDelta = elapsedTime - deltaTime;
  deltaTime = elapsedTime;

  fpsDelta = fpsDelta % fpsInterval;

  threeCanvas.controls.update();

  worldStepTick(timeDelta);
  checkAndRemoveFallingObjects();

  threeCanvas.renderer.render(threeCanvas.scene, threeCanvas.camera);
  stats.end();
};

tick();
