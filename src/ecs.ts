import { World } from "miniplex";
import { System } from "./engine/ecs/systems/system";
import { BaseEntity, world } from "./engine/ecs/entity";

type Entity = {
  superCool: true;
};

export const gameWorld = world as World<Partial<Entity & BaseEntity>>;

class One extends System {
  readonly q = {
    superCool: gameWorld.with("superCool"),
  };

  update(): void {
    for (const e of this.q.superCool) {
      //console.log(e);
    }
  }
}

export const systems = [One];
