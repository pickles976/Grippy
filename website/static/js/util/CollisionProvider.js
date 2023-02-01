import * as THREE from 'three'
import { CheckCollision, Shape, ShapeFromGeometry } from 'SAT'
import { IDENTITY, distanceBetweeen, mathToTHREE, tMat3D } from './Geometry.js'

export class CollisionProvider {

    // x, y, z
    constructor(armjson, world) {

        // Arm-based stuff
        let lengths = armjson.arm.map((element) => element.link.length) // x
        let widths = armjson.arm.map((element) => element.link.width) // y
        let heights = armjson.arm.map((element) => element.link.height) //z 

        this.armGeometries = []
        this.armColliders = []
        
        this.generateArmColliders(lengths, widths, heights)

        // World-based stuff
        this.worldGeometries = []
        this.worldColliders = []
        this.generateWorldColliders(world)
        
    }

    // z, aka, height is the length of the link, kind of confusing, no?
    generateArmColliders(lengths, widths, heights) {

        console.assert(lengths.length == widths.length && lengths.length == heights.length)

        for (let i = 0; i < lengths.length; i++){
            let boxGeo = new THREE.BoxGeometry(heights[i], widths[i], lengths[i]);
            boxGeo.translate(0, 0, lengths[i] / 2)
            let centroid = tMat3D(0,0, heights[i] / 2)

            this.armGeometries.push(boxGeo)
            this.armColliders.push(new Collider(ShapeFromGeometry(boxGeo), centroid, lengths[i], widths[i], heights[i]))
        }

    }

    generateWorldColliders(world) {

        return world.forEach((mesh) => {

            let box = new THREE.Box3().setFromObject(mesh)

            let length = box.max.x - box.min.x
            let width = box.max.y - box.min.y
            let height = box.max.z - box.min.z

            let center = new THREE.Vector3()
            box.getCenter(center)

            let centroid = tMat3D(center.x, center.y, center.z)

            this.worldGeometries.push(mesh.geometry)
            this.worldColliders.push(new Collider(ShapeFromGeometry(mesh.geometry), centroid, length, width, height))

        })
    }

    /**
     * Get the actual collider shape to be used by SAT.js
     * @returns {Shape}
     */
    getColliders() {
        return this.armColliders.map((col) => col.shape);
    }

    /**
     * Returns true if colliders intersect for a given configuration
     * @param {matrix} matrices 
     * @returns {boolean}
     */
    isSelfIntersecting(matrices){

        // console.assert(matrices.length == this.armColliders.length, "Array lengths do not match!")

        // Transform the centroids of the arm colliders
        let centroids = this.armColliders.map((col, i) => {
            return col.transformCentroid(matrices[i])
        })

        // ((n - 2) ^ 2) / 2
        // TODO: speedup by sorting centroids in KD or something idk
        for (let i = 0; i < centroids.length; i++) {
            for (let j = i; j < centroids.length; j++) {
                if (j - i > 1) {
                    if (distanceBetweeen(centroids[i], centroids[j]) < (this.armColliders[i].max + this.armColliders[j].max)) {
                        if (CheckCollision(transformCollider(this.armColliders[i].shape, matrices[i]), transformCollider(this.armColliders[j].shape, matrices[j]))) {
                            return true
                        }
                    }
                }   
            }
        }

        return false
        
    }

    /**
     * Finds the indices of the arm which are self-intersecting
     * @param {Array[matrix]} matrices 
     * @returns 
     */
    findSelfIntersections(matrices){

        // console.assert(matrices.length == this.armColliders.length, "Array lengths do not match!")

        // Transform the centroids of the arm colliders
        let centroids = this.armColliders.map((col, i) => {
            return col.transformCentroid(matrices[i])
        })

        let isColliding = new Array(this.armColliders.length)

        for (let i = 0; i < this.armColliders.length; i++){
            isColliding[i] = false
        }

        for (let i = 0; i < centroids.length; i++) {
            for (let j = i; j < centroids.length; j++) {
                if (j - i > 1) {
                    if (distanceBetweeen(centroids[i], centroids[j]) < (this.armColliders[i].max + this.armColliders[j].max)) {
                        if (CheckCollision(transformCollider(this.armColliders[i].shape, matrices[i]), transformCollider(this.armColliders[j].shape, matrices[j]))) {
                            isColliding[i] = true
                            isColliding[j] = true
                        }
                    }
                }   
            }
        }   

        return isColliding

    }

    /**
     * Finds the indices of the arm which are self-intersecting
     * @param {Array[matrix]} matrices 
     * @returns 
     */
    findClosestSections(matrices){

        // Transform the centroids of the arm colliders
        let centroids = this.armColliders.map((col, i) => {
            return col.transformCentroid(matrices[i])
        })

        let closest = Number.MAX_VALUE
        let j1 = -1
        let j2 = -1

        for (let i = 0; i < centroids.length; i++) {
            for (let j = i; j < centroids.length; j++) {
                if (j - i > 1) {
                    let dist = distanceBetweeen(centroids[i], centroids[j]) 

                    if (dist < closest) {
                        j1 = i
                        j2 = j
                        closest = dist
                    }
                }   
            }
        }   

        return [j1, j2]

    }

