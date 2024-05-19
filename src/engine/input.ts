import { GameInputs } from "game-inputs";
import { CONFIG } from "./config/config";

export default class Input {
  inputs: GameInputs;

  constructor(domElement: HTMLElement) {
    this.inputs = new GameInputs(domElement, {
      preventDefaults: true,
      allowContextMenu: false,
      stopPropagation: false,
      disabled: false,
    });

    for (const [action, keys] of Object.entries(CONFIG.input.mappings)) {
      for (const key of keys) {
        this.inputs.bind(action, key);
      }
    }
  }

  update() {
    this.inputs.tick();
  }
}
