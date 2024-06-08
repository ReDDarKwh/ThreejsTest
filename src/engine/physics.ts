import joltWasmUrl from "jolt-physics/jolt-physics.wasm.wasm?url";
import initJolt from "jolt-physics";
import { Quaternion, Vector3 } from "three";

export const LAYER_NON_MOVING = 0;
export const LAYER_MOVING = 1;
export const NUM_OBJECT_LAYERS = 2;

export const Jolt = await initJolt({
  locateFile: () => joltWasmUrl,
});

export class Physics {
  jolt: initJolt.JoltInterface;
  physicsSystem: initJolt.PhysicsSystem;
  bodyInterface: initJolt.BodyInterface;

  ray: initJolt.RRayCast;
  rayCollector: initJolt.CastRayCollectorJS;
  raySettings: initJolt.RayCastSettings;
  rayShapeFilter: initJolt.ShapeFilter;
  rayBodyFilter: initJolt.BodyFilter;
  rayObjectFilter: initJolt.DefaultObjectLayerFilter;
  rayBpFilter: initJolt.DefaultBroadPhaseLayerFilter;
  rayHitBody?: initJolt.Body;

  constructor() {
    // Initialize Jolt
    const settings = new Jolt.JoltSettings();
    this.setupCollisionFiltering(settings);
    this.jolt = new Jolt.JoltInterface(settings);
    Jolt.destroy(settings);
    this.physicsSystem = this.jolt.GetPhysicsSystem();
    this.bodyInterface = this.physicsSystem.GetBodyInterface();
    this.physicsSystem.SetGravity(new Jolt.Vec3(0, -25, 0));

    this.ray = new Jolt.RRayCast();
    this.raySettings = new Jolt.RayCastSettings();
    this.rayBpFilter = new Jolt.DefaultBroadPhaseLayerFilter(
      this.jolt.GetObjectVsBroadPhaseLayerFilter(),
      LAYER_MOVING
    );
    this.rayObjectFilter = new Jolt.DefaultObjectLayerFilter(
      this.jolt.GetObjectLayerPairFilter(),
      LAYER_MOVING
    );
    this.rayBodyFilter = new Jolt.BodyFilter(); // We don't want to filter out any bodies
    this.rayShapeFilter = new Jolt.ShapeFilter(); // We don't want to filter out any shapes

    // Create collector
    this.rayCollector = new Jolt.CastRayCollectorJS();

    this.rayCollector.AddHit = (rayCastResultPointer) => {
      const rayCastResult = Jolt.wrapPointer(
        rayCastResultPointer,
        Jolt.RayCastResult
      );

      if(this.rayHitBody){
        let hitPoint = this.ray.GetPointOnRay(rayCastResult.mFraction);
        this.bodyInterface.ActivateBody(this.rayHitBody.GetID());
        this.rayHitBody.AddImpulse(this.ray.mDirection.Normalized().Mul(-10), hitPoint);
      }

      // Update the collector so that it won't receive any hits further away than this hit
      this.rayCollector.UpdateEarlyOutFraction(rayCastResult.mFraction);
    };

    this.rayCollector.OnBody = (bodyPointer: number) => {
      const body = Jolt.wrapPointer(bodyPointer, Jolt.Body);
      
      this.rayHitBody = body;
      
      console.log(bodyPointer);
    };

    this.rayCollector.Reset = () => {
      // Reset your bookkeeping, in any case we'll need to reset the early out fraction for the base class
      this.rayCollector.ResetEarlyOutFraction();
    };
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

  castRay(origin: Vector3, direction: Vector3) {

    this.ray.mOrigin.Set(origin.x, origin.y, origin.z);
    this.ray.mDirection.Set(direction.x, direction.y, direction.z);

    this.physicsSystem
      .GetNarrowPhaseQuery()
      .CastRay(
        this.ray,
        this.raySettings,
        this.rayCollector,
        this.rayBpFilter,
        this.rayObjectFilter,
        this.rayBodyFilter,
        this.rayShapeFilter
      );

    this.rayCollector.Reset();
  }

  createBox(
    position: Vector3,
    rotation: Quaternion,
    halfExtent: Vector3,
    motionType: initJolt.EMotionType,
    layer: number
  ) {
    let shape = new Jolt.BoxShape(Physics.unwrapVec3(halfExtent), 0.05);
    let creationSettings = new Jolt.BodyCreationSettings(
      shape,
      Physics.unwrapRVec3(position),
      Physics.unwrapQuat(rotation),
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

  update(dt: number) {
    // When running below 55 Hz, do 2 steps instead of 1
    var numSteps = dt > 1.0 / 0.01818 ? 2 : 1;
    // Step the physics world
    this.jolt.Step(dt, numSteps);
  }

  static unwrapRVec3 = (v: Vector3) => new Jolt.RVec3(v.x, v.y, v.z);
  static unwrapVec3 = (v: Vector3) => new Jolt.Vec3(v.x, v.y, v.z);
  static wrapVec3 = (v: initJolt.RVec3) =>
    new Vector3(v.GetX(), v.GetY(), v.GetZ());
  static unwrapQuat = (q: Quaternion) => new Jolt.Quat(q.x, q.y, q.z, q.w);
  static wrapQuat = (q: initJolt.Quat) =>
    new Quaternion(q.GetX(), q.GetY(), q.GetZ(), q.GetW());
}
