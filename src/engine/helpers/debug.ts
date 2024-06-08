import {
  BufferGeometry,
  ColorRepresentation,
  Line,
  LineBasicMaterial,
  Vector3,
} from "three";

export function createLine(
  from: Vector3,
  to: Vector3,
  color: ColorRepresentation
) {
  const material = new LineBasicMaterial({ color: color });
  const points: Vector3[] = [];
  points.push(from);
  points.push(to);
  const geometry = new BufferGeometry().setFromPoints(points);
  const line = new Line(geometry, material);
  return line;
}