    /**
     * Check if any section of the arm is intersecting an obstacle
     * @param {Array[matrix]} matrices 
     * @returns 
     */
    isIntersectingObstacles(matrices){

        // Transform the centroids of the arm colliders
        let armCentroids = this.armColliders.map((col, i) => {
            return col.transformCentroid(matrices[i])
        })

        let obstacleCentroids = this.worldColliders.map((col) => {
            return col.centroid
        })

        // ((n - 2) ^ 2) / 2
        // TODO: speedup by sorting centroids in KD or something idk
        for (let i = 0; i < armCentroids.length; i++) {
            for (let j = 0; j < obstacleCentroids.length; j++) {
                if (distanceBetweeen(armCentroids[i], obstacleCentroids[j]) < (this.armColliders[i].max + this.worldColliders[j].max)) {
                    if (CheckCollision(transformCollider(this.armColliders[i].shape, matrices[i]), transformCollider(this.worldColliders[j].shape, IDENTITY))) {
                        return true
                    }
                } 
            }
        }

        return false

    }

    /**
     * Check if any section of the arm is intersecting an obstacle
     * @param {Array[matrix]} matrices 
     * @returns 
     */
    findObstacleIntersections(matrices){

        // Transform the centroids of the arm colliders
        let armCentroids = this.armColliders.map((col, i) => {
            return col.transformCentroid(matrices[i])
        })

        let obstacleCentroids = this.worldColliders.map((col) => {
            return col.centroid
        })

        let isColliding = new Array(this.armColliders.length)

        for (let i = 0; i < this.armColliders.length; i++){
            isColliding[i] = false
        }

        // ((n - 2) ^ 2) / 2
        // TODO: speedup by sorting centroids in KD or something idk
        for (let i = 0; i < armCentroids.length; i++) {
            for (let j = 0; j < obstacleCentroids.length; j++) {
                if (distanceBetweeen(armCentroids[i], obstacleCentroids[j]) < (this.armColliders[i].max + this.worldColliders[j].max)) {
                    if (CheckCollision(transformCollider(this.armColliders[i].shape, matrices[i]), transformCollider(this.worldColliders[j].shape, IDENTITY))) {
                        isColliding[i] = true
                    }
                }
            }
        }

        return isColliding

    }

    dump() {

        let arm_offsets = this.armColliders.map((col) => {
            let mat = col.centroid._data
            return [mat[0][3], mat[1][3], mat[2][3]]
        })

        let arm_half_extents = this.armColliders.map((col) => [col.length / 2, col.width / 2, col.height / 2])

        let world_offsets = this.worldColliders.map((col) => {
            let mat = col.centroid._data
            return [mat[0][3], mat[1][3], mat[2][3]]
        })

        let world_half_extents = this.worldColliders.map((col) => [col.length / 2, col.width / 2, col.height / 2])

        return {
            arm_offsets,
            arm_half_extents,
            world_offsets, 
            world_half_extents,
        }

    }

    distance(i, j, matrices) {

        let c1 = this.armColliders[i].transformCentroid(matrices[i])
        let c2 = this.armColliders[j].transformCentroid(matrices[j])

        return distanceBetweeen(c1, c2) 
    }

}

/**
 * Collider class holds data used for collision detection
 * @field shape is a SAT.js mesh implementation used for collision detection
 * @field centroid is the center of a mesh's bbox
 * @field max is the max extends of a mesh's bbox 
 * 
 */
class Collider {
    
    constructor(shape, centroid, length, width, height) {
        this.shape = shape
        this.centroid = centroid
        this.length = length // x
        this.width = width // y
        this.height = height // z
        this.max = Math.max(length, width, height)
    }

    transformCentroid(matrix) {
        return math.multiply(this.centroid, matrix)
    }

    // transformCollider(matrix) {

    // }

}

/**
 * Transform colliders with a given matrix
 * @param {Shape} colliders 
 * @param {matrix} matrices 
 * @returns 
 */
function transformCollider(collider, matrix) {

    // set arm transform equal to matrix
    let tempMat = mathToTHREE(matrix)

    collider.SetPosition(0, 0, 0)
    collider.SetRotation(0, 0, 0)
    collider.ApplyMatrix4(tempMat)

    return collider
}

/**
 * Check if any section of the arm is intersecting an obstacle
 * @param {Array[Shape]} colliders 
 * @param {Array[Shape]} obstacles 
 * @param {Array[matrix]} matrices 
 * @returns 
 */
export function isIntersectingObjects(armColliders, matrices, obstacles){

    let colliders = armColliders.map((col, i) => { return transformCollider(col, matrices[i])})

    // console.log(colliders)

    colliders.forEach((collider) => {
        obstacles.forEach((obstacle) => {
            if (collider.GetCenter().distanceTo(obstacle.GetCenter() < 4.0)) {
                if (CheckCollision(collider, obstacle)) {
                    return true
                }
            }
        })
    })

    return false

}
