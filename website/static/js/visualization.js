import * as THREE from 'three';
import { MapControls } from 'https://unpkg.com/three@0.146.0/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'https://unpkg.com/three@0.146.0/examples/jsm/libs/lil-gui.module.min.js'
import { mathToTHREE } from './util/Geometry.js'
import { targetVecToMatrix } from './util/Interpolation.js';
import { WasmSolver } from './solvers/WasmSolver.js'
import { Arm3D } from './util/Arm3D.js'
import { ArmJson } from './util/ArmJson.js'
import { CollisionProvider } from './util/CollisionProvider.js'
import init from "../pkg/krust.js";
import { IKSolverJC } from './solvers/SolverJC.js';

const ORIGIN = math.matrix([
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
])

const x = 5
const y = 5
const z = 7
const xRot = 0
const yRot = 0
const zRot = 0

// Target matrix, target is target object, targetVec is target values for interpolating between
let targetVec = [x,y,z,xRot,yRot,zRot]
let TARGET = targetVecToMatrix(targetVec)

let canvas, renderer, camera, scene, orbit, targetGUI, armGUI, armjson, editor, obstacles, target

let LENGTHS = []
let WIDTHS = []
let HEIGHTS = []
let AXES = []
let THETAS = []
let MIN_ANGLES = []
let MAX_ANGLES = []

export function getTargetVector() {
    return targetVec
}

function initThree() {

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
    const lineMat = new THREE.LineBasicMaterial( { color: 0x000000, linewidth: 2.0 } );
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

function updateArm(controls) {
    arm.showColliders(controls.showColliders)
}

function updateArmJSON() {

    loadArmFromJSON(editor.get())

    arm.cleanup()
    collisionProvider = new CollisionProvider(armjson, obstacles)
    arm = new Arm3D(armjson, scene, collisionProvider)
    solver = new WasmSolver(AXES, LENGTHS, THETAS, ORIGIN, MIN_ANGLES, MAX_ANGLES, collisionProvider)
    solver.solve(TARGET, 0.00001)

}

function initArmGUI() {

    const container = document.getElementById("armgui")
    armGUI = new GUI({ width: window.innerWidth / 8, container: container, title: "Arm Options" })

    let controls = 
    {   
        "showColliders": true,
        "toggleColliders": () => { 
            controls.showColliders = !controls.showColliders 
            updateArm(controls)
        },
        "resetArm" : () => {updateArmJSON(), updateArm(controls)}
    }

    armGUI.add( controls, 'toggleColliders')
    armGUI.add( controls, 'resetArm')
    armGUI.open()
}

function initTargetGUI() {

    const container = document.getElementById("targetgui")
    targetGUI = new GUI({ width: window.innerWidth / 4, container: container, title: "End Effector Controls" })

    let controls = 
    {   
        x,
        y,
        z,
        xRot, 
        yRot, 
        zRot,
    }

    targetGUI.add( controls, 'x', -15, 15).onChange((value) => updateTarget(controls))
    targetGUI.add( controls, 'y', -15, 15).onChange(() => updateTarget(controls))
    targetGUI.add( controls, 'z', 0, 15).onChange(() => updateTarget(controls))
    targetGUI.add( controls, 'xRot', -Math.PI, Math.PI).onChange(() => updateTarget(controls))
    targetGUI.add( controls, 'yRot', -Math.PI, Math.PI).onChange(() => updateTarget(controls))
    targetGUI.add( controls, 'zRot', -Math.PI, Math.PI).onChange(() => updateTarget(controls))
    targetGUI.open();
}

function initJsonGUI() {

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

    armjson = json

    LENGTHS = armjson.arm.map((element) => element.link.length) // x
    WIDTHS = armjson.arm.map((element) => element.link.width) // y
    HEIGHTS = armjson.arm.map((element) => element.link.height) //z 
    AXES = armjson.arm.map((element) => element.joint.axis)
    MIN_ANGLES = armjson.arm.map((element) => element.joint.minAngle * Math.PI / 180)
    MAX_ANGLES = armjson.arm.map((element) => element.joint.maxAngle * Math.PI / 180)

    // Just start in the middle of the constraint values
    THETAS = armjson.arm.map((element) => (element.joint.minAngle + element.joint.maxAngle) * Math.PI / 360)
}

function updateTarget(controls) {

    let x = controls.x
    let y = controls.y
    let z = controls.z
    let xRot = controls.xRot
    let yRot = controls.yRot
    let zRot = controls.zRot

    targetVec = [x,y,z,xRot,yRot,zRot]

    reDrawTarget(targetVec)

}

export function reDrawTarget(targetVec) {
    TARGET = targetVecToMatrix(targetVec)
    scene.remove(target)
    target = drawTarget(TARGET)
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

    if (solver.loss > 0.00001) {
        solver.thetas = THETAS
        solver.solve(TARGET, 0.00001)
    }

    // console.log(solver.getJoints())
    arm.updateMatrices(solver.getJoints())
    arm.updateBoundingBoxPositions(solver._forwardMats)
    arm.updateCollisionColors(solver._forwardMats)

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

await init() // initialize WASM package
initThree()
initTargetGUI()
initJsonGUI()
initArmGUI()
createGround()

loadArmFromJSON(ArmJson)

target = drawTarget(TARGET)
obstacles = []

let collisionProvider = new CollisionProvider(armjson, obstacles)
let arm = new Arm3D(armjson, scene, collisionProvider)
let solver = new WasmSolver(AXES, LENGTHS, THETAS, ORIGIN, MIN_ANGLES, MAX_ANGLES, collisionProvider)

requestAnimationFrame(render)

