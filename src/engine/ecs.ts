import { World } from "miniplex";
import { Object3D, Vector3 } from "three";
import { App } from "./app";
import { Capsule } from "three/examples/jsm/Addons";

export type BaseEntity = {
  node: Object3D;
  parentNode: Object3D;
  velocity: Vector3;
  playerController: true;
};

export const world = new World<Partial<BaseEntity>>();

export abstract class System {
  /**
   *
   */
  constructor(_app: App) {}
  abstract update(app: App, dt: number): void;
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

class PlayerControllerSystem extends System {
  readonly q = {
    playerController: world.with("playerController", "velocity"),
  };

  constructor(app: App) {
    super(app);

    this.q.playerController.onEntityAdded.subscribe(() => {
      app.inputs.down.on("click", () => {
        app.canvas.requestPointerLock();
      });
    });
  }

  update(app: App, dt: number): void {
    for (const pc of this.q.playerController) {
      if (document.pointerLockElement === app.canvas) {
        app.camera.rotation.y -= app.inputs.pointerState.dx / 500;
        app.camera.rotation.x -= app.inputs.pointerState.dy / 500;

        app.camera.rotation.x = Math.max(
          Math.min(app.camera.rotation.x, Math.PI / 2),
          -Math.PI / 2
        );
      }
    }
  }
}

export const systems = [Object3DSystem, PlayerControllerSystem];
