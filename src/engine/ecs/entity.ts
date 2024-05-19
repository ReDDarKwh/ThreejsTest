import { World } from "miniplex";
import { Vector3 } from "three";

export type BaseEntity = {
    velocity: Vector3
};

export const world = new World<Partial<BaseEntity>>();
