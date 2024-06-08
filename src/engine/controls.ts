import { GameInputs } from "game-inputs";
import { CONFIG } from "./config/config";
import { Vector3 } from "three";

export default class Controls {
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

  getDirection() {
    const forward = Number(this.inputs.state["forward"]) * 1 + Number(this.inputs.state["backward"]) * -1;
		const right = Number(this.inputs.state["right"]) * 1 + Number(this.inputs.state["left"]) * -1;
		return new Vector3(right, 0, -forward)
  }

  update() {
    this.inputs.tick();
  }
}
