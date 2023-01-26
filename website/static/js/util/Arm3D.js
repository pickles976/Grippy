import * as THREE from 'three'
import { mathToTHREE } from './Geometry.js'

const COLORS = {
    'x' : 0xFFAAAA,
    'y' : 0xAAFFAA,
    'z' : 0xAAAAFF,
    true: 0xFF0000,
    false: 0xFFFF00,
}

export class Arm3D {

    constructor(armjson, scene, collisionProvider) {

        this._scene = scene

        this.arm = this._createArm(armjson)

        // used for detecting and drawing self-intersections
        this._collisionProvider = collisionProvider
        this._isColliding = []

        // for drawing bounding boxes around arms
        this._boxHelpers = this._createBoxes()

        this.drawColliders = true

        this._drawObstacleColliders()

    }

    _drawObstacleColliders() {

        this._collisionProvider.worldGeometries.forEach((obstacle) => {
            this._scene.add(new THREE.Mesh(obstacle, new THREE.MeshBasicMaterial( { color: 0xFFFF00, wireframe: true } )))
        })

    }

    // Create bounding boxes and convert them into meshes
    _createBoxes() {
        let boxes = this._collisionProvider.armGeometries.map((geom) => {
            // make a mesh
            return new THREE.Mesh(geom, new THREE.MeshBasicMaterial( { color: 0xFFFF00, wireframe: true } ))
        })
        boxes.forEach((bh) => this._scene.add(bh))
        return boxes
    }

    // Create a mesh for a robotic arm Link
    _createLink(length, radius, axis) {

        const armMat = new THREE.MeshPhongMaterial({
            color: COLORS[axis],
            flatShading: true,
        });
    
        // TODO: load the width values from json
        const geometry = new THREE.CylinderGeometry(0.66 * radius, radius, length, 12)
        geometry.rotateX(Math.PI / 2)
        geometry.translate(0, 0, length / 2) // change transform point to the bottom of the link
        return new THREE.Mesh(geometry, armMat)
    }

    // Create a mesh for a robotic arm Base
    _createBase(length, radius, axis) {

        const armMat = new THREE.MeshPhongMaterial({
            color: 0xDDDDDD,
            flatShading: true,
        });
    
        const geometry = new THREE.CylinderGeometry(0.84 * radius, 1.25 * radius, length, 12)
        geometry.rotateX(Math.PI / 2)
        geometry.translate(0, 0, -length / 2) // change transform point to the bottom of the link
        return new THREE.Mesh(geometry, armMat)
    }


    _createArm(armjson) {

        let LENGTHS = armjson.arm.map((element) => element.link.length) // x
        let WIDTHS = armjson.arm.map((element) => element.link.width) // y
        let AXES = armjson.arm.map((element) => element.joint.axis)

        let arm = []

        // create base
        let axesHelper = new THREE.AxesHelper(3)
        axesHelper.add(this._createBase(LENGTHS[0], WIDTHS[0] / 2, AXES[0]))
        arm.push(axesHelper)
        this._scene.add(axesHelper)
    
        // create arm links/joints
        for(let i = 1; i < LENGTHS.length; i++) {
            arm[i-1].add(this._createLink(LENGTHS[i], WIDTHS[0] / 2, AXES[i - 1]))

            const axesHelper = new THREE.AxesHelper( 3 );
            this._scene.add(axesHelper)
            arm.push(axesHelper)
        } 
    
        return arm
    }

    // update arm from transform matrices
    updateMatrices(matrices) {

        for (let i = 0; i < this.arm.length; i++) {

            // set arm transform equal to matrix
            let tempMat = mathToTHREE(matrices[i])

            this.arm[i].setRotationFromMatrix(tempMat)

            this.arm[i].updateMatrix()

            let x = tempMat.elements[12]
            let y = tempMat.elements[13]
            let z = tempMat.elements[14]

            this.arm[i].position.set(x, y, z)
            this.arm[i].updateMatrix()
        }
    }

    // Update bounding boxes for visualizing collision detection/intersection
    updateBoundingBoxPositions(matrices) {

        // determine whether or not to draw boxes
        this._boxHelpers.forEach((bh) => bh.visible = this.drawColliders)

        for (let i = 0; i < this._boxHelpers.length; i++) {

            // set arm transform equal to matrix
            let tempMat = mathToTHREE(matrices[i])

            this._boxHelpers[i].setRotationFromMatrix(tempMat)

            this._boxHelpers[i].updateMatrix()

            let x = tempMat.elements[12]
            let y = tempMat.elements[13]
            let z = tempMat.elements[14]

            this._boxHelpers[i].position.set(x, y, z)
            this._boxHelpers[i].updateMatrix()

            this._boxHelpers[i].material.color.setHex(COLORS[this._isColliding[i]])
        }

    }

    // update the position of the colliders and the collision status
    updateCollisionColors(matrices) {

        let l1 = this._collisionProvider.findSelfIntersections(matrices)
        let l2 = this._collisionProvider.findObstacleIntersections(matrices)

        // this._isColliding = this._collisionProvider.findSelfIntersections(matrices);
        this._isColliding = l1.map((val, j) => val || l2[j])

    }

    /**
     * Clean up the Three.js objects belonging to this arm from the _scene.
     */
    cleanup() {
        this.arm.forEach((element) => this._scene.remove(element))
        this._boxHelpers.forEach((element) => this._scene.remove(element))
    }

    showColliders(bool) {

        this.drawColliders = bool

    }
    

}