import RAPIER from "@dimforge/rapier3d-compat";
import { floorWidth, type ObjectBody, type randomGeometry } from "./utils";

await RAPIER.init();

export const world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

const rapierFloor =
  RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0, 0);
const rapierFloorBody = world.createRigidBody(rapierFloor);
const floorColliderDesc = RAPIER.ColliderDesc.cuboid(
  floorWidth,
  0.001,
  floorWidth
).setRestitution(0.5);
world.createCollider(floorColliderDesc, rapierFloorBody);

postMessage({
  type: "Rapier Ready",
  payload: {
    floor: rapierFloorBody,
  },
});

type RapierBody = {
  id: string;
  rapierBody: RAPIER.RigidBody;
  rapierCollider: RAPIER.ColliderDesc;
};

let rapierBodies: Map<string, RapierBody> = new Map();

const createRapierBody = (
  id: string,
  geometry: randomGeometry,
  position: [number, number, number],
  randomScale: number
): RapierBody => {
  const [x, y, z] = position;
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setCanSleep(true)
    .setTranslation(x, y, z);
  const rapierBody = world.createRigidBody(rigidBodyDesc);
  let rapierCollider: RAPIER.ColliderDesc = RAPIER.ColliderDesc.ball(
    1 * randomScale
  );

  if (geometry === "box") {
    const halfExtent = (1 * randomScale) / 2;
    rapierCollider = RAPIER.ColliderDesc.cuboid(
      halfExtent,
      halfExtent,
      halfExtent
    );
  }

  rapierCollider.restitution = 0.5;
  world.createCollider(rapierCollider, rapierBody);
  return {
    id,
    rapierBody,
    rapierCollider,
  };
};

self.onmessage = ({ data: { type, payload } }) => {
  // console.log(type, payload);
  if (type === "Add Objects") {
    const { data } = payload;
    data.forEach(({ id, geometry, position, randomScale }: ObjectBody) => {
      rapierBodies.set(
        id,
        createRapierBody(id, geometry, position, randomScale)
      );
    });
  }

  if (type === "World Step") {
    if (!world) return;

    world.step();
    postMessage({
      type: "Update Meshes",
      payload: {
        data: Array.from(rapierBodies.values()).map((body) => {
          const translation = body.rapierBody.translation();
          const rotation = body.rapierBody.rotation();
          return {
            id: body.id,
            position: { x: translation.x, y: translation.y, z: translation.z },
            rotation: {
              x: rotation.x,
              y: rotation.y,
              z: rotation.z,
              w: rotation.w,
            },
          };
        }),
      },
    });

    const {
      isFloorAnimating,
      floorRotationX,
      endFloorRotationAngle,
      timeDelta,
    } = payload;

    if (isFloorAnimating) {
      if (floorRotationX <= endFloorRotationAngle) {
        const newFloorRotationX = floorRotationX + timeDelta * 0.1;
        const quat = new RAPIER.Quaternion(
          0,
          0,
          Math.sin(newFloorRotationX),
          Math.cos(newFloorRotationX)
        );

        rapierFloorBody.setRotation(quat, true);

        postMessage({
          type: "Rotate Floor",
          payload: {
            newFloorRotationX,
            translation: rapierFloorBody.translation(),
            rotation: rapierFloorBody.rotation(),
          },
        });
      }
    } else {
      // trippy rapier rotation, setting all 0s doesnt put it back to 0
      // needs that last 1 in the w param for some reason, but it works
      // rapierFloor.setRotation(new RAPIER.Quaternion(0, 0, 0, 1), true);
      rapierFloorBody.setRotation(new RAPIER.Quaternion(0, 0, 0, 1), true);
      postMessage({
        type: "Rotate Floor",
        payload: {
          newFloorRotationX: 0,
          translation: rapierFloorBody.translation(),
          rotation: rapierFloorBody.rotation(),
        },
      });
    }
  }

  if (type === "Remove Body") {
    const rigidBody = rapierBodies.get(payload.id);
    if (rigidBody) {
      world.removeRigidBody(rigidBody.rapierBody);
      rapierBodies.delete(payload.id);
    }
  }
};
