import { IDENTITY, mat4, transformLoss } from "./Geometry.js"

export class IKSolver3D {

    PENALTY = 1.25
    ROT_CORRECTION = Math.PI
    MAX_DLOSS = 0.25

    constructor(axes, radii, thetas, origin) {

        // physical traits
        this.axes = axes
        this.radii = radii
        this.thetas = thetas
        this.origin = origin
        this.armLength = radii.reduce((acc, curr) => acc + curr, 0)

        // matrices
        this.matrices = []
        this.forwardMats = []
        this.backwardMats = []

        // output
        this.endEffector = null
        this.target = null

        // SGD vars
        this.loss = 100.0
        this.iterations = 0

        this.learnRate = 0.5
        this.currentLearnRate = this.learnRate
        this.decay = 0.000005

        this.momentums = []
        this.momentumRetain = 0.25

    }

    initializeMomentums() {
        this.momentums = []

        this.thetas.forEach(theta => {
            this.momentums.push(0.0)
        })
    }

    generateMats() {

        this.matrices = []
        this.matrices.push(this.origin)

        for (let i = 0; i < this.axes.length; i++){
            this.matrices.push(mat4(this.thetas[i], this.axes[i], this.radii[i]))
        }

        this.forwardMats = []
        this.forwardMats.push(this.origin)

        // generate all the forward partial matrix products
        // [ O, O x A, O x A x B, O x A x B x C]
        for (let i = 1; i < this.matrices.length; i++){
            this.forwardMats.push(math.multiply(this.forwardMats[i - 1], this.matrices[i]))
        }

        this.backwardMats = []
        this.backwardMats.push(this.matrices[this.matrices.length - 1])

        // generate all the backwards partial matrix products
        // [E, D x E, C x D x E] -> [C x D x E, D x E, E] + [ I ]
        for (let i = 1; i < this.matrices.length; i++){
            this.backwardMats.push(math.multiply(this.matrices[this.matrices.length - i - 1], this.backwardMats[i - 1]))
        }

        this.backwardMats = this.backwardMats.reverse()
        this.backwardMats.push(IDENTITY)

        // this is really the forward pass error calculation
        this.endEffector = this.forwardMats[this.forwardMats.length - 1]
        this.loss = this.calculateLoss(this.endEffector)

    }

    updateThetas() {

        const d = 0.00001

        for (let i = 0; i < this.thetas.length; i++) {
            const dTheta = this.thetas[i] + d
            const radius = this.radii[i]
            const dMat = mat4(dTheta, this.axes[i], radius)
            const deltaEndEffector = math.multiply(math.multiply(this.forwardMats[i], dMat), this.backwardMats[i+2])

            let dLoss = (this.calculateLoss(deltaEndEffector, i, dTheta, dMat) - this.loss) / d
            // console.log(`dLoss/dθ: ${dLoss}`)

            // Clamp dLoss
            dLoss = Math.max(-this.MAX_DLOSS, Math.min(this.MAX_DLOSS, dLoss))

            this.thetas[i] -= (this.momentums[i] * this.momentumRetain) + (dLoss * this.learnRate)
            this.momentums[i] = dLoss

        }

    }

    // calculate loss
    calculateLoss(actual, i, dTheta, dMat) {

        let totalLoss = 0

        totalLoss += transformLoss(actual, this.target, this.armLength, this.ROT_CORRECTION)

        return totalLoss

    } 

    updateParams() {
        this.iterations += 1
        this.currentLearnRate = this.learnRate * (1/ (1+this.decay*this.iterations))
    }

    resetParams() {
        this.iterations = 0
        this.currentLearnRate = this.learnRate
        this.initializeMomentums()
    }

    update() {
        this.generateMats()
        this.updateThetas()
        this.updateParams()
        // console.log(`Loss: ${this.loss}`)
    }

    getJoints() {
        return this.forwardMats.filter((mat, i) => i > 0)
    }


}