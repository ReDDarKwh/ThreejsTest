import GUI from "lil-gui";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  CanvasTexture,
  Clock,
  GridHelper,
  LinearToneMapping,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  PointLightHelper,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  TextureLoader,
  Vector2,
} from "three";

import { FlakesTexture, HDRCubeTextureLoader } from 'three/examples/jsm/Addons';
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import * as animations from "./helpers/animations";
import { toggleFullScreen } from "./helpers/fullscreen";
import { resizeRendererToDisplaySize } from "./helpers/responsiveness";
import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer";

import "./style.css";

const CANVAS_ID = "scene";

let canvas: HTMLCanvasElement;
let renderer: WebGPURenderer;
let scene: Scene;
let loadingManager: LoadingManager;
let ambientLight: AmbientLight;
let pointLight: PointLight;
let cube: Mesh;
let camera: PerspectiveCamera;
let cameraControls: OrbitControls;
let dragControls: DragControls;
let axesHelper: AxesHelper;
let pointLightHelper: PointLightHelper;
let clock: Clock;
let stats: Stats;
let gui: GUI;

const animation = { enabled: true, play: true, speed: 1 };

init();

function init() {
  // ===== 🖼️ CANVAS, RENDERER, & SCENE =====
  {
    canvas = document.querySelector(`canvas#${CANVAS_ID}`)!;
    renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.setAnimationLoop(animate);
    scene = new Scene();

    new HDRCubeTextureLoader()
					.setPath( 'textures/cube/pisaHDR/' )
					.load( [ 'px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr' ],
						function ( texture ) {

							const geometry = new SphereGeometry( .8, 64, 32 );

							const textureLoader = new TextureLoader();

							const diffuse = textureLoader.load( 'textures/carbon/Carbon.png' );
							diffuse.colorSpace = SRGBColorSpace;
							diffuse.wrapS = RepeatWrapping;
							diffuse.wrapT = RepeatWrapping;
							diffuse.repeat.x = 10;
							diffuse.repeat.y = 10;

							const normalMap = textureLoader.load( 'textures/carbon/Carbon_Normal.png' );
							normalMap.wrapS = RepeatWrapping;
							normalMap.wrapT = RepeatWrapping;
							normalMap.repeat.x = 10;
							normalMap.repeat.y = 10;

							const normalMap2 = textureLoader.load( 'textures/water/Water_1_M_Normal.jpg' );

							const normalMap3 = new CanvasTexture( new FlakesTexture() );
							normalMap3.wrapS = RepeatWrapping;
							normalMap3.wrapT = RepeatWrapping;
							normalMap3.repeat.x = 10;
							normalMap3.repeat.y = 6;
							normalMap3.anisotropy = 16;

							const normalMap4 = textureLoader.load( 'textures/golfball.jpg' );

							const clearcoatNormalMap = textureLoader.load( 'textures/pbr/Scratched_gold/Scratched_gold_01_1K_Normal.png' );

							// car paint

							let material = new MeshPhysicalMaterial( {
								clearcoat: 1.0,
								clearcoatRoughness: 0.1,
								metalness: 0.9,
								roughness: 0.5,
								color: 0x0000ff,
								normalMap: normalMap3,
								normalScale: new Vector2( 0.15, 0.15 )
							} );
							let mesh = new Mesh( geometry, material );
							mesh.position.x = - 1;
							mesh.position.y = 1;
							scene.add( mesh );

							// fibers

							material = new MeshPhysicalMaterial( {
								roughness: 0.5,
								clearcoat: 1.0,
								clearcoatRoughness: 0.1,
								map: diffuse,
								normalMap: normalMap
							} );
							mesh = new Mesh( geometry, material );
							mesh.position.x = 1;
							mesh.position.y = 1;
							scene.add( mesh );

							// golf

							material = new MeshPhysicalMaterial( {
								metalness: 0.0,
								roughness: 0.1,
								clearcoat: 1.0,
								normalMap: normalMap4,
								clearcoatNormalMap: clearcoatNormalMap,

								// y scale is negated to compensate for normal map handedness.
								clearcoatNormalScale: new Vector2( 2.0, - 2.0 )
							} );
							mesh = new Mesh( geometry, material );
							mesh.position.x = - 1;
							mesh.position.y = - 1;
							scene.add( mesh );

							// clearcoat + normalmap

							material = new MeshPhysicalMaterial( {
								clearcoat: 1.0,
								metalness: 1.0,
								color: 0xff0000,
								normalMap: normalMap2,
								normalScale: new Vector2( 0.15, 0.15 ),
								clearcoatNormalMap: clearcoatNormalMap,

								// y scale is negated to compensate for normal map handedness.
								clearcoatNormalScale: new Vector2( 2.0, - 2.0 )
							} );
							mesh = new Mesh( geometry, material );
							mesh.position.x = 1;
							mesh.position.y = - 1;
							scene.add( mesh );

							//

							scene.background = texture;
							scene.environment = texture;

						}

					);

  }

  // ===== 👨🏻‍💼 LOADING MANAGER =====
  {
    loadingManager = new LoadingManager();

    loadingManager.onStart = () => {
      console.log("loading started");
    };
    loadingManager.onProgress = (url, loaded, total) => {
      console.log("loading in progress:");
      console.log(`${url} -> ${loaded} / ${total}`);
    };
    loadingManager.onLoad = () => {
      console.log("loaded!");
    };
    loadingManager.onError = () => {
      console.log("❌ error while loading");
    };
  }

  // ===== 💡 LIGHTS =====
  {
    ambientLight = new AmbientLight("white", 0.4);
    pointLight = new PointLight("white", 20, 100);
    pointLight.position.set(-2, 2, 2);
    pointLight.castShadow = true;
    pointLight.shadow.radius = 4;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 4000;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    //pointLight.visible = false;
    //ambientLight.visible = false;
    scene.add(ambientLight);
    scene.add(pointLight);
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
    cube = new Mesh(cubeGeometry, cubeMaterial);
    cube.castShadow = true;
    cube.position.y = 0.5;

    const planeGeometry = new PlaneGeometry(3, 3);
    const planeMaterial = new MeshLambertMaterial({
      color: "gray",
      emissive: "teal",
      emissiveIntensity: 0.2,
      side: 2,
      transparent: true,
      opacity: 0.4,
    });
    const plane = new Mesh(planeGeometry, planeMaterial);
    plane.rotateX(Math.PI / 2);
    plane.receiveShadow = true;

    scene.add(cube);
    scene.add(plane);
  }

  // ===== 🎥 CAMERA =====
  {
    camera = new PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    camera.position.set(2, 2, 5);
  }

  // ===== 🕹️ CONTROLS =====
  {
    cameraControls = new OrbitControls(camera, canvas);
    cameraControls.target = cube.position.clone();
    cameraControls.enableDamping = true;
    cameraControls.autoRotate = false;
    cameraControls.update();

    dragControls = new DragControls([cube], camera, renderer.domElement);
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
      cameraControls.enabled = false;
      animation.play = false;
      material.emissive.set("black");
      material.opacity = 0.7;
      material.needsUpdate = true;
    });
    dragControls.addEventListener("dragend", (event) => {
      cameraControls.enabled = true;
      animation.play = true;
      const mesh = event.object as Mesh;
      const material = mesh.material as MeshStandardMaterial;
      material.emissive.set("black");
      material.opacity = 1;
      material.needsUpdate = true;
    });
    dragControls.enabled = false;

    // Full screen
    window.addEventListener("dblclick", (event) => {
      if (event.target === canvas) {
        toggleFullScreen(canvas);
      }
    });
  }

  // ===== 🪄 HELPERS =====
  {
    axesHelper = new AxesHelper(4);
    axesHelper.visible = false;
    scene.add(axesHelper);

    pointLightHelper = new PointLightHelper(pointLight, undefined, "orange");
    pointLightHelper.visible = false;
    scene.add(pointLightHelper);

    const gridHelper = new GridHelper(20, 20, "teal", "darkgray");
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);
  }

  // ===== 📈 STATS & CLOCK =====
  {
    clock = new Clock();
    stats = new Stats();
    document.body.appendChild(stats.dom);
  }

  // ==== 🐞 DEBUG GUI ====
  {
    gui = new GUI({ title: "🐞 Debug GUI", width: 300 });

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

    cubeOneFolder.add(animation, "enabled").name("animated");
    cubeOneFolder.add(animation, "speed",  0, 100).name("speeeeed");

    const controlsFolder = gui.addFolder("Controls");
    controlsFolder.add(dragControls, "enabled").name("drag controls");

    const lightsFolder = gui.addFolder("Lights");
    lightsFolder.add(pointLight, "visible").name("point light");
    lightsFolder.add(ambientLight, "visible").name("ambient light");

    const helpersFolder = gui.addFolder("Helpers");
    helpersFolder.add(axesHelper, "visible").name("axes");
    helpersFolder.add(pointLightHelper, "visible").name("pointLight");

    const cameraFolder = gui.addFolder("Camera");
    cameraFolder.add(cameraControls, "autoRotate");

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

function animate() {
  stats.update();

  if (animation.enabled && animation.play) {
    animations.rotate(cube, clock, Math.PI * 2 * animation.speed);
    animations.bounce(cube, clock, 0.1, 1, 0.5);
  }

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  cameraControls.update();

  renderer.render(scene, camera);
}
