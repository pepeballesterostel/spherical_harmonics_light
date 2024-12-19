// This code is executed PER VERTEX

precision highp float;

// variables to be interpolated and passed to the fragment shader
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;


void main() {
    // normal is a built in variable that contains the normal of the vertex in object space
    // normalMatrix is a built in 3x3 matrix that comes from modelViewMatrix. It's used to transform normal vectors from object space to eye space while preserving their directions even after non-uniform scaling
    // position is a built in variable that contains the position of the vertex in object space
       
    // vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    // // Pass the normal for shading calculation in the fragment shader
    
    // modelViewMatrix is a built in 4x4 matrix that contains the model matrix * view matrix
    // Project vertex coodinates to screen
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
