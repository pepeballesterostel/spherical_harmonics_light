/*

    The aim of this script if to load a 3D mesh and calculate the light environment using spherical harmonics.
    Change the file name to this script's name in the html to compile this functionality. 
    Run server with npm run dev command // press q in the console to stop the server
    Open the chrome web console for js with Ctrl + Shift + I

    To save a 3D model in glb format for easy import in three.js, you can import the model in blender and export it as glb file.

*/

import * as THREE from 'three';
// import WebGL from 'three/addons/capabilities/WebGL.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'; // add mouse control to camera 
// import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'; // Load obj model
// import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'; // Load material files
import * as dat from 'dat.gui'; // add gui

async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load shader from ${url}`);
    }
    return await response.text();
}

// Set up scene
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1); // Ensure the background is black
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const orbit = new OrbitControls(camera, renderer.domElement);

// Show loading model status at the beggining
const loadingStatus = document.createElement('div');
loadingStatus.style.position = 'absolute';
loadingStatus.style.top = '20px';
loadingStatus.style.left = '20px';
loadingStatus.style.padding = '10px';
loadingStatus.style.background = 'rgba(255, 255, 255, 0.8)';
loadingStatus.style.borderRadius = '8px';
loadingStatus.style.zIndex = '1000';
loadingStatus.innerHTML = 'Loading model...';
document.body.appendChild(loadingStatus);

// GUI
const guiContainer = document.getElementById('my-gui-container');
guiContainer.style.position = 'fixed';
guiContainer.style.top = '20px';
guiContainer.style.right = '20px';
guiContainer.style.zIndex = '1001'; // Ensure it remains above the canvas
guiContainer.style.background = 'rgba(255, 255, 255, 0.9)';
guiContainer.style.padding = '15px';
guiContainer.style.borderRadius = '8px';
guiContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

// add ambient light (optional)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// Track model loading progress
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    loadingStatus.innerHTML = `Model loading: ${itemsLoaded} of ${itemsTotal} files loaded.`;
};
loadingManager.onLoad = function () {
    loadingStatus.innerHTML = 'Model loaded successfully.';
    setTimeout(() => loadingStatus.style.display = 'none', 2000); // Hide the loading message after 2 seconds
};
loadingManager.onError = function (url) {
    loadingStatus.innerHTML = `There was an error loading ${url}`;
    loadingStatus.style.background = 'rgba(255, 100, 100, 0.8)'; // Indicate error in red
};

// Load shaders and apply them to the model
async function loadModelWithShaders() {
    try {
        const vertexShader = await loadShader('shaders_sh/vertexShader_sh.glsl');
        const fragmentShader = await loadShader('shaders_sh/fragmentShader_sh.glsl');

        // Load the GLB model with loading manager
        const loader = new GLTFLoader(loadingManager);
        loader.load(
            'static/girl/girl_texture.glb', 
            function (gltf) {
                const model = gltf.scene;
                model.position.set(0, 0, 0);
                scene.add(model);

                // Automatically adjust camera to fit the object
                const box = new THREE.Box3().setFromObject(model);
                if (box.isEmpty()) {
                    console.error('Bounding box is empty. The model might not be loaded properly.');
                    return;
                }
                const center = new THREE.Vector3();
                box.getCenter(center);
                const size = new THREE.Vector3();
                box.getSize(size);

                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                const cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
                camera.position.set(center.x, center.y, cameraZ * 1.5);
                camera.lookAt(center);

                orbit.target.copy(center);
                orbit.update();

                // Apply custom ShaderMaterial to the model using the loaded shaders
                model.traverse((child) => {
                    if (child.isMesh) {
                        const material = new THREE.ShaderMaterial({
                            vertexShader: vertexShader,
                            fragmentShader: fragmentShader,
                            uniforms: {
                                uTexture: { value: child.material.map },
                                shCoeffs: { value: shCoeffs }
                            }
                        });
                        child.material = material;
                    }
                });
                setUpSphericalHarmonicsGUI();
                setUpRenderButton();

            },
            undefined,
            function (error) {
                console.error('An error happened during the model loading', error);
            }
        );
    } catch (error) {
        console.error('Error loading shaders:', error);
    }
}

const shCoeffs = [
    1.0,  // l0,0 (ambient term)
    0.3,  // l1,-1
    0.3,  // l1,0
    0.3,  // l1,1
    0.1,  // l2,-2
    0.1,  // l2,-1
    0.1,  // l2,0
    0.1,  // l2,1
    0.1   // l2,2
  ];

  function setUpSphericalHarmonicsGUI() {
    const gui = new dat.GUI({ autoPlace: false });
    guiContainer.appendChild(gui.domElement);
    const lightController = {
        ambientTerm: shCoeffs[0],
        directionalX: shCoeffs[1],
        directionalY: shCoeffs[2],
        directionalZ: shCoeffs[3],
        quadraticXY: shCoeffs[4],
        quadraticYZ: shCoeffs[5],
        quadraticZZ: shCoeffs[6],
        quadraticXZ: shCoeffs[7],
        quadraticXX_YY: shCoeffs[8]
    };

    gui.add(lightController, 'ambientTerm', 0, 5).name('Ambient Term').onChange((value) => {
        shCoeffs[0] = value;
        updateShaderCoefficients();
    });
    gui.add(lightController, 'directionalX', -2, 2).name('Directional Y').onChange((value) => {
        shCoeffs[1] = value;
        updateShaderCoefficients();
    });
    gui.add(lightController, 'directionalY', -2, 2).name('Directional Z').onChange((value) => {
        shCoeffs[2] = value;
        updateShaderCoefficients();
    });
    gui.add(lightController, 'directionalZ', -2, 2).name('Directional X').onChange((value) => {
        shCoeffs[3] = value;
        updateShaderCoefficients();
    });
    gui.add(lightController, 'quadraticXY', -1, 1).name('Quadratic XY').onChange((value) => {
        shCoeffs[4] = value;
        updateShaderCoefficients();
    });
    gui.add(lightController, 'quadraticYZ', -1, 1).name('Quadratic YZ').onChange((value) => {
        shCoeffs[5] = value;
        updateShaderCoefficients();
    });
    gui.add(lightController, 'quadraticZZ', -1, 1).name('Quadratic ZZ').onChange((value) => {
        shCoeffs[6] = value;
        updateShaderCoefficients();
    });
    gui.add(lightController, 'quadraticXZ', -1, 1).name('Quadratic XZ').onChange((value) => {
        shCoeffs[7] = value;
        updateShaderCoefficients();
    });
    gui.add(lightController, 'quadraticXX_YY', -1, 1).name('Quadratic XX-YY').onChange((value) => {
        shCoeffs[8] = value;
        updateShaderCoefficients();
    });
}

// Update shader material with the new SH coefficients
function updateShaderCoefficients() {
    scene.traverse((child) => {
        if (child.isMesh && child.material && child.material.uniforms && child.material.uniforms.shCoeffs) {
            child.material.uniforms.shCoeffs.value = shCoeffs;
            child.material.needsUpdate = true;
        }
    });
}

// Set up the render button to save an image and JSON
function setUpRenderButton() {
    const renderButton = document.createElement('button');
    renderButton.innerText = 'Render and Save';
    renderButton.style.marginTop = '10px';
    renderButton.style.padding = '10px';
    renderButton.style.borderRadius = '5px';
    renderButton.style.cursor = 'pointer';
    guiContainer.appendChild(renderButton);

    renderButton.addEventListener('click', () => {
        // Render the image in high quality
        renderer.render(scene, camera);
        const dataURL = renderer.domElement.toDataURL('image/png');

        // Create an anchor element and trigger download of the rendered image
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'rendered_image.png';
        link.click();

        // Save the SH coefficients as a JSON file
        const shData = {
            shCoeffs: shCoeffs
        };
        const jsonStr = JSON.stringify(shData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const jsonLink = document.createElement('a');
        jsonLink.href = URL.createObjectURL(blob);
        jsonLink.download = 'sh_coefficients.json';
        jsonLink.click();
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Start loading the model with shaders
loadModelWithShaders();

// Start the animation
animate();