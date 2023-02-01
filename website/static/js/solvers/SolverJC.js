import { IDENTITY, generateForwardMats, generateMats, getJacobianColumn, getTargetVector, mat4, transformLoss } from "../util/Geometry.js"
import { Solver } from "./Solver.js"

/**
 * A solver using the Jacobian Transpose method
 */
export class IKSolverJC extends Solver {

    ROT_CORRECTION = Math.PI

    constructor(axes, radii, thetas, origin, minAngles, maxAngles, collisionProvider) {

        super(axes, radii, thetas, origin, minAngles, maxAngles, collisionProvider)

    }

    generateMats() {

        super.generateMats()
        this.loss = this._calculateLoss(this._endEffector)

    }

    updateThetas() {

        const d = 0.00001
        let targetVelocity = getTargetVector(this.target, this._endEffector)
        
        // TODO: get this analytically?
        let jacobian = []

        // Generate a column of the jacobian matrix
        for (let i = 0; i < this._thetas.length; i++) {
            const dTheta = this._thetas[i] + d
            const radius = this._radii[i]
            const axis = this._axes[i]
            const dMat = mat4(dTheta, axis, radius)

            const deltaEndEffector = math.multiply(math.multiply(this._forwardMats[i], dMat), this._backwardMats[i+2])

            jacobian.push(getJacobianColumn(this._endEffector, deltaEndEffector, d))

        }

        jacobian = math.matrix(jacobian)
        let out = math.multiply(jacobian, targetVelocity)
        out = math.multiply(out, 0.001)
        
        out._data.forEach((_, i) => {
            this._thetas[i] += out._data[i]
        });

    }

    updateParams() {
        super.updateParams()
    }

    update() {
        this.generateMats()
        this.updateThetas()
        this.updateParams()
    }

    solve(target, thresh) {

        const startTime = Date.now()

        this.resetParams()
        this.target = target

        console.log(`Running Gradient Algorithm...`)

        while (this._iterations < this.MAX_STEPS){
            if (this.loss > thresh){
                this.update()
            }else{
                console.log(`Optimal solution found after ${this._iterations} iterations!`)
                console.log(`Elapsed Time: ${Date.now() - startTime}ms`)
                return
            }
        }

        console.log(`Could not converge in ${this.MAX_STEPS} iterations`)

    }

    getJoints() {
        return super.getJoints()
    }

    // calculate loss
    _calculateLoss(actual) {

        return super._calculateLoss(actual)

    } 

    resetParams() {
        super.resetParams()
        this.initialize()
    }

    initialize() {
    }

}