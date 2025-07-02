// --
// Dynamic Audio Visualization using FBM 
// --
import * as THREE from "three";

import { dyno } from "@sparkjsdev/spark";

const { mul, combine, dynoVec3, dynoConst, dynoFloat, hashVec4 } = dyno;

// These are helper files to remove a bunch of the dyno / shader boilerplate
import { d, runTests } from "./dynoexp.ts";
import * as ShaderGen from "./shadergen.js";

import {
  SparkRenderer,
  FpsMovement,
  PointerControls,
  VRButton,
} from "@sparkjsdev/spark";

// Set of global variables that are available to the shader during the render loop
const globalScale = dynoFloat(2);

function renderfunc(index, dynoTime, dynoGlobals) {
  const random = hashVec4(index);

  const tunnelLength = 40.0;
  const tunnelSpeed = 5.0;

  let zp = d`((${dynoTime} * ${tunnelSpeed} * ${random}.z) % ${tunnelLength}) - ${tunnelLength / 2}`;
  
  const theta = d`2 * PI * ${random}.x`;

  // wiggle : curves in the tunnel that attenuates near ther user
  let wiggleAmount = d`0.3 * smoothstep(-5.0, 0.0, ${zp})`; // 0 near user, 0.3 at tail
  let wiggle = d`${wiggleAmount} * sin(2.0 * PI * ${zp} * 0.2 + ${dynoTime})`;
  // twist : radial twisting 
  let twist = d`${theta} + 1.5 * sin(${zp} * 0.5 + ${dynoTime})`;

  let radius = d`1.0 + 0.5 * sin(${zp} * 0.7 + ${dynoTime}) * smoothstep(-5.0, 0.0, ${zp})`;

  let xp = d`${radius} * cos(${twist}) + ${wiggle}`;
  let yp = d`${radius} * sin(${twist}) + ${wiggle}`;

  let position = combine({ vectorType: "vec3", x: xp, y: yp, z: zp });

  // Animate hue with time for extra trippiness
  let t = d`clamp((${zp} + 5.0) / 10.0, 0.0, 1.0)`;
  let hue = d`(${t} + 0.2 * ${dynoTime}) % 1.0`;

  // Simple HSV to RGB approximation
  let r = d`abs(${hue} * 6.0 - 3.0) - 1.0`;
  let g = d`2.0 - abs(${hue} * 6.0 - 2.0)`;
  let b = d`2.0 - abs(${hue} * 6.0 - 4.0)`;
  let dynoColor = combine({
    vectorType: "vec3",
    x: d`clamp(${r}, 0.0, 1.0)`,
    y: d`clamp(${g}, 0.0, 1.0)`,
    z: d`clamp(${b}, 0.0, 1.0)`,
  });

  const anisoScale = dynoConst("vec3", [.01, .01, .01]);
  const scales = d`${anisoScale} * pow(${globalScale}, 2)`;
  const dynoOpacity = d`1.0`;

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

analyser.fftSize = 128; 

const source = audioCtx.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(audioCtx.destination);

const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

function updateFrequency() {

  analyser.getByteFrequencyData(dataArray);

  // frequencypicked by trial and error
  let scale = dataArray[7];
  globalScale.value = (scale ) * 0.008;

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
  camera.position.set(0, 0, 3);

  localFrame.add(spark);
  localFrame.add(camera);
  scene.add(spark);


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

  const shadergen = ShaderGen.shaderBox({
    infunc: renderfunc,
    numSplats: 50000,
    globals: {
      anisoScale: dynoVec3(new THREE.Vector3(0.01, 0.01, 0.01)),
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