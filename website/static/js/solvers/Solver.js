import { IDENTITY, generateBackwardMats, generateForwardMats, generateMats, mat4, transformLoss } from "../util/Geometry.js"

export class Solver {

    ROT_CORRECTION = Math.PI
    MAX_STEPS = 100

    constructor(axes, radii, thetas, origin, minAngles, maxAngles, collisionProvider) {
        
        // physical traits
        this._axes = axes
        this._radii = radii
        this._thetas = thetas
        this._origin = origin

        // constraints
        this._minAngles = minAngles
        this._maxAngles = maxAngles
        this._armLength = this._radii.reduce((acc, curr) => acc + curr, 0)
        this._collisionProvider = collisionProvider

        // _matrices
        this._matrices = []
        this._forwardMats = []
        this._backwardMats = []

        // output
        this._endEffector = null
        this.target = null

        // optimization vars
        this.loss = 100.0
        this._iterations = 0

        // constraints
        this._angleConstraints = true
        this._collisionConstraints = false

    }

    /**
     * Generate the forward and backwards matrices that will 
     * control the arm positions for a given set of thetas, radii, and axes
     */
    generateMats() {

        this._matrices = generateMats(this._origin, this._thetas, this._axes, this._radii)
        this._forwardMats = generateForwardMats(this._matrices)
        this._backwardMats = generateBackwardMats(this._matrices)

        // this is really the forward pass error calculation
        this._endEffector = this._forwardMats[this._forwardMats.length - 1]

    }

    /**
     * Update the thetas of each joint angle by some optimization method
     * This is implemented by the subclasses
     */
    updateThetas(){}

    /**
     * Update params like learning rate, population size, etc
     */
    updateParams() { this._iterations += 1 }

    /**
     * A full optimization loop
     */
    update() {
        this.generateMats()
        this.updateThetas()
        this.updateParams()
    }

    /**
     * Solve a target configuration in one go
     * @param {matrix} target Target to solve for
     * @param {number} thresh Error Threshold
     */
    solve(target, thresh) {
        
        this.target = target
        this.resetParams()

        while (this.loss > thresh){
            if(this._iterations < this.MAX_STEPS){
                this.update()
            }else{
                console.log(`Failed to solve in ${this._iterations} iterations!`)
                return
            }
        }
        console.log(`Found solution in ${this._iterations} iterations!`)
    }

    /**
     * Returns the forward matrices, AKA the transforms of every link
     * @returns {Array[matrix]} 
     */
    getJoints() {
        return this._forwardMats.filter((mat, i) => i > 0)
    }

    /**
     * Calculate the loss of a given configuration compared to the target configuration
     * @param {matrix} actual 
     * @returns {number} loss/error value
     */
    _calculateLoss(actual) {
        return transformLoss(actual, this.target, this._armLength, this.ROT_CORRECTION)
    }

    /**
     * Reset the optimization parameters for a fresh run.
     */
    resetParams() {
        this._iterations = 0
        this.loss = 100.0
    }

}