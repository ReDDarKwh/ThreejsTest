import { App } from "./engine/app";
import { System } from "./engine/ecs/system";
import { BaseEntity } from "./engine/ecs/entity";
import { world } from "./engine/ecs/entity";
import { World } from "miniplex";

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

export default [One];
