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


// --
// DustDevil 
// --


export function galaxy(index, dynoTime, dynoGlobals) {
    const random = hashVec4(index);

    const height = .5;
    const baseRadius = 0.03;
    const maxExtraRadius = 10.0; // top will be 2.3 units wide

    //let zJitter = d`(${random}.w - 0.5) * ${random}.z * 1.0`; // more jitter at the top
    let zJitter = d`(${random}.w - 0.5) * 0.3`;
    let yJitter = d`(${random}.y - 0.5) * 0.3`;
    let xJitter = d`(${random}.x - 0.5) * 0.3`;

    let r = d`${baseRadius} + pow(${random}.z, 2.0) * ${maxExtraRadius}`;

    //let swirlSpeed = d`.2 * ${random}.w `;
    let baseSpeed = 0.2; // or whatever you want
    let swirlSpeed = d`-1. * (${baseSpeed} * pow(1.0 - clamp(${r} / ${maxExtraRadius}, 0.0, 1.0), 2.0))`;
    //let theta = d`(${random}.z * 8.0 * PI) + (${dynoTime} * ${swirlSpeed}) + (${random}.x * 2.0 * PI)`;

    const numTendrils = 4; // Number of arms/tendrils
    const thetaJitterOffset = 1.5;
    let baseTheta = d`floor(${random}.x * ${numTendrils}) * (2.0 * PI / ${numTendrils})`;
    let thetaJitter = d`(${random}.y - 0.5) * (2.0 * PI / ${numTendrils}) * ${thetaJitterOffset}`; // small random offset
    let theta = d`(${random}.z * 8.0 * PI) + (${dynoTime} * ${swirlSpeed}) + ${baseTheta} + ${thetaJitter}`;
  
    //let r = d`${baseRadius} + ${maxExtraRadius} * ${random}.y + 0.2 * ${random}.z`; // funnel shape
  
    let yp = d`${random}.z * ${height} + ${yJitter}`;
    let xp = d`${r} * cos(${theta} + ${xJitter})`;
    let zp = d`${r} * sin(${theta} + ${zJitter})`;
  
    //let rgb = dynoVec3(new THREE.Vector3(0.8, 0.7, 0.5)); // dusty color
    let scaleValue = d`0.01 + pow(0.15 * ${random}.w, 2.0)`;
    let anisoScale = dynoVec3(new THREE.Vector3(1, 1, 1));
    let scale = d`${anisoScale} * ${scaleValue}`; 
   // let opacity = d`1.0 - ${random}.z`; // fade out at the top
     let opacity = d`1.0`; // fade out at the top

    let color1 = dynoVec3(new THREE.Vector3(1., 1., 0.2)); // yellow
    let color2 = dynoVec3(new THREE.Vector3(1., 0.2, 0.2)); // red
    let color3 = dynoVec3(new THREE.Vector3(0.2, 0.2, 1.)); // blue

    let rgb = d`mix(${color1}, ${color2}, smoothstep(0.0, 0.5, ${random}.z))`;
    rgb = d`mix(${rgb}, ${color3}, smoothstep(0.5, 1.0, ${random}.z))`;

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

export let globalScale = dynoFloat(2);

export function wormhole(index, dynoTime, dynoGlobals) {
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