// --
// Dynamic Audio Visualization using FBM 
// --
import * as THREE from "three";

import { dyno } from "@sparkjsdev/spark";

const { mul, combine, dynoVec3, dynoConst, dynoFloat, hashVec4 } = dyno;

// These are helper files to remove a bunch of the dyno / shader boilerplate
import { d } from "./dynoexp.ts";
import * as ShaderGen from "./shadergen.js";

import {
  SparkRenderer,
  FpsMovement,
  PointerControls,
  SplatMesh,
  VRButton,
  constructGrid,
} from "@sparkjsdev/spark";

// Set of global variables that are available to the shader during the render loop
const globalSpeed = dynoFloat(1.5);
const globalScale = dynoFloat(2);
const globalFrequency = dynoFloat(0.2);
const globalAmplitude = dynoFloat(1);
const globalPhase = dynoFloat(0.5);
const globalOctaves = dynoFloat(5);
const globalLacunarity = dynoFloat(2.0);
const globalPersistence = dynoFloat(0.5);

const globalOpacity = dynoFloat(0.5);
const globalRed = dynoFloat(0.16);
const globalGreen = dynoFloat(0.16);
const globalBlue = dynoFloat(0.32);
const globalRed2 = dynoFloat(0.36);
const globalGreen2 = dynoFloat(0.36);
const globalBlue2 = dynoFloat(0.64);

function renderfunc(index, dynoTime, dynoGlobals) {
  let position = dynoConst("vec3", [0, 0, 0]);

  const dynoColor = combine({
    vectorType: "vec3",
    x: globalRed,
    y: globalGreen,
    z: globalBlue,
  });

  const anisoScale = dynoConst("vec3", [1, 1.5, 1]);
  const scales = d`${anisoScale} * ${dynoGlobals.scale}`;
  const dynoOpacity = globalOpacity;

  return {
    position: position,
    rgb: dynoColor,
    opacity: dynoOpacity,
    scales: scales
  };
}

function renderfunc2(index, dynoTime, dynoGlobals) {
  let position = dynoConst("vec3", [0, 0, 0]);

  const dynoColor = combine({
    vectorType: "vec3",
    x: globalRed,
    y: globalGreen,
    z: globalBlue,
  });

  const anisoScale = dynoConst("vec3", [1, 1.5, 1]);
  const scales = d`${anisoScale} * ${dynoGlobals.scale}`;
  const dynoOpacity = globalOpacity;

  return {
    position: position,
    rgb: dynoColor,
    opacity: dynoOpacity,
    scales: scales
  };
}

const audio = document.getElementById('audio');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 128; // You can try 256, 512, etc.

const source = audioCtx.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioCtx.destination);

const bufferLength = analyser.frequencyBinCount;
console.log("bufferLength: ", bufferLength);
const dataArray = new Uint8Array(bufferLength);

function updateFrequency() {

  analyser.getByteFrequencyData(dataArray);

  // const scale = dataArray[0] * 0.002;
  // globalScale.value = scale;

  const frequency = dataArray[1] * 0.001;
  globalFrequency.value = frequency;

  const amplitude = dataArray[2] * 0.007;
  globalAmplitude.value = amplitude;

  const green = dataArray[3] * 0.003;
  globalGreen.value = green;

  const blue = dataArray[4] * 0.004;
  globalBlue.value = blue;

  const red = dataArray[5] * 0.004;
  globalRed.value = red;

  const green2 = dataArray[6] * 0.0005;
  globalGreen2.value = green2;

  const blue2 = dataArray[7] * 0.001;
  globalBlue2.value = blue2;

  const red2 = dataArray[7] * 0.001;
  globalRed2.value = red2;

  const persistence = dataArray[8] * 0.003;
  globalPersistence.value = persistence;

  // If you want to iterate over all frequencies, you can do this:
  // for (let i = 0; i < bufferLength; i++) {
  //   // const val = dataArray[i];
  // }
}

async function main() {
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
  camera.position.set(0, 0, 3);

  localFrame.add(spark);
  localFrame.add(camera);
  scene.add(spark);


  const fpsMovement = new FpsMovement({ moveSpeed: 0.5 });
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

  const shadergen = ShaderGen.shaderBox({
    infunc: renderfunc,
    numSplats: 1,
    globals: {
      anisoScale: dynoVec3(new THREE.Vector3(0.1, 0.1, 0.1)),
      updateFrame(time) {
        this.scale = mul(this.anisoScale, globalScale);
      },
    },
  });
  scene.add(shadergen.shadergen);

  console.log("Starting render loop");
  let lastTime;

  // let lastCameraPos = camera.position.clone();
  localFrame.position.copy(camera.position);

  renderer.setAnimationLoop((time) => {
    const timeSeconds = time * 0.001;
    const deltaTime = timeSeconds - (lastTime ?? timeSeconds);
    lastTime = timeSeconds;

    pointerControls.update(deltaTime, localFrame);
    fpsMovement.update(deltaTime, localFrame);

    updateFrequency();

    renderer.render(scene, camera);
  });
}

main().catch(console.error);

// Required for browser autoplay policy
audio.addEventListener('play', () => {
  audioCtx.resume();
});