import * as THREE from 'three'

export const IDENTITY = math.matrix( [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
])

// get the X,Y,Z coords from a 3D homogeneous transformation matrix
export function getXYZfromMatrix(matrix) {
    return [matrix.get([0, 3]), matrix.get([1, 3]), matrix.get([2, 3])]
}

/**
 * Constraints: only handles one-axis rotation at a time. Radius is locked to z-axis
 * @param {number} theta amount to rotate by
 * @param {string} axis axis to rotate around. Must be x, y or z 
 * @param {number} radius length in z-axis
 */
export function mat4(theta, axis, radius) {

    const tMat = tMat3D(0, 0, radius)
    const rMat = rMat3D(theta, axis)

    return math.multiply(tMat, rMat)

}

export function rMat3D(theta, axis) {

    switch(axis) {
        case 'x':
            return rotationMatrixX(theta)
        case 'y':
            return rotationMatrixY(theta)
        case 'z':
            return rotationMatrixZ(theta)
        default:
            break
    }

    return IDENTITY

}

export function tMat3D(x, y, z) {
    return math.matrix([
        [1, 0, 0, x],
        [0, 1, 0, y],
        [0, 0, 1, z],
        [0, 0, 0, 1],
    ])
}

function rotationMatrixX(theta) {

    const cos = Math.cos(theta)
    const sin = Math.sin(theta)

    return math.matrix([
        [1, 0, 0, 0],
        [0, cos, -sin, 0],
        [0, sin, cos, 0],
        [0, 0, 0, 1]
    ])
}

function rotationMatrixY(theta) {

    const cos = Math.cos(theta)
    const sin = Math.sin(theta)

    return math.matrix([
        [cos, 0, sin, 0],
        [0, 1, 0, 0],
        [-sin, 0, cos, 0],
        [0, 0, 0, 1]
    ])
}

