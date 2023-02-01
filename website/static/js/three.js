import * as THREE from 'three';

// grab canvas
let canvas = document.querySelector('#canvas');

// renderer
let renderer = new THREE.WebGLRenderer({
    canvas,
    logarithmicDepthBuffer: true,
});
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

// scene
let scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xEBE2DB, 0.00003);

// camera
let camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 5, 2000000 );
camera.position.set(0, 20, 20);
camera.up.set(0, 0, 1);
camera.lookAt(0, 0, 0);

// lighting
const color = 0xFFFFFF;
const intensity = 0.6;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
scene.add(light);

const ambient = new THREE.AmbientLight(color, 0.3);
scene.add(ambient);

const axesHelper = new THREE.AxesHelper( 10 );
axesHelper.position.set(0, 0, 0.003)
scene.add( axesHelper );

// Grid Helper
const size = 64
const gridHelper = new THREE.GridHelper( size, size, 0x444444, 0x999999);
gridHelper.rotateX(Math.PI / 2)
gridHelper.position.set(0, 0, 0.001)
scene.add( gridHelper );

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

function render() {

    // fix buffer size
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    // fix aspect ratio
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.rotateOnWorldAxis(new THREE.Vector3(0,0,1), 0.01)
    camera.updateProjectionMatrix();
    
    // render, or 'create a still image', of the scene
    renderer.render(scene, camera);

    requestAnimationFrame(render)

}

requestAnimationFrame(render)