import { rMat3D, tMat3D } from "./Geometry.js"

/**
 * Create a Matrix from a twist vector
 * @param {Array} vec 
 * @returns math matrix
 */
export function targetVecToMatrix(vec) {
    let [x,y,z,xRot,yRot,zRot] = [...vec]

    if (x < 0.5 && x >= 0) {
        x = 0.5
    } else if (x <= 0 && x > -0.5) {
        x = -0.5
    }



    return math.multiply(math.multiply(math.multiply(tMat3D(x,y,z),rMat3D(xRot, 'x')), rMat3D(yRot, 'y')), rMat3D(zRot, 'z'))
}

/**
 * Linearly interpolate two k-D vectors with n steps
 * @param {Array} vi intial vector
 * @param {Array} vf final vector
 * @param {number} steps number of steps
 * @returns {number[][]} Array of vectors
 */
export function interpolateVectors(vi, vf, steps) {

    let stepVec = []

    for (let i = 0; i < vi.length; i++) {
        stepVec.push((vf[i] - vi[i]) / steps)
    }

    let interpolated = []

    // for each step
    for (let i = 0; i < steps; i++) {
        let temp = []
        for (let j = 0; j < vi.length; j++) {
            temp.push(vi[j] + (stepVec[j] * i)) // add step size * step number to the initial vector values
        }
        interpolated.push(temp)
    }

    interpolated.push(vf)

    return interpolated
    
}