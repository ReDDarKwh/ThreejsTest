import {
  ACESFilmicToneMapping,
  Clock,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";

import { resizeRendererToDisplaySize } from "./helpers/responsiveness";
import Stats from "three/examples/jsm/libs/stats.module";
import { System, systems as internalSystems } from "./ecs/systems/system";

import Control from "./control";
import { Octree } from "three/examples/jsm/Addons";
import initJolt from "jolt-physics";
import joltWasmUrl from "jolt-physics/jolt-physics.wasm.wasm?url";

export const Jolt = await initJolt({
  locateFile: () => joltWasmUrl,
});

export const LAYER_NON_MOVING = 0;
export const LAYER_MOVING = 1;
export const NUM_OBJECT_LAYERS = 2;

export abstract class App {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  scene: Scene;
  clock: Clock;
  stats: Stats;
  camera: PerspectiveCamera;
  systems: System[] = [];
  worldOctree = new Octree();
  control: Control;

  jolt!: initJolt.JoltInterface;
  physicsSystem!: initJolt.PhysicsSystem;
  bodyInterface!: initJolt.BodyInterface;

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

    this.control = new Control(this.canvas);

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

    this.initPhysics();
  }

  abstract update(dt: number): void;

  private internalUpdate(): void {
    const dt = Math.min(this.clock.getDelta(), 0.033);
    this.update(dt);

    for (const system of this.systems) {
      system.update(this, dt);
    }

    this.updatePhysics(dt);
    this.control.update();
    this.renderer.render(this.scene, this.camera);

    if (resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }

    this.stats.update();
  }

  initPhysics() {
    // Initialize Jolt
    const settings = new Jolt.JoltSettings();
    this.setupCollisionFiltering(settings);
    this.jolt = new Jolt.JoltInterface(settings);
    Jolt.destroy(settings);
    this.physicsSystem = this.jolt.GetPhysicsSystem();
    this.bodyInterface = this.physicsSystem.GetBodyInterface();
    this.physicsSystem.SetGravity(new Jolt.Vec3(0, -25, 0));
  }

  setupCollisionFiltering(settings: initJolt.JoltSettings) {
    // Object layers

    // Layer that objects can be in, determines which other objects it can collide with
    // Typically you at least want to have 1 layer for moving bodies and 1 layer for static bodies, but you can have more
    // layers if you want. E.g. you could have a layer for high detail collision (which is not used by the physics simulation
    // but only if you do collision testing).
    let objectFilter = new Jolt.ObjectLayerPairFilterTable(NUM_OBJECT_LAYERS);
    objectFilter.EnableCollision(LAYER_NON_MOVING, LAYER_MOVING);
    objectFilter.EnableCollision(LAYER_MOVING, LAYER_MOVING);

    // Each broadphase layer results in a separate bounding volume tree in the broad phase. You at least want to have
    // a layer for non-moving and moving objects to avoid having to update a tree full of static objects every frame.
    // You can have a 1-on-1 mapping between object layers and broadphase layers (like in this case) but if you have
    // many object layers you'll be creating many broad phase trees, which is not efficient.
    const BP_LAYER_NON_MOVING = new Jolt.BroadPhaseLayer(0);
    const BP_LAYER_MOVING = new Jolt.BroadPhaseLayer(1);
    const NUM_BROAD_PHASE_LAYERS = 2;
    let bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(
      NUM_OBJECT_LAYERS,
      NUM_BROAD_PHASE_LAYERS
    );
    bpInterface.MapObjectToBroadPhaseLayer(
      LAYER_NON_MOVING,
      BP_LAYER_NON_MOVING
    );
    bpInterface.MapObjectToBroadPhaseLayer(LAYER_MOVING, BP_LAYER_MOVING);

    settings.mObjectLayerPairFilter = objectFilter;
    settings.mBroadPhaseLayerInterface = bpInterface;
    settings.mObjectVsBroadPhaseLayerFilter =
      new Jolt.ObjectVsBroadPhaseLayerFilterTable(
        settings.mBroadPhaseLayerInterface,
        NUM_BROAD_PHASE_LAYERS,
        settings.mObjectLayerPairFilter,
        NUM_OBJECT_LAYERS
      );
  }

  updatePhysics(dt: number) {
    // When running below 55 Hz, do 2 steps instead of 1
    var numSteps = dt > 1.0 / 0.01818 ? 2 : 1;
    // Step the physics world
    this.jolt.Step(dt, numSteps);
  }

  createBox(
    position: initJolt.Vec3,
    rotation: initJolt.Quat,
    halfExtent: initJolt.Vec3,
    motionType: initJolt.EMotionType,
    layer: number
  ) {
    let shape = new Jolt.BoxShape(halfExtent, 0.05);
    let creationSettings = new Jolt.BodyCreationSettings(
      shape,
      position,
      rotation,
      motionType,
      layer
    );

    creationSettings.mFriction = 0.1;
    creationSettings.mOverrideMassProperties =
      Jolt.EOverrideMassProperties_CalculateInertia;
    creationSettings.mMassPropertiesOverride.mMass = 1;

    let body = this.bodyInterface.CreateBody(creationSettings);
    Jolt.destroy(creationSettings);
    return body;
  }

  wrapVec3 = (v: initJolt.RVec3) => new Vector3(v.GetX(), v.GetY(), v.GetZ());
  wrapQuat = (q: initJolt.Quat) =>
    new Quaternion(q.GetX(), q.GetY(), q.GetZ(), q.GetW());
}
