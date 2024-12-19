// This code is executed at pixel level 

precision highp float;

//uniforms: variables that are the same for all vertices and fragments
uniform float shCoeffs[9];
varying vec3 vNormal;

uniform sampler2D uTexture; // The texture sampler
varying vec2 vUv;

// Function to calculate the spherical harmonic basis functions
vec3 computeSphericalHarmonics(vec3 normal) {
    float x = normal.x, y = normal.y, z = normal.z;
    
    // Zeroth and first harmonics (ambient and directional)
    float shBasis[9];
    shBasis[0] = 0.282095; // l=0, m=0
    shBasis[1] = 0.488603 * y; // l=1, m=-1
    shBasis[2] = 0.488603 * z; // l=1, m=0
    shBasis[3] = 0.488603 * x; // l=1, m=1

    // Second harmonics (for capturing more complex lighting)
    shBasis[4] = 1.092548 * x * y; // l=2, m=-2
    shBasis[5] = 1.092548 * y * z; // l=2, m=-1
    shBasis[6] = 0.315392 * (3.0 * z * z - 1.0); // l=2, m=0
    shBasis[7] = 1.092548 * x * z; // l=2, m=1
    shBasis[8] = 0.546274 * (x * x - y * y); // l=2, m=2

    // Apply the coefficients to the basis functions
    vec3 irradiance = vec3(0.0);
    for (int i = 0; i < 9; i++) {
        irradiance += shCoeffs[i] * shBasis[i];
    }

    return irradiance;
}

void main() {
    vec3 normal = normalize(vNormal);
    // // Compute lighting based on spherical harmonics
    vec3 irradiance = computeSphericalHarmonics(normal);
    // // Combine with color and ambient term
    // vec3 finalColor = irradiance * color;
    // gl_FragColor = vec4(finalColor, 1.0);
    vec4 texColor = texture(uTexture, vUv);  // Sample the color from the texture
    // Combine texture with lighting
    vec3 finalColor = texColor.rgb * irradiance;
    gl_FragColor = vec4(finalColor, texColor.a);
}
