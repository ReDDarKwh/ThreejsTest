import { Vector3 } from "three";
import { App, Jolt } from "../../app";
import { world } from "../entity";

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
      e: world.with("characterController"),
    };

    constructor(app: App) {
      super(app);

      this.q.e.onEntityAdded.subscribe((x) => {
        app.control.inputs.down.on("click", () => {
          app.canvas.requestPointerLock();
        });
      });
    }

    update(app: App, dt: number): void {
      for (const { characterController } of this.q.e) {
        const cc = characterController;

        if (document.pointerLockElement === app.canvas) {
          app.camera.rotation.y -= app.control.inputs.pointerState.dx / 500;
          app.camera.rotation.x -= app.control.inputs.pointerState.dy / 500;

          app.camera.rotation.x = Math.max(
            Math.min(app.camera.rotation.x, Math.PI / 2),
            -Math.PI / 2
          );
        }

        if (cc.character) {
          const character = cc.character;
          app.camera.getWorldQuaternion(cc.cameraRotation);
          const movementDirection = app.control
            .getDirection()
            .applyQuaternion(cc.cameraRotation);
          movementDirection.y = 0;
          movementDirection.normalize().multiplyScalar(2);

          const characterUpRotation = Jolt.Quat.prototype.sEulerAngles(
            Jolt.Vec3.prototype.sZero()
          );
          character.SetUp(characterUpRotation.RotateAxisY());
          character.SetRotation(characterUpRotation);
          const upRotation = app.wrapQuat(characterUpRotation);

          if (cc.enableCharacterInertia) {
            cc.desiredVelocity
              .multiplyScalar(0.75)
              .add(movementDirection.multiplyScalar(0.25 * cc.characterSpeed));
          } else {
            cc.desiredVelocity
              .copy(movementDirection)
              .multiplyScalar(cc.characterSpeed);
          }

          character.UpdateGroundVelocity();
          const characterUp = app.wrapVec3(character.GetUp());
          const linearVelocity = app.wrapVec3(character.GetLinearVelocity());
          const currentVerticalVelocity = characterUp
            .clone()
            .multiplyScalar(linearVelocity.dot(characterUp));
          const groundVelocity = app.wrapVec3(character.GetGroundVelocity());
          const gravity = app.wrapVec3(app.physicsSystem.GetGravity());

          let newVelocity: Vector3;
          const movingTowardsGround =
            currentVerticalVelocity.y - groundVelocity.y < 0.1;
          if (
            character.GetGroundState() == Jolt.EGroundState_OnGround && // If on ground
            (cc.enableCharacterInertia
              ? movingTowardsGround // Inertia enabled: And not moving away from ground
              : !character.IsSlopeTooSteep(character.GetGroundNormal()))
          ) {
            // Inertia disabled: And not on a slope that is too steep
            // Assume velocity of ground when on ground
            newVelocity = groundVelocity;

            // Jump
            if (app.control.inputs.state["jump"] && movingTowardsGround)
              newVelocity.add(characterUp.multiplyScalar(cc.jumpSpeed));
          } else newVelocity = currentVerticalVelocity.clone();

          // Gravity
          newVelocity.add(gravity.multiplyScalar(dt));
          newVelocity.add(
            cc.desiredVelocity.clone().applyQuaternion(upRotation)
          );

          character.SetLinearVelocity(
            new Jolt.Vec3(newVelocity.x, newVelocity.y, newVelocity.z)
          );

          app.camera.position.copy(
            app
              .wrapVec3(character.GetPosition())
              .add(new Vector3(0, cc.height, 0))
          );

          character.ExtendedUpdate(
            dt,
            character.GetUp(),
            cc.updateSettings!,
            cc.movingBPFilter!,
            cc.movingLayerFilter!,
            cc.bodyFilter!,
            cc.shapeFilter!,
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
