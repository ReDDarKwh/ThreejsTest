import { World } from "miniplex";
import { Camera, Object3D, Quaternion, Vector3 } from "three";
import { App, Jolt } from "./app";
import initJolt from "jolt-physics";

export type BaseEntity = {
  node: Object3D;
  parentNode: Object3D;
  velocity: Vector3;
  characterController: {
    predictiveContactDistance: number;
    penetrationRecoverySpeed: number;
    characterPadding: number;
    maxStrength: number;
    maxSlopeAngle: number;
    height: number;
    radius: number;
    shape?: initJolt.RotatedTranslatedShapeSettings;
    characterVirtualSettings?: initJolt.CharacterVirtualSettings;
    characterVirtual?: initJolt.CharacterVirtual;
  };
  physics: { body: initJolt.Body };
};

export const world = new World<Partial<BaseEntity>>();

export abstract class System {
  /**
   *
   */
  constructor(_app: App) {}
  abstract update(app: App, dt: number): void;
}

export const systems = [
  class Object3DSystem extends System {
    readonly q = {
      object3D: world.with("node"),
    };

    constructor(app: App) {
      super(app);

      this.q.object3D.onEntityAdded.subscribe(({ node, parentNode }) => {
        (parentNode || app.scene).add(node);
      });

      this.q.object3D.onEntityRemoved.subscribe(({ node, parentNode }) => {
        (parentNode || app.scene).remove(node);
      });
    }

    update(): void {}
  },

  class PlayerControllerSystem extends System {
    readonly q = {
      e: world.with("characterController", "velocity"),
    };

    constructor(app: App) {
      super(app);

      this.q.e.onEntityAdded.subscribe((x) => {
        app.inputs.down.on("click", () => {
          app.canvas.requestPointerLock();
        });

        const positionStanding = new Jolt.Vec3(
          0,
          0.5 * x.characterController.height + x.characterController.radius,
          0
        );
        const rotation = Jolt.Quat.prototype.sIdentity();

        const shape = new Jolt.RotatedTranslatedShapeSettings(
          positionStanding,
          rotation,
          new Jolt.CapsuleShapeSettings(
            0.5 * x.characterController.height,
            x.characterController.radius
          )
        )
          .Create()
          .Get();

        const settings = new Jolt.CharacterVirtualSettings();
        settings.mMass = 1000;
        settings.mMaxSlopeAngle = x.characterController.maxSlopeAngle;
        settings.mMaxStrength = x.characterController.maxStrength;
        settings.mShape = shape;
        settings.mBackFaceMode = Jolt.EBackFaceMode_CollideWithBackFaces;
        settings.mCharacterPadding = x.characterController.characterPadding;
        settings.mPenetrationRecoverySpeed =
          x.characterController.penetrationRecoverySpeed;
        settings.mPredictiveContactDistance =
          x.characterController.predictiveContactDistance;
        settings.mSupportingVolume = new Jolt.Plane(
          Jolt.Vec3.prototype.sAxisY(),
          -x.characterController.radius
        );
        x.characterController.characterVirtual = new Jolt.CharacterVirtual(
          settings,
          Jolt.RVec3.prototype.sZero(),
          Jolt.Quat.prototype.sIdentity(),
          app.physicsSystem
        );
      });
    }

    update(app: App, dt: number): void {
      for (const pc of this.q.e) {
        if (document.pointerLockElement === app.canvas) {
          app.camera.rotation.y -= app.inputs.pointerState.dx / 500;
          app.camera.rotation.x -= app.inputs.pointerState.dy / 500;

          app.camera.rotation.x = Math.max(
            Math.min(app.camera.rotation.x, Math.PI / 2),
            -Math.PI / 2
          );
        }

        if (pc.characterController.characterVirtual) {
          app.camera.position.copy(
            app.wrapVec3(pc.characterController.characterVirtual.GetPosition())
          );
        }
      }
    }
  },

  class PhysicsSystem extends System {
    readonly q = {
      physicsObjects: world.with("node", "physics"),
    };

    constructor(app: App) {
      super(app);

      this.q.physicsObjects.onEntityAdded.subscribe((x) => {
        app.bodyInterface.AddBody(
          x.physics.body.GetID(),
          Jolt.EActivation_Activate
        );
      });

      this.q.physicsObjects.onEntityRemoved.subscribe((x) => {
        app.bodyInterface.RemoveBody(x.physics.body.GetID());
      });
    }

    update(app: App, dt: number): void {
      for (const po of this.q.physicsObjects) {
        po.node.position.copy(app.wrapVec3(po.physics.body.GetPosition()));
        po.node.quaternion.copy(app.wrapQuat(po.physics.body.GetRotation()));
      }
    }
  },
];