function rotationMatrixZ(theta) {

    const cos = Math.cos(theta)
    const sin = Math.sin(theta)

    return math.matrix([
        [cos, -sin, 0, 0],
        [sin, cos, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ])
}

export function transformLoss(actual, expected, DIST_CORRECTION, ROT_CORRECTION) { 

    const errX = Math.pow((expected.get([0, 3]) - actual.get([0, 3])) / DIST_CORRECTION, 2)
    const errY = Math.pow((expected.get([1, 3]) - actual.get([1, 3])) / DIST_CORRECTION, 2)
    const errZ = Math.pow((expected.get([2, 3]) - actual.get([2, 3])) / DIST_CORRECTION, 2)

    let errRot = 0
    errRot += Math.pow((expected.get([0, 0]) - actual.get([0, 0])) / ROT_CORRECTION, 2)
    errRot += Math.pow((expected.get([0, 1]) - actual.get([0, 1])) / ROT_CORRECTION, 2)
    errRot += Math.pow((expected.get([0, 2]) - actual.get([0, 2])) / ROT_CORRECTION, 2)

    errRot += Math.pow((expected.get([1, 0]) - actual.get([1, 0])) / ROT_CORRECTION, 2)
    errRot += Math.pow((expected.get([1, 1]) - actual.get([1, 1])) / ROT_CORRECTION, 2)
    errRot += Math.pow((expected.get([1, 2]) - actual.get([1, 2])) / ROT_CORRECTION, 2)

    errRot += Math.pow((expected.get([2, 0]) - actual.get([2, 0])) / ROT_CORRECTION, 2)
    errRot += Math.pow((expected.get([2, 1]) - actual.get([2, 1])) / ROT_CORRECTION, 2)
    errRot += Math.pow((expected.get([2, 2]) - actual.get([2, 2])) / ROT_CORRECTION, 2)

    errRot /= ROT_CORRECTION

    return (errX + errY + errZ + errRot)
}

export function distanceBetweeen(mat1, mat2) {

    let dist = 0
    
    dist += Math.abs(mat1.get([0, 3]) - mat2.get([0, 3]))
    dist += Math.abs(mat1.get([1, 3]) - mat2.get([1, 3]))
    dist += Math.abs(mat1.get([2, 3]) - mat2.get([2, 3]))

    return dist
}

/**
 * Converts math.js Matrix4 to THREE.js Matrix4
 * @param {math.matrix} in_matrix 
 * @returns {THREE.Matrix4}
 */
export function mathToTHREE(in_matrix) {
    let dim = in_matrix.size()

    let arr = []

    for (let i = 0; i < dim[0]; i++) {
        for (let j = 0; j < dim[1]; j++) {
            arr.push(in_matrix.get([i, j]))
        }
    }

    let m = new THREE.Matrix4()
    return m.set(...arr)

}

/**
 * 
 * @param {*} origin 
 * @param {*} thetas 
 * @param {*} axes 
 * @param {*} radii 
 * @returns 
 */
export function generateMats(origin, thetas, axes, radii) { 

    let matrices = []
    matrices.push(origin)

    for (let i = 0; i < thetas.length; i++){
        matrices.push(mat4(thetas[i], axes[i], radii[i]))
    }

    return matrices

}

/**
 * generate all the forward partial matrix products
 * [ O, O x A, O x A x B, O x A x B x C]
 * @param {*} matrices 
 * @returns 
 */
export function generateForwardMats(matrices) {
    let forwardMats = []
    forwardMats.push(matrices[0])

    for (let i = 1; i < matrices.length; i++){
        forwardMats.push(math.multiply(forwardMats[i - 1], matrices[i]))
    }

    return forwardMats
}

/**
 * generate all the backwards partial matrix products
 * [E, D x E, C x D x E] -> [C x D x E, D x E, E] + [ I ]
 * @param {*} matrices 
 * @returns 
 */
export function generateBackwardMats(matrices) {
    let backwardMats = []
    backwardMats.push(matrices[matrices.length - 1])

    for (let i = 1; i < matrices.length; i++){
        backwardMats.push(math.multiply(matrices[matrices.length - i - 1], backwardMats[i - 1]))
    }

    backwardMats = backwardMats.reverse()
    backwardMats.push(IDENTITY)

    return backwardMats
}

/**
 * Get a column of the jacobian
 * @param {*} matrixStart 
 * @param {*} matrixEnd 
 * @param {*} d 
 * @returns 
 */
export function getJacobianColumn(matrixStart, matrixEnd, d) {
    let delta = math.subtract(matrixEnd, matrixStart)   
    let row = math.multiply(getTwistFromMatrix(delta), 1.0 / d)
    return row
}

export function getTargetVector(desired, current) {

    let desiredTwist = math.matrix(getTwistFromMatrix(desired))
    let currentTwist = math.matrix(getTwistFromMatrix(current))
    let vec = math.subtract(desiredTwist, currentTwist)

    return vec
}

/**
 * Get a shitty twist coordinate from a matrix :P
 * @param {} matrix 
 * @returns 
 */
function getTwistFromMatrix(matrix) {

    let x = matrix.get([0, 3])
    let y = matrix.get([1, 3])
    let z = matrix.get([2, 3])

    // console.log(matrix)
    let angular = new Quaternion()
    angular.fromMatrix(matrix)
    let axAngle = angular.toAxisAngle()

    // console.log(axAngle)

    return [x,y,z].concat(axAngle)
}

class Quaternion {

    constructor() {
    }

    // NaN safe!!!
    fromMatrix(matrix) {

        const pad = 0.0001

        let m00 = matrix.get([0, 0]) + pad
        let m01 = matrix.get([0, 1])
        let m02 = matrix.get([0, 2])
        let m10 = matrix.get([1, 0])
        let m11 = matrix.get([1, 1])
        let m12 = matrix.get([1, 2])
        let m20 = matrix.get([2, 0])
        let m21 = matrix.get([2, 1])
        let m22 = matrix.get([2, 2])

        let tr = m00 + m11 + m22

        let S, qw, qx, qy, qz

        if (tr > 0) { 
            S = Math.sqrt(tr+1.0) * 2; // S=4*qw 
            qw = 0.25 * S;
            qx = (m21 - m12) / S;
            qy = (m02 - m20) / S; 
            qz = (m10 - m01) / S; 
        } else if ((m00 > m11)&(m00 > m22)) { 
            S = Math.sqrt(1.0 + m00 - m11 - m22) * 2; // S=4*qx 
            qw = (m21 - m12) / S;
            qx = 0.25 * S;
            qy = (m01 + m10) / S; 
            qz = (m02 + m20) / S; 
        } else if (m11 > m22) { 
            S = Math.sqrt(1.0 + m11 - m00 - m22) * 2; // S=4*qy
            qw = (m02 - m20) / S;
            qx = (m01 + m10) / S; 
            qy = 0.25 * S;
            qz = (m12 + m21) / S; 
        } else { 
            S = Math.sqrt(1.0 + m22 - m00 - m11) * 2; // S=4*qz
            qw = (m10 - m01) / S;
            qx = (m02 + m20) / S;
            qy = (m12 + m21) / S;
            qz = 0.25 * S;
        }

        this.qw = qw
        this.qx = qx
        this.qy = qy
        this.qz = qz
    }

    toAxisAngle() {

        if (this.qw > 1) {
            this.qw /= this.qw; // if w>1 acos and sqrt will produce errors, this cant happen if quaternion is normalised
        }

        let x, y, z
        let angle = 2 * Math.acos(this.qw);
        // console.log(angle)

        let s = Math.sqrt(1-this.qw*this.qw);
        if (s < 0.001) {
            x = this.qx;
            y = this.qy;
            z = this.qz;
        } else {
            x = this.qx / s;
            y = this.qy / s;
            z = this.qz / s;
        }

        return [x * angle, y * angle, z * angle]
    }
}