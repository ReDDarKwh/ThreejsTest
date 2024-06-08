import { Quaternion, Vector3 } from "three";
import { App } from "../../app";
import initJolt from "jolt-physics";
import { Jolt, LAYER_MOVING } from "../../physics";


export class CharacterControllerComponent {
  jumpSpeed = 11;
  movingBPFilter: initJolt.DefaultBroadPhaseLayerFilter;
  movingLayerFilter: initJolt.DefaultObjectLayerFilter;
  bodyFilter: initJolt.BodyFilter;
  shapeFilter: initJolt.ShapeFilter;
  updateSettings: initJolt.ExtendedUpdateSettings;
  predictiveContactDistance = 0.1;
  penetrationRecoverySpeed = 1;
  characterPadding = 0.02;
  maxStrength = 100;
  maxSlopeAngle = 45 * (Math.PI / 180);
  height: number;
  radius = 1;
  character: initJolt.CharacterVirtual;
  enableCharacterInertia = true;
  desiredVelocity = new Vector3();
  characterSpeed = 6;
  cameraRotation = new Quaternion();

  constructor(app: App, height?: number) {

    this.height = height || 3;

    const positionStanding = new Jolt.Vec3(
      0,
      0.5 * this.height + this.radius,
      0
    );
    const rotation = Jolt.Quat.prototype.sIdentity();

    const shape = new Jolt.RotatedTranslatedShapeSettings(
      positionStanding,
      rotation,
      new Jolt.CapsuleShapeSettings(0.5 * this.height, this.radius)
    )
      .Create()
      .Get();

    const settings = new Jolt.CharacterVirtualSettings();
    settings.mMass = 1000;
    settings.mMaxSlopeAngle = this.maxSlopeAngle;
    settings.mMaxStrength = this.maxStrength;
    settings.mShape = shape;
    settings.mBackFaceMode = Jolt.EBackFaceMode_CollideWithBackFaces;
    settings.mCharacterPadding = this.characterPadding;
    settings.mPenetrationRecoverySpeed = this.penetrationRecoverySpeed;
    settings.mPredictiveContactDistance = this.predictiveContactDistance;
    settings.mSupportingVolume = new Jolt.Plane(
      Jolt.Vec3.prototype.sAxisY(),
      -this.radius
    );

    this.character = new Jolt.CharacterVirtual(
      settings,
      new Jolt.RVec3(2, 5, 2),
      Jolt.Quat.prototype.sIdentity(),
      app.physics.physicsSystem
    );

    const objectVsBroadPhaseLayerFilter = app.physics.jolt.GetObjectVsBroadPhaseLayerFilter();
    const objectLayerPairFilter = app.physics.jolt.GetObjectLayerPairFilter();

    this.updateSettings = new Jolt.ExtendedUpdateSettings();
    this.movingBPFilter = new Jolt.DefaultBroadPhaseLayerFilter(
      objectVsBroadPhaseLayerFilter,
      LAYER_MOVING
    );
    this.movingLayerFilter = new Jolt.DefaultObjectLayerFilter(
      objectLayerPairFilter,
      LAYER_MOVING
    );
    this.bodyFilter = new Jolt.BodyFilter();
    this.shapeFilter = new Jolt.ShapeFilter();
  }
}
