import * as THREE from 'three'
import { MapControls } from 'https://unpkg.com/three@0.146.0/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'https://unpkg.com/three@0.146.0/examples/jsm/libs/lil-gui.module.min.js'
import { IKSolver3D } from './Solver3D.js'
import { mathToTHREE, rMat3D, tMat3D } from './Geometry.js'
import { Arm3D } from './Arm3D.js'
import { ArmJson } from './ArmJson.js'

const ORIGIN = math.matrix([
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
])

const xRot = 0
const yRot = 0
const zRot = 0
const x = 5
const y = 5
const z = 7

let TARGET = math.multiply(math.multiply(math.multiply(tMat3D(x,y,z),rMat3D(xRot, 'x')), rMat3D(yRot, 'y')), rMat3D(zRot, 'z'))

let RADII = [1, 4, 4, 4, 4, 2, 2]
let AXES = ['z', 'y', 'y', 'y', 'y', 'x', 'z']
let THETAS = [0, 0, 0, 0, 0, 0, 0]

let canvas, renderer, camera, scene, orbit, gui, armjson, editor

function drawTarget(matrix) {

    const root = new THREE.Object3D();

    let x = matrix.get([0, 3])
    let y = matrix.get([1, 3])
    let z = matrix.get([2, 3])

    // Draw the orientation
    const axesHelper = new THREE.AxesHelper(5)
    axesHelper.applyMatrix4(mathToTHREE(matrix))
    root.add(axesHelper)

    // Draw the lines
    const lineMat = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 5.0 } );
    const points = []
    points.push(new THREE.Vector3(0, 0, 0))
    points.push(new THREE.Vector3(x, 0, 0))
    points.push(new THREE.Vector3(x, y, 0))
    points.push(new THREE.Vector3(x, y, z))
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry, lineMat );
    line.position.set(0, 0, 0.002)
    root.add(line)

    scene.add( root )

    return root


}

function updateTarget(controls) {

    let x = controls.x
    let y = controls.y
    let z = controls.z
    let xRot = controls.xRot
    let yRot = controls.yRot
    let zRot = controls.zRot

    TARGET = math.multiply(math.multiply(math.multiply(tMat3D(x,y,z),rMat3D(xRot, 'x')), rMat3D(yRot, 'y')), rMat3D(zRot, 'z'))

    scene.remove(target)
    target = drawTarget(TARGET)
    solver.target = TARGET
    solver.resetParams()

}

function updateArmJSON() {

    loadArmFromJSON(editor.get())

    arm.arm.forEach((element) => scene.remove(element))
    arm = new Arm3D(RADII, AXES, scene)
    solver = new IKSolver3D(AXES, RADII, THETAS, ORIGIN)
    solver.target = TARGET
    solver.resetParams()

}

function initTargetGUI() {

    gui = new GUI({ width: window.innerWidth / 3, })

    let controls = 
    {   
        x,
        y,
        z,
        xRot, 
        yRot, 
        zRot
    };

    gui.add( controls, 'x', -15, 15).onChange((value) => updateTarget(controls))
    gui.add( controls, 'y', -15, 15).onChange(() => updateTarget(controls))
    gui.add( controls, 'z', 0, 15).onChange(() => updateTarget(controls))
    gui.add( controls, 'xRot', -Math.PI, Math.PI).onChange(() => updateTarget(controls))
    gui.add( controls, 'yRot', -Math.PI, Math.PI).onChange(() => updateTarget(controls))
    gui.add( controls, 'zRot', -Math.PI, Math.PI).onChange(() => updateTarget(controls))
    gui.open();
}

function initArmGUI() {

    // create the editor
    const container = document.getElementById("jsoneditor")
    const options = { onChange: updateArmJSON }
    editor = new JSONEditor(container, options)

    editor.set(ArmJson)

    // get json
    armjson = editor.get()

    loadArmFromJSON(armjson)
}

function loadArmFromJSON(json) {
    RADII = json.arm.map((element) => element.link.length)
    AXES = json.arm.map((element) => element.joint.axis)
    THETAS = json.arm.map((element) => 0)
}

function createGround() {
    
    const groundMat = new THREE.MeshPhongMaterial({
        color: 0x00FF11,    // red (can also use a CSS color string here)
        flatShading: true,
    });
    const groundGeo = new THREE.PlaneGeometry(64, 64, 4, 4)
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    scene.add(groundMesh)
}

function init() {

    // grab canvas
    canvas = document.querySelector('#canvas');

    // renderer
    renderer = new THREE.WebGLRenderer({
        canvas,
        logarithmicDepthBuffer: true,
    });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;

    // scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xEBE2DB, 0.00003);


    // camera
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 5, 2000000 );
    camera.position.set(0, 20, 20);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    // map orbit
    orbit = new MapControls(camera, canvas)
    orbit.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    orbit.dampingFactor = 0.05;
    orbit.screenSpacePanning = false;
    orbit.minDistance = 10;
    orbit.maxDistance = 16384;
    orbit.maxPolarAngle = (Math.PI / 2) - (Math.PI / 360)

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

}

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

async function render() {

    orbit.update()
    solver.update()
    arm.updateMatrices(solver.getJoints())

    // fix buffer size
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    // fix aspect ratio
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
   

    renderer.render(scene, camera);
    requestAnimationFrame(render)

}

init()
initTargetGUI()
initArmGUI()
createGround()

let arm = new Arm3D(RADII, AXES, scene)
let solver = new IKSolver3D(AXES, RADII, THETAS, ORIGIN)
let target = drawTarget(TARGET)
solver.target = TARGET
solver.initializeMomentums()

requestAnimationFrame(render)