import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  GridHelper,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  PointLightHelper,
} from "three";
import { App } from "./engine/app";
import { DragControls, FirstPersonControls, OrbitControls } from "three/examples/jsm/Addons";
import { toggleFullScreen } from "./engine/helpers/fullscreen";
import GUI from "lil-gui";
import { systems, gameWorld } from "./ecs";

export class Game extends App {
  animation = { enabled: true, play: true, speed: 1 };
  cameraControls: FirstPersonControls;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas, systems);

    const entity = gameWorld.add({});

    gameWorld.addComponent(entity, "superCool", true);

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
      cube.castShadow = true;
      cube.position.y = 0.5;

      const planeGeometry = new PlaneGeometry(3, 3);
      const planeMaterial = new MeshLambertMaterial({
        color: "gray",
        emissive: "teal",
        emissiveIntensity: 0.2,
        side: 2,
        transparent: false,
        opacity: 0.4,
      });
      const plane = new Mesh(planeGeometry, planeMaterial);
      plane.rotateX(Math.PI / 2);
      plane.receiveShadow = true;

      gameWorld.add({ node: cube });
      gameWorld.add({ node: plane });
    }

    // ===== 🕹️ CONTROLS =====
    {
      this.cameraControls = new FirstPersonControls(this.camera, this.canvas);
      this.cameraControls.lookSpeed = 1;
    
      var dragControls = new DragControls(
        [cube],
        this.camera,
        this.renderer.domElement
      );
      dragControls.addEventListener("hoveron", (event) => {
        const mesh = event.object as Mesh;
        const material = mesh.material as MeshStandardMaterial;
        material.emissive.set("orange");
      });
      dragControls.addEventListener("hoveroff", (event) => {
        const mesh = event.object as Mesh;
        const material = mesh.material as MeshStandardMaterial;
        material.emissive.set("black");
      });
      dragControls.addEventListener("dragstart", (event) => {
        const mesh = event.object as Mesh;
        const material = mesh.material as MeshStandardMaterial;
        this.cameraControls.enabled = false;
        this.animation.play = false;
        material.emissive.set("black");
        material.opacity = 0.7;
        material.needsUpdate = true;
      });
      dragControls.addEventListener("dragend", (event) => {
        this.cameraControls.enabled = true;
        this.animation.play = true;
        const mesh = event.object as Mesh;
        const material = mesh.material as MeshStandardMaterial;
        material.emissive.set("black");
        material.opacity = 1;
        material.needsUpdate = true;
      });
      dragControls.enabled = false;

      // Full screen
      window.addEventListener("dblclick", (event) => {
        if (event.target === this.canvas) {
          toggleFullScreen(this.canvas);
        }
      });
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

      const controlsFolder = gui.addFolder("Controls");
      controlsFolder.add(dragControls, "enabled").name("drag controls");

      const lightsFolder = gui.addFolder("Lights");
      lightsFolder.add(pointLight, "intensity").name("point light");
      lightsFolder.add(ambientLight, "intensity").name("ambient light");

      const helpersFolder = gui.addFolder("Helpers");
      helpersFolder.add(axesHelper, "visible").name("axes");
      helpersFolder.add(pointLightHelper, "visible").name("pointLight");

      const cameraFolder = gui.addFolder("Camera");
      cameraFolder.add(this.cameraControls, "autoRotate");

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

  update(): void {
    this.cameraControls.update(this.clock.getDelta());
  }
}
