import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  GridHelper,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PointLight,
  PointLightHelper,
  Quaternion,
  Vector3,
} from "three";
import { App } from "./engine/app";
import { toggleFullScreen } from "./engine/helpers/fullscreen";
import GUI from "lil-gui";
import { systems, gameWorld } from "./ecs";
import { CharacterControllerComponent } from "./engine/ecs/components/characterControllerComponent";
import { Jolt, LAYER_MOVING, LAYER_NON_MOVING } from "./engine/physics";

export class Game extends App {
  animation = { enabled: true, play: true, speed: 1 };

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, systems);

    gameWorld.add({
      characterController: new CharacterControllerComponent(this, 3),
    });

    // ===== 💡 LIGHTS =====
    {
      var ambientLight = new AmbientLight("white", 0.4);
      var pointLight = new PointLight("white", 20, 100);
      pointLight.position.set(-2, 2, 2);
      pointLight.castShadow = true;
      pointLight.shadow.radius = 4;
      pointLight.shadow.camera.near = 0.5;
      pointLight.shadow.camera.far = 4000;
      pointLight.shadow.mapSize.width = 2048;
      pointLight.shadow.mapSize.height = 2048;
      gameWorld.add({ node: ambientLight });
      gameWorld.add({ node: pointLight });
    }

    // ===== 📦 OBJECTS =====
    {
      const sideLength = 1;
      const cubeGeometry = new BoxGeometry(sideLength, sideLength, sideLength);
      const cubeMaterial = new MeshStandardMaterial({
        color: "#f69f1f",
        metalness: 0.5,
        roughness: 0.7,
      });
      var cube = new Mesh(cubeGeometry, cubeMaterial);

      const planeGeometry = new BoxGeometry(30, 0.5, 30);
      let planeSize = new Vector3();
      planeGeometry.computeBoundingBox();
      planeGeometry.boundingBox?.getSize(planeSize);

      const planeMaterial = new MeshLambertMaterial({
        color: "gray",
        emissive: "teal",
        emissiveIntensity: 0.2,
        side: 2,
        transparent: false,
        opacity: 0.4,
      });
      const plane = new Mesh(planeGeometry, planeMaterial);
      plane.receiveShadow = true;

      gameWorld.add({
        node: new Mesh(cubeGeometry, cubeMaterial),
        physics: {
          body: this.physics.createBox(
            new Vector3(0, 5, 0),
            Quaternion.prototype.identity(),
            new Vector3(sideLength / 2, sideLength / 2, sideLength / 2),
            Jolt.EMotionType_Dynamic,
            LAYER_MOVING
          ),
        },
      });

      gameWorld.add({
        node: new Mesh(cubeGeometry, cubeMaterial),
        physics: {
          body: this.physics.createBox(
            new Vector3(0, 6.5, 0),
            Quaternion.prototype.identity(),
            new Vector3(sideLength / 2, sideLength / 2, sideLength / 2),
            Jolt.EMotionType_Dynamic,
            LAYER_MOVING
          ),
        },
      });

      gameWorld.add({
        node: new Mesh(planeGeometry, planeMaterial),
        physics: {
          body: this.physics.createBox(
            new Vector3(0, 0, 0),
            Quaternion.prototype.identity(),
            new Vector3(planeSize.x / 2, planeSize.y / 2, planeSize.z / 2),
            Jolt.EMotionType_Static,
            LAYER_NON_MOVING
          ),
        },
      });

      gameWorld.add({
        node: new Mesh(planeGeometry, planeMaterial),
        physics: {
          body: this.physics.createBox(
            new Vector3(planeSize.x, 0.3, 0),
            Quaternion.prototype.identity(),
            new Vector3(planeSize.x / 2, planeSize.y / 2, planeSize.z / 2),
            Jolt.EMotionType_Static,
            LAYER_NON_MOVING
          ),
        },
      });
    }

    // ===== 🕹️ CONTROLS =====
    {
      // Full screen
     
    }

    // ===== 🪄 HELPERS =====
    {
      var axesHelper = new AxesHelper(4);
      axesHelper.visible = false;
      gameWorld.add({ node: axesHelper });

      var pointLightHelper = new PointLightHelper(
        pointLight,
        undefined,
        "orange"
      );
      pointLightHelper.visible = false;
      gameWorld.add({ node: pointLightHelper });

      const gridHelper = new GridHelper(20, 20, "teal", "darkgray");
      gridHelper.position.y = -0.01;
      gameWorld.add({ node: gridHelper });
    }

    // ==== 🐞 DEBUG GUI ====
    {
      var gui = new GUI({ title: "🐞 Debug GUI", width: 300 });

      const cubeOneFolder = gui.addFolder("Cube one");

      cubeOneFolder
        .add(cube.position, "x")
        .min(-5)
        .max(5)
        .step(0.5)
        .name("pos x");
      cubeOneFolder
        .add(cube.position, "y")
        .min(-5)
        .max(5)
        .step(0.5)
        .name("pos y");
      cubeOneFolder
        .add(cube.position, "z")
        .min(-5)
        .max(5)
        .step(0.5)
        .name("pos z");

      cubeOneFolder.add(cube.material, "wireframe");
      cubeOneFolder.addColor(cube.material, "color");
      cubeOneFolder.add(cube.material, "metalness", 0, 1, 0.1);
      cubeOneFolder.add(cube.material, "roughness", 0, 1, 0.1);

      cubeOneFolder
        .add(cube.rotation, "x", -Math.PI * 2, Math.PI * 2, Math.PI / 4)
        .name("rotate x");
      cubeOneFolder
        .add(cube.rotation, "y", -Math.PI * 2, Math.PI * 2, Math.PI / 4)
        .name("rotate y");
      cubeOneFolder
        .add(cube.rotation, "z", -Math.PI * 2, Math.PI * 2, Math.PI / 4)
        .name("rotate z");

      cubeOneFolder.add(this.animation, "enabled").name("animated");
      cubeOneFolder.add(this.animation, "speed", 0, 100).name("speeeeed");

      const lightsFolder = gui.addFolder("Lights");
      lightsFolder.add(pointLight, "intensity").name("point light");
      lightsFolder.add(ambientLight, "intensity").name("ambient light");

      const helpersFolder = gui.addFolder("Helpers");
      helpersFolder.add(axesHelper, "visible").name("axes");
      helpersFolder.add(pointLightHelper, "visible").name("pointLight");

      // persist GUI state in local storage on changes
      gui.onFinishChange(() => {
        const guiState = gui.save();
        localStorage.setItem("guiState", JSON.stringify(guiState));
      });

      // load GUI state if available in local storage
      const guiState = localStorage.getItem("guiState");
      if (guiState) gui.load(JSON.parse(guiState));

      // reset GUI state button
      const resetGui = () => {
        localStorage.removeItem("guiState");
        gui.reset();
      };
      gui.add({ resetGui }, "resetGui").name("RESET");

      gui.close();
    }
  }

  update(): void {}
}
