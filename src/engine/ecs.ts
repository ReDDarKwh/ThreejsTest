import { World } from "miniplex";
import { Camera, Object3D, Quaternion, Vector3 } from "three";
import { App, Jolt, LAYER_MOVING } from "./app";
import initJolt from "jolt-physics";

export type BaseEntity = {
  node: Object3D;
  parentNode: Object3D;
  velocity: Vector3;
  characterController: {
    movingBPFilter?: initJolt.DefaultBroadPhaseLayerFilter;
    movingLayerFilter?: initJolt.DefaultObjectLayerFilter;
    bodyFilter?: initJolt.BodyFilter;
    shapeFilter?: initJolt.ShapeFilter;
    updateSettings?: initJolt.ExtendedUpdateSettings;
    predictiveContactDistance: number;
    penetrationRecoverySpeed: number;
    characterPadding: number;
    maxStrength: number;
    maxSlopeAngle: number;
    height: number;
    radius: number;
    shape?: initJolt.RotatedTranslatedShapeSettings;
    characterVirtualSettings?: initJolt.CharacterVirtualSettings;
    character?: initJolt.CharacterVirtual;
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
        x.characterController.character = new Jolt.CharacterVirtual(
          settings,
          new Jolt.RVec3(2, 5, 2),
          Jolt.Quat.prototype.sIdentity(),
          app.physicsSystem
        );

        const objectVsBroadPhaseLayerFilter =
          app.jolt.GetObjectVsBroadPhaseLayerFilter();
        const objectLayerPairFilter = app.jolt.GetObjectLayerPairFilter();

        x.characterController.updateSettings =
          new Jolt.ExtendedUpdateSettings();
        x.characterController.movingBPFilter =
          new Jolt.DefaultBroadPhaseLayerFilter(
            objectVsBroadPhaseLayerFilter,
            LAYER_MOVING
          );
        x.characterController.movingLayerFilter =
          new Jolt.DefaultObjectLayerFilter(
            objectLayerPairFilter,
            LAYER_MOVING
          );
        x.characterController.bodyFilter = new Jolt.BodyFilter();
        x.characterController.shapeFilter = new Jolt.ShapeFilter();
      });
    }

    update(app: App, dt: number): void {
      for (const e of this.q.e) {
        if (document.pointerLockElement === app.canvas) {
          app.camera.rotation.y -= app.inputs.pointerState.dx / 500;
          app.camera.rotation.x -= app.inputs.pointerState.dy / 500;

          app.camera.rotation.x = Math.max(
            Math.min(app.camera.rotation.x, Math.PI / 2),
            -Math.PI / 2
          );
        }

        if (e.characterController.character) {
          const character = e.characterController.character;

          character.UpdateGroundVelocity();
          const characterUp = app.wrapVec3(character.GetUp());
          const linearVelocity = app.wrapVec3(character.GetLinearVelocity());
          const currentVerticalVelocity = characterUp
            .clone()
            .multiplyScalar(linearVelocity.dot(characterUp));
          const groundVelocity = app.wrapVec3(character.GetGroundVelocity());
          const gravity = app.wrapVec3(app.physicsSystem.GetGravity());
          const enableCharacterInertia = true;

          let newVelocity: Vector3;
          const movingTowardsGround =
            currentVerticalVelocity.y - groundVelocity.y < 0.1;
          if (
            character.GetGroundState() == Jolt.EGroundState_OnGround && // If on ground
            (enableCharacterInertia
              ? movingTowardsGround // Inertia enabled: And not moving away from ground
              : !character.IsSlopeTooSteep(character.GetGroundNormal()))
          ) {
            // Inertia disabled: And not on a slope that is too steep
            // Assume velocity of ground when on ground
            newVelocity = groundVelocity;

            // Jump
            // if (jump && movingTowardsGround)
            //   newVelocity.add(characterUp.multiplyScalar(jumpSpeed));
          } else newVelocity = currentVerticalVelocity.clone();

          // Gravity
          newVelocity.add(gravity.multiplyScalar(dt));

          character.SetLinearVelocity(
            new Jolt.Vec3(newVelocity.x, newVelocity.y, newVelocity.z)
          );

          app.camera.position.copy(
            app
              .wrapVec3(e.characterController.character.GetPosition())
              .add(new Vector3(0, e.characterController.height, 0))
          );

          e.characterController.character.ExtendedUpdate(
            dt,
            e.characterController.character.GetUp(),
            e.characterController.updateSettings!,
            e.characterController.movingBPFilter!,
            e.characterController.movingLayerFilter!,
            e.characterController.bodyFilter!,
            e.characterController.shapeFilter!,
            app.jolt.GetTempAllocator()
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
