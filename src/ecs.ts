import { World } from "miniplex";
import { BaseEntity, System, world } from "./engine/ecs";

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
      console.log(e);
    }
  }
}

export const systems = [One];
