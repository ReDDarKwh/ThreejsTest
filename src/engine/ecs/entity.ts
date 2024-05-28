import { World } from "miniplex";
import { Object3D, Vector3 } from "three";
import initJolt from "jolt-physics";
import { CharacterControllerComponent } from "./components/characterControllerComponent";

export type BaseEntity = {
  node: Object3D;
  parentNode: Object3D;
  velocity: Vector3;
  characterController: CharacterControllerComponent;
  physics: { body: initJolt.Body; };
};

export const world = new World<Partial<BaseEntity>>();
