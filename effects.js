import * as THREE from "three";

import { dyno } from "@sparkjsdev/spark";
import { d } from "./dynoexp.ts";

const { combine, dynoVec3, dynoConst, dynoFloat, hashVec4 } = dyno;


export function basic(index, dynoTime, dynoGlobals) {
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
// Slow Moving Star River
// -- 
export function starriver(index, dynoTime, dynoGlobals) {
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


    let anisoScale = dynoVec3(new THREE.Vector3(.01, .01, .01));
    let scale = d`${anisoScale} * ${random}.w`; 
    
    // make opacity fluctute over time
    let flicker = d`fract(sin(${random}.x * .000001 + ${random}.y * 100.0) * 43758.5453)`;
    let opacity = flicker; // for smooth random

    let position = combine({ vectorType: "vec3", x: xp, y: yp, z: zp });
  
    return {
      position: position,
      rgb: rgb,
      opacity: opacity,
      scales: scale
    }
  }