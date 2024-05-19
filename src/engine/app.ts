import {
  ACESFilmicToneMapping,
  Clock,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";

import { resizeRendererToDisplaySize } from "./helpers/responsiveness";
import Stats from "three/examples/jsm/libs/stats.module";
import { System, systems as internalSystems } from "./ecs";

export abstract class App {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  scene: Scene;
  clock: Clock;
  stats: Stats;
  camera: PerspectiveCamera;
  systems: System[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    systems: { new (app: App): System }[]
  ) {
    this.canvas = canvas;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setAnimationLoop(this.internalUpdate.bind(this));
    this.scene = new Scene();
    this.clock = new Clock();
    this.stats = new Stats();

    this.camera = new PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(2, 2, 5);

    document.body.appendChild(this.stats.dom);

    for (const system of [...systems, ...internalSystems] as {
      new (app: App): System;
    }[]) {
      this.systems.push(new system(this));
    }
  }

  abstract update(): void;

  private internalUpdate(): void {
    this.stats.update();

    this.update();

    for (const system of this.systems) {
      system.update(this);
    }

    if (resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
