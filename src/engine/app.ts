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
import { System, systems as internalSystems } from "./ecs/systems/system";

import Controls from "./controls";
import { Physics } from "./physics";

export abstract class App {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  scene: Scene;
  clock: Clock;
  stats: Stats;
  camera: PerspectiveCamera;
  systems: System[] = [];
  controls: Controls;
  physics: Physics;

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
    this.physics = new Physics();
    this.scene = new Scene();
    this.clock = new Clock();
    this.stats = new Stats();

    this.controls = new Controls(this.canvas);

    this.camera = new PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(2, 2, 5);
    this.camera.rotation.order = "YXZ";

    document.body.appendChild(this.stats.dom);

    for (const system of [...systems, ...internalSystems] as {
      new (app: App): System;
    }[]) {
      this.systems.push(new system(this));
    }

    
  }

  abstract update(dt: number): void;

  private internalUpdate(): void {
    const dt = Math.min(this.clock.getDelta(), 0.033);
    this.update(dt);

    for (const system of this.systems) {
      system.update(this, dt);
    }

    this.physics.update(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }

    this.stats.update();
  }

  
}
