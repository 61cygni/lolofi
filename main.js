// --
// Dynamic Audio Visualization using FBM 
// --
import * as THREE from "three";

import { dyno } from "@sparkjsdev/spark";


const { mul, combine, dynoVec3, dynoConst, dynoFloat, hashVec4 } = dyno;

// These are helper files to remove a bunch of the dyno / shader boilerplate
import * as ShaderGen from "./shadergen.js";
import * as effects from "./effects.js";

import {
  SparkRenderer,
  FpsMovement,
  PointerControls,
  VRButton,
} from "@sparkjsdev/spark";

// Set of global variables that are available to the shader during the render loop
// const globalScale = dynoFloat(2);


const audio = document.getElementById('audio');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();

analyser.fftSize = 128; 

const source = audioCtx.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioCtx.destination);

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

const demo = document.body.dataset.demo;

function updateFrequency() {

  analyser.getByteFrequencyData(dataArray);

  // frequencypicked by trial and error
  let scale = dataArray[7];
  effects.globalScale.value = (scale ) * 0.008;

  // If you want to iterate over all frequencies, you can do this:
  // for (let i = 0; i < bufferLength; i++) {
  //   // const val = dataArray[i];
  // }
}

async function main() {
  //runTests();

  const canvas = document.getElementById("canvas");

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas });

  // Make a local frame of reference that we can move to control
  // the camera, or as a frame of reference in WebXR mode
  const localFrame = new THREE.Group();
  scene.add(localFrame);

  // Lower the splat rendering width to sqrt(5) std devs for more performance
  const spark = new SparkRenderer({ renderer, maxStdDev: Math.sqrt(5) });
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.width / canvas.height,
    0.1,
    1000,
  );
  //camera.position.set(0, 0, 5);
  // camera.position.set(-1.32, .09, 4.86);
  // camera.rotation.set(-.23, -.43, -.29);
  camera.position.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);

  localFrame.add(spark);
  localFrame.add(camera);
  localFrame.add(spark);
  // scene.add(spark);

  if (demo) {
    console.log(`Starting demo: ${demo}`);
  }

  if (demo === "wormhole") {
    localFrame.position.set(.28, -.43, -8.4);
    localFrame.rotation.set(-3.05, 0.02, 3.14);
   } else {
    localFrame.position.set(-3.45, 0.90, 8.74);
    localFrame.rotation.set(-.12, -.01, -.19);
  }

  function updateCameraPath(time, localFrame) {
    if (demo === "surf") {
      time = time * 0.001; // Use seconds


      time = time * .1;

      // Arc parameters
      const radius = 6.0;      // How big the arc is
      const speed = 0.15;      // How fast to move along the arc
      const baseY = 0.8;       // Camera height
      const yAmplitude = 0.3;  // Up/down oscillation

      // Oscillation parameters for weaving
      const weaveAmplitude = 1.5;   // How far to weave left/right
      const weaveFrequency = 0.5;   // How fast to weave

      // Angle for current and look-ahead positions
      const angle = time * speed * Math.PI * 2;
      const lookAheadAngle = angle + 0.1; // Look slightly ahead

      // Weaving offset
      const weave = Math.sin(time * weaveFrequency) * weaveAmplitude;
      const lookAheadWeave = Math.sin((time + 0.1) * weaveFrequency) * weaveAmplitude;

      // Camera position on arc, with weaving
      const x = Math.sin(angle) * radius + weave;
      const z = Math.cos(angle) * radius + weave;
      const y = baseY + Math.sin(angle * 1.5) * yAmplitude;

      // Look-ahead position on arc, with weaving
      const lookAheadX = Math.sin(lookAheadAngle) * radius + lookAheadWeave;
      const lookAheadZ = Math.cos(lookAheadAngle) * radius + lookAheadWeave;
      const lookAheadY = baseY + Math.sin(lookAheadAngle * 1.5) * yAmplitude;

      // Set camera position
      localFrame.position.set(x, y, z);

      // Look ahead along the arc
      localFrame.lookAt(lookAheadX, lookAheadY, lookAheadZ);
      localFrame.rotateY(Math.PI);
    }
  }

  const fpsMovement = new FpsMovement({ moveSpeed: 0.5, xr : renderer.xr });
  const pointerControls = new PointerControls({ canvas });

  function handleResize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  handleResize();
  window.addEventListener("resize", handleResize);

  const vrButton = VRButton.createButton(renderer);
  if (vrButton) {
    document.body.appendChild(vrButton);
  }

  
  let shaderfunc = demo;
  if (demo === "surf") {
    shaderfunc = "galaxy"; 
  }

  const shadergen = ShaderGen.shaderBox({
    // infunc: starriver,
    // infunc: wormhole,
    infunc: effects[shaderfunc], 
    //infunc: basic,
    numSplats: 500000,
    globals: {
      anisoScale: dynoVec3(new THREE.Vector3(0.01, 0.01, 0.01)),
      updateFrame(time) {
        this.scale = mul(this.anisoScale, effects.globalScale);
      },
    },
  });
  scene.add(shadergen.shadergen);

const loader = new THREE.TextureLoader();
loader.load('./skybox.png', function(texture) {
  // texture.mapping = THREE.EquirectangularReflectionMapping;
  // scene.background = texture;
});

  console.log("Starting render loop");
  let lastTime;

  // let lastCameraPos = camera.position.clone();
  //localFrame.position.set(-0.5, -.25, 3.46);
  //localFrame.rotation.set(-.27, -.22, -.46);

  // Create overlay for camera info
  const camInfo = document.createElement('div');
  camInfo.style.position = 'absolute';
  camInfo.style.top = '0';
  camInfo.style.left = '0';
  camInfo.style.color = 'white';
  camInfo.style.background = 'rgba(0,0,0,0.5)';
  camInfo.style.fontFamily = 'monospace';
  camInfo.style.fontSize = '14px';
  camInfo.style.padding = '6px 10px';
  camInfo.style.zIndex = '10';
  document.body.appendChild(camInfo);

  let init = false;
  renderer.setAnimationLoop((time) => {
    const timeSeconds = time * 0.001;
    const deltaTime = timeSeconds - (lastTime ?? timeSeconds);
    lastTime = timeSeconds;

    pointerControls.update(deltaTime, localFrame);
    fpsMovement.update(deltaTime, localFrame);

    updateFrequency();
    updateCameraPath(time, localFrame);

    // Update camera info overlay
    const pos = localFrame.position;
    const rot = localFrame.rotation;
    camInfo.textContent =
      `Camera Position:\n` +
      `x: ${pos.x.toFixed(2)}  y: ${pos.y.toFixed(2)}  z: ${pos.z.toFixed(2)}\n` +
      `Rotation (rad):\n` +
      `x: ${rot.x.toFixed(2)}  y: ${rot.y.toFixed(2)}  z: ${rot.z.toFixed(2)}`;

    renderer.render(scene, camera);
  });
}

main().catch(console.error);

// Required for browser autoplay policy
audio.addEventListener('play', () => {
  audioCtx.resume();
});