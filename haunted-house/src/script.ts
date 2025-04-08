import * as three from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/addons/misc/Timer.js";
import GUI from "lil-gui";

/**
 * Base
 */
// Debug
const gui = new GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl") as HTMLCanvasElement;

// Scene
const scene = new three.Scene();
scene.add(new three.AxesHelper(5));

// Textures
const textureLoader = new three.TextureLoader();

const floorTexture = textureLoader.load("/floor/alpha.jpg");
const coast_land = textureLoader.load("/floor/coast_land.jpg");
const coast_land_normal = textureLoader.load("/floor/coast_land_normal.png");
const mud_cracked_normal = textureLoader.load("/floor/mud_cracked-min.png");
const doorTexture = textureLoader.load("/door/color.jpg");
const doorNormal = textureLoader.load("/door/normal.jpg");
const doorAO = textureLoader.load("/door/ambientOcclusion.jpg");

const wallTexture = textureLoader.load("/textures/mixed_brick_wall.jpg");
const wallNormal = textureLoader.load("/textures/mixed_brick_wall_normal.png");
const wallAO = textureLoader.load("/textures/mixed_brick_wall_ao.png");
const roofTexture = textureLoader.load("/textures/herringbone_pavement.png");
coast_land.colorSpace = three.SRGBColorSpace;
doorTexture.colorSpace = three.SRGBColorSpace;
wallTexture.colorSpace = three.SRGBColorSpace;
/**
 * House
 */
// Temporary sphere
// const sphere = new three.Mesh(
//   new three.SphereGeometry(1, 32, 32),
//   new three.MeshStandardMaterial({ roughness: 0.7 })
// );

const house = new three.Group();
const houseMaterial = new three.MeshStandardMaterial({
  side: three.DoubleSide,
});

const walls = new three.Mesh(
  new three.BoxGeometry(4, 2.5, 4),
  new three.MeshStandardMaterial({
    map: wallTexture,
    normalMap: wallNormal,
    aoMap: wallAO,
  })
);
// centered at x-axis, move the y up by half the height of the geometry
walls.position.y = 2.5 / 2;

const roof = new three.Mesh(
  new three.ConeGeometry(3.5, 1.5, 4),
  new three.MeshStandardMaterial({
    map: roofTexture,
  })
);
// half of height of walls + walls position y ( walls height ) offset + height of roof
// 2.5 + 2 + 2.5
roof.position.y = (2.5 + 2.5 + 1.5) / 2;
roof.rotation.y = Math.PI / 4;

const door = new three.Mesh(
  new three.PlaneGeometry(1.5, 2),
  new three.MeshStandardMaterial({
    color: "red",
    side: three.DoubleSide,
    map: doorTexture,
    normalMap: doorNormal,
    aoMap: doorAO,
  })
);
// door.rotation.y = Math.PI;
door.position.set(0.01, 1 + 0.01, 4 / 2 + 0.01);
house.add(walls, roof, door);

// const floorGeometry = new three.PlaneGeometry(50, 50);
// floorGeometry.rotateX(-Math.PI / 2);
const floor = new three.Mesh(
  new three.PlaneGeometry(50, 50),
  new three.MeshStandardMaterial({
    color: "white",
    alphaMap: floorTexture,
    map: coast_land,
    normalMap: coast_land_normal,
    alphaTest: 0.5,
  })
);
// floor.position.set(0, -1, 0);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;

scene.add(house, floor);

// Bushes
const bushGeometry = new three.SphereGeometry(1, 16);
const bushMaterial = new three.MeshStandardMaterial();

const bushes: three.Mesh[] = [
  { scale: 0.5, position: [0.8, 0.2, 2.2] },
  { scale: 0.25, position: [1.4, 0.1, 2.1] },
  { scale: 0.4, position: [-0.8, 0.1, 2.2] },
  { scale: 0.15, position: [-1, 0.05, 2.6] },
].map(({ scale, position }) => {
  const bush = new three.Mesh(bushGeometry, bushMaterial);
  bush.scale.set(scale, scale, scale);
  bush.position.set(...position);
  return bush;
});
scene.add(...bushes);

/**
 * Lights
 */
// Ambient light
const ambientLight = new three.AmbientLight("#ffffff", 0.5);
scene.add(ambientLight);

// Directional light
const directionalLight = new three.DirectionalLight("#ffffff", 3);
directionalLight.position.set(4, 5, -8);
const directionalLightHelper = new three.DirectionalLightHelper(
  directionalLight
);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new three.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 4;
camera.position.y = 2;
camera.position.z = 5;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new three.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const timer = new Timer();

const tick = () => {
  // Timer
  timer.update();
  const elapsedTime = timer.getElapsed();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
