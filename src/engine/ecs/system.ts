import { App } from "../app";

export abstract class System {
  abstract update(app: App): void;
}
