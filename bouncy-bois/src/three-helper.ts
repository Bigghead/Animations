import * as three from "three";
import {
  buildRandomVertexPosition,
  getRandomNumber,
  type randomGeometry,
} from "./utils";

/**
 * Textures
 */
const textureLoader = new three.TextureLoader();
const textureMap = Array.from({ length: 14 }).map((_, index) =>
  textureLoader.load(`/matcaps/${index + 1}.webp`)
);

const basicMaterial = new three.MeshMatcapMaterial({
  matcap: textureMap[0],
});

export const createMesh = (
  geometry: randomGeometry,
  position = buildRandomVertexPosition()
): {
  mesh: three.Mesh;
  geometry: randomGeometry;
  position: [number, number, number];
  randomScale: number;
  id: string;
} => {
  let body: three.BufferGeometry = new three.SphereGeometry(1);

  switch (geometry) {
    case "box":
      body = new three.BoxGeometry(1);
    // case "cone":
    //   body = new three.ConeGeometry(1);
    //   break;
  }
  const material = basicMaterial.clone();
  material.matcap = textureMap[getRandomNumber(1, textureMap.length)];
  const mesh = new three.Mesh(body, material);
  mesh.position.set(...position);

  const randomScale = Math.random() + 0.2;
  mesh.scale.set(randomScale, randomScale, randomScale);

  mesh.castShadow = true;

  return {
    mesh,
    geometry,
    position,
    randomScale,
    id: `mesh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };
};
