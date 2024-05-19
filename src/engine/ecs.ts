import { World } from "miniplex";
import { Object3D } from "three";
import { App } from "./app";

export type BaseEntity = {
  node: Object3D;
  parentNode: Object3D;
};

export const world = new World<Partial<BaseEntity>>();

export abstract class System {
  /**
   *
   */
  constructor(_app: App) {}
  abstract update(app: App): void;
}

class Object3DSystem extends System {
  readonly q = {
    object3D: world.with("node"),
  };

  constructor(app: App) {
    super(app);

    this.q.object3D.onEntityAdded.subscribe(({ node, parentNode }) => {
      (parentNode || app.scene).add(node);
    });

    this.q.object3D.onEntityRemoved.subscribe(({ node, parentNode }) => {
      (parentNode || app.scene).remove(node);
    });
  }

  update(): void {}
}

export const systems = [Object3DSystem];
