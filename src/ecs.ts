import { World } from "miniplex";
import { System } from "./engine/ecs/systems/system";
import { BaseEntity, world } from "./engine/ecs/entity";
import { App } from "./engine/app";
import { Physics } from "./engine/physics";
import { Color, Vector3 } from "three";
import { createLine } from "./engine/helpers/debug";

type Entity = {
  superCool: true;
};

export const gameWorld = world as World<Partial<Entity & BaseEntity>>;

class ShooterCharacterSystem extends System {
  readonly q = {
    e: gameWorld.with("characterController"),
  };

  constructor(app: App) {
    super(app);

    this.q.e.onEntityAdded.subscribe((e) => {
      app.controls.inputs.down.on("fire", () => {
        let forward = new Vector3();
        app.camera.getWorldDirection(forward);

        const line = createLine(
          app.camera.position,
          Physics.wrapVec3(e.characterController.character.GetPosition()).add(
            forward.multiplyScalar(100)
          ),
          new Color(1, 0, 0)
        );

        app.scene.add(line);

        console.log(forward)

        app.physics.castRay(
          app.camera.position,
          forward.normalize().multiplyScalar(100)
        );
      });
    });
  }

  update(): void {}
}

export const systems = [ShooterCharacterSystem];
