import * as THREE from '../three/build/three.module.js';
import { OrbitControls } from '../three/examples/jsm/controls/OrbitControls.js';

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Loaders
const textureLoader = new THREE.TextureLoader();

// Convert Earth locations into xyz values
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}

/**
 * Earth
 */
// Textures
const earthDayTexture = textureLoader.load('./Javascript/static/earth/day.jpg');
earthDayTexture.colorSpace = THREE.SRGBColorSpace;

const earthNightTexture = textureLoader.load('./Javascript/static/earth/night.jpg');
earthNightTexture.colorSpace = THREE.SRGBColorSpace;

const earthSpecularCloudsTexture = textureLoader.load('./Javascript/static/earth/specularClouds.jpg');

/**
 * Lighting
 */
// Create the directional light (representing the Sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // White light with intensity 1
directionalLight.position.set(10, 10, 10); // Position the light at (x: 10, y: 10, z: 10)
scene.add(directionalLight); // Add the light to the scene

/**
 * Clouds
 */
earthSpecularCloudsTexture.encoding = THREE.sRGBEncoding;

// Mesh
const earthGeometry = new THREE.SphereGeometry(1.5, 64, 64);

// Load shaders as text
const loadShader = async (path) => {
    const response = await fetch(path);
    return await response.text();
};

// Fetch both vertex and fragment shaders
Promise.all([
    loadShader('./Javascript/Index_Earth/shaders/earth/vertex.glsl'),
    loadShader('./Javascript/Index_Earth/shaders/earth/fragment.glsl')
]).then(([vertexShaderText, fragmentShaderText]) => {
    // Create ShaderMaterial after shaders are loaded
    const earthMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderText,
        fragmentShader: fragmentShaderText,
        blending: THREE.AdditiveBlending, // Additive blending to combine clouds
        transparent: true,
        uniforms: {
            uDayTexture: new THREE.Uniform(earthDayTexture),
            uNightTexture: new THREE.Uniform(earthNightTexture),
            uSpecularCloudsTexture: new THREE.Uniform(earthSpecularCloudsTexture),
            uLightPosition: new THREE.Uniform(directionalLight.position)
        }
    });

    // Create the earth mesh after shader material is ready
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    const tooltip = document.getElementById('tooltip');

    const markerData = [
        { index: 0 , id: 'New Zealand', lat: -40.9006, lon: 174.8860 },
        { index: 1,id: 'Japan', lat: 35.6762, lon: 139.6503 },
        { index: 2, id: 'Mexico', lat: 23.6345, lon: -102.5528 },
        { index: 3, id: 'Scotland', lat: 56.4907, lon: -4.2026 },
        { index: 4, id: 'China', lat: 35.8617, lon: 104.1954 }
    ];

    const normalMap = new THREE.TextureLoader().load('Javascript/Connections_Earth/Location-Marker.png');
    const invertedMap = new THREE.TextureLoader().load('Javascript/Connections_Earth/Location-Marker-Inverted.png');
    const aspectRatio = 52 / 35;
    const size = 0.15;

    const markers = {};

    markerData.forEach(({ index, id, lat, lon }) => {
        const position = latLonToVector3(lat, lon, 1.57);
        const isSouthern = lat < 0;

        const material = new THREE.SpriteMaterial({
            map: isSouthern ? invertedMap : normalMap,
            transparent: true,
            opacity: 1.0
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(size, size * aspectRatio, 1.0);
        sprite.position.copy(position);
        sprite.userData = { id, index };
        sprite.name = id;

        markers[id] = sprite;
        earth.add(sprite);
    });

    /**
     * Sizes
     */
    const sizes = {
        width: 1500,
        height: 1024,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
    };

    /**
     * Camera
     */
    // Base camera
    const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100);
    camera.position.x = 12;
    camera.position.y = -3;
    camera.position.z = 7;
    scene.add(camera);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 1.8;

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true // Enable transparency
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(sizes.pixelRatio);

    /**
     * Animate
     */
    const clock = new THREE.Clock();

    const tick = () => {
        const elapsedTime = clock.getElapsedTime();

        // Rotate Earth
        earth.rotation.y = elapsedTime * 0.04 + 3;

        // Update light position
        directionalLight.position.x = Math.sin(Date.now() * 0.00001) * 10;
        directionalLight.position.z = Math.cos(Date.now() * 0.00001) * 10;
        directionalLight.lookAt(earth.position);
        earth.material.uniforms.uLightPosition.value = directionalLight.position;

        // Marker Visibility logic
        Object.values(markers).forEach(marker => {
            const markerWorldPos = new THREE.Vector3();
            marker.getWorldPosition(markerWorldPos);

            const normal = markerWorldPos.clone().sub(earth.position).normalize();
            const markerToCam = camera.position.clone().sub(markerWorldPos).normalize();
            const dot = normal.dot(markerToCam);

            marker.visible = dot > 0;
        });

        // Update controls
        controls.update();

        // Raycasting for interaction
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(Object.values(markers));

        // Inside the tick function
        if (intersects.length > 0) {
            const intersectedMarker = intersects[0].object;
            if (INTERSECTED !== intersectedMarker) {
                if (INTERSECTED) INTERSECTED.scale.set(size, size * aspectRatio, 1.0);
        
                INTERSECTED = intersectedMarker;
                INTERSECTED.scale.set(size * 1.1, size * 1.1 * aspectRatio, 1.0);
        
                tooltip.textContent = INTERSECTED.userData.id;
                tooltip.style.display = 'block';
            }
        } else {
            if (INTERSECTED) INTERSECTED.scale.set(size, size * aspectRatio, 1.0);
            INTERSECTED = null;
            tooltip.style.display = 'none';
        }
               
        canvas.style.cursor = intersects.length > 0 ? 'pointer' : 'default';        

        // Render
        renderer.render(scene, camera);

        // Loop
        window.requestAnimationFrame(tick);
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let INTERSECTED = null;

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
    
        // Calculate mouse position relative to canvas
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
    
        // Update raycasting mouse coordinates
        mouse.x = (offsetX / rect.width) * 2 - 1;
        mouse.y = -(offsetY / rect.height) * 2 + 1;
    
        // Position tooltip relative to canvas, adjusted for canvas offset
        tooltip.style.left = `${offsetX + canvas.offsetLeft + 10}px`;
        tooltip.style.top = `${offsetY + canvas.offsetTop + 10}px`;
    });

    canvas.addEventListener('click', () => {
        if (INTERSECTED) {
            const index = INTERSECTED.userData.index;

            console.log('Clicked marker:', INTERSECTED.userData.id);
            canvas.style.cursor = INTERSECTED ? 'pointer' : 'default';

            openCountryInfo(index);
        }
    });

    tick();
});
