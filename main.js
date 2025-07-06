// --
// Dynamic Audio Visualization using FBM 
// --
import * as THREE from "three";

import { dyno } from "@sparkjsdev/spark";


const { mul, combine, dynoVec3, dynoConst, dynoFloat, hashVec4 } = dyno;

// These are helper files to remove a bunch of the dyno / shader boilerplate
import { d, runTests } from "./dynoexp.ts";
import * as ShaderGen from "./shadergen.js";
import { starriver, basic } from "./effects.js";

import {
  SparkRenderer,
  FpsMovement,
  PointerControls,
  VRButton,
} from "@sparkjsdev/spark";

// Set of global variables that are available to the shader during the render loop
const globalScale = dynoFloat(2);


function b(index, dynoTime, dynoGlobals) {
  const random = hashVec4(index);
  let xp = d`${random}.x`;
  let yp = d`${random}.y`;
  let zp = d`${random}.z`;
  let rgb = dynoVec3(new THREE.Vector3(1, 1, 1));
  let scale = dynoVec3(new THREE.Vector3(.01, .01, .01));
  let opacity = d`1.0`;
  let position = combine({ vectorType: "vec3", x: xp, y: yp, z: zp });
  return {
      position: position,
      rgb: rgb,
      opacity: opacity,
      scales: scale
  }
}


// --
// Wormhole
// --
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

// floating starfield
function renderfunc3(index, dynoTime, dynoGlobals) {
  const random = hashVec4(index);

  // Parameters for the stream
  const streamLength = 30.0; // how long the stream is
  const streamRadius = 4.0;  // how wide the stream is

  // Position along the stream (z axis)
  let zp = d`(${random}.z * ${streamLength}) - (${streamLength} / 2.0)`;
  //let movingZ = d`(${zp} + ${dynoTime} * 0.1) %  ${streamLength}`;
  let movingZ = d`(${zp} + ${dynoTime} * 0.1 + (${streamLength} / 2.0)) %  ${streamLength} - (${streamLength} / 2.0)`;
  zp = movingZ;

  // Angle around the stream axis
  let theta = d`2.0 * PI * ${random}.x`;

  // Radial distance from the center (for some spread)
  let r = d`2.0 * sqrt(${random}.y) * ${streamRadius}`;

  let undulateX = d`
    sin(${zp} * 0.5 + ${dynoTime} * 0.2) * 0.4 +
    sin(${zp} * 1.3 + ${dynoTime} * 0.13) * 0.2
  `;
  let undulateY = d`
    cos(${zp} * 0.7 + ${dynoTime} * 0.18) * 0.3
  `;

  // Convert to Cartesian coordinates
  let xp = d`${undulateX} + ${r} * cos(${theta})`;
  let yp = d`${undulateY} + ${r} * sin(${theta})`;

  let rgb = dynoVec3(new THREE.Vector3(1, 1, 1));
  let scale = dynoVec3(new THREE.Vector3(.01, .01, .01));
  
  // make opacity fluctute over time
  // let flicker = d`fract(sin(${dynoTime} * .000001 + ${random}.x * 100.0) * 43758.5453)`;
  let flicker = d`fract(sin(${random}.x * .000001 + ${random}.y * 100.0) * 43758.5453)`;
  let opacity = flicker; // for smooth random

  // have the starfield slow move to towards the camera
  let speed = 0.1;
  let position = combine({ vectorType: "vec3", x: xp, y: yp, z: zp });

  return {
    position: position,
    rgb: rgb,
    opacity: opacity,
    scales: scale
  }
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
  camera.position.set(0, 0, 5);

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
    // infunc: renderfunc3,
    infunc: starriver,
    //infunc: basic,
    numSplats: 30000,
    globals: {
      anisoScale: dynoVec3(new THREE.Vector3(0.01, 0.01, 0.01)),
      updateFrame(time) {
        this.scale = mul(this.anisoScale, globalScale);
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