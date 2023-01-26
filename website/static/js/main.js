/**
 * This file is the testbed for single js solver implementations.
 * If you want to see how a GA or Jacobian solver runs step-by-step then
 * use this file.
 */

import * as THREE from 'three'
import { MapControls } from 'https://unpkg.com/three@0.146.0/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'https://unpkg.com/three@0.146.0/examples/jsm/libs/lil-gui.module.min.js'
import { mathToTHREE, rMat3D, tMat3D } from './util/Geometry.js'
import { Arm3D } from './util/Arm3D.js'
import { ArmJson } from './util/ArmJson.js'
import { CollisionProvider } from './util/CollisionProvider.js'

import { WasmSolver } from "./solver/WasmSolver.js"
import init from "../pkg/krust.js";

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

let LENGTHS = []
let WIDTHS = []
let HEIGHTS = []
let AXES = []
let THETAS = []
let MIN_ANGLES = []
let MAX_ANGLES = []

let canvas, renderer, camera, scene, orbit, targetGUI, armGUI, armjson, editor, obstacles

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

    let start = Date.now();
    solver.solve(TARGET, 0.000001)
    console.log(`Elapsed time: ${Date.now() - start}`)

}

function updateArmJSON() {

    loadArmFromJSON(editor.get())

    arm.cleanup()
    collisionProvider = new CollisionProvider(armjson, obstacles)
    arm = new Arm3D(armjson, scene, collisionProvider)
    solver = new WasmSolver(AXES, LENGTHS, THETAS, ORIGIN, MIN_ANGLES, MAX_ANGLES, collisionProvider)
    // solver = new IKSolver3D(AXES, LENGTHS, THETAS, ORIGIN, MIN_ANGLES, MAX_ANGLES, collisionProvider)
    solver.solve(TARGET, 0.000001)

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

function createGround() {
    
    const groundMat = new THREE.MeshPhongMaterial({
        color: 0x00FF11,    // red (can also use a CSS color string here)
        flatShading: true,
    });
    const groundGeo = new THREE.PlaneGeometry(64, 64, 4, 4)
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    scene.add(groundMesh)
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

    if (solver.loss > 0.000001) {
        solver.solve(TARGET, 0.000001)
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

function generateObstacles() {

    obstacles = []

    function makeWall() {
        const mat = new THREE.MeshPhongMaterial({
            color: "#999999",
            flatShading: true,
        });

        const length = 10
        const width = 1
        const height = 4

        const geometry = new THREE.BoxGeometry(length, width, height)
        geometry.translate(0, 0, height / 2) // change transform point to the bottom of the link
        return new THREE.Mesh(geometry, mat)
    }

    let wall1 = makeWall()
    wall1.geometry.translate(0, 7.5, 0)
    obstacles.push(wall1)
    scene.add(wall1)

    let wall2 = makeWall()
    wall2.geometry.translate(0, 7.5, 8)
    obstacles.push(wall2)
    scene.add(wall2)

}

await init() // initialize WASM package
initThree()
initTargetGUI()
initJsonGUI()
initArmGUI()
createGround()
generateObstacles()

let collisionProvider = new CollisionProvider(armjson, obstacles)
let arm = new Arm3D(armjson, scene, collisionProvider)
let solver = new WasmSolver(AXES, LENGTHS, THETAS, ORIGIN, MIN_ANGLES, MAX_ANGLES, collisionProvider)
// let solver = new IKSolver3D(AXES, LENGTHS, THETAS, ORIGIN, MIN_ANGLES, MAX_ANGLES, collisionProvider)
solver.solve(TARGET, 0.000001)
let target = drawTarget(TARGET)

requestAnimationFrame(render)