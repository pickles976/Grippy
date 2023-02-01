import { rMat3D, tMat3D } from "./Geometry.js"

/**
 * Create a Matrix from a twist vector
 * @param {} vec 
 * @returns 
 */
export function targetVecToMatrix(vec) {
    let [x,y,z,xRot,yRot,zRot] = [...vec]
    return math.multiply(math.multiply(math.multiply(tMat3D(x,y,z),rMat3D(xRot, 'x')), rMat3D(yRot, 'y')), rMat3D(zRot, 'z'))
}

/**
 * Linearly interpolate two k-D vectors with n steps
 * @param {*} vi 
 * @param {*} vf 
 * @param {*} steps 
 * @returns 
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