export const floorWidth = 12;

export type randomGeometry = "sphere" | "cone" | "box";

export type PointPosition = {
  x: number;
  y: number;
  z: number;
};

export type ObjectBody = {
  id: string;
  geometry: randomGeometry;
  position: [number, number, number];
  randomScale: number;
};

export const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const buildRandomVertexPosition = (): [number, number, number] => {
  return [
    getRandomNumber(-floorWidth, floorWidth),
    getRandomNumber(12, 20),
    getRandomNumber(-floorWidth, floorWidth),
  ];
};
