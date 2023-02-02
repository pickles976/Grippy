import { transformLoss } from "../util/Geometry.js";
import { Solver } from "./Solver.js";
import { InverseKinematics } from "../../pkg/krust.js";

export class WasmSolver extends Solver {

    constructor(axes, radii, thetas, origin, minAngles, maxAngles, collisionProvider) {

        super(axes, radii, thetas, origin, minAngles, maxAngles)
        super.generateMats()

        // Create struct for serialization
        let fields = {
            origin: matrixToWasm(this._origin), 
            thetas : this._thetas, 
            axes : axesToWasm(this._axes), 
            radii : this._radii, 

            min_angles: this._minAngles,
            max_angles: this._maxAngles,
            ...collisionProvider.dump()
        }

        console.log(fields)

        this.wasm_solver = InverseKinematics.new(JSON.stringify(fields))
        console.log("Created solver")
    
    }

    solve(target, thresh) {
        this.target = target
        this._thetas = JSON.parse(this.wasm_solver.solve(JSON.stringify(matrixToWasm(target)),  thresh))
        super.generateMats()
        this.loss = super._calculateLoss(this._endEffector)
    }

    solve_with_conditions(target, thresh, thetas, steps) {
        this.target = target
        this._thetas = JSON.parse(this.wasm_solver.solve_with_conditions(JSON.stringify(matrixToWasm(target)),  thresh, thetas, steps))
        super.generateMats()
        this.loss = super._calculateLoss(this._endEffector)
    }

    getJoints() {
        return super.getJoints()
    }

}

// TODO: move this to a WASM util class!
function axesToWasm(axes) {

    let new_axes = []

    axes.forEach(ax => {
        switch(ax) {
            case "x" :
                new_axes.push([1,0,0])
                break;
            case "y" :
                new_axes.push([0,1,0])
                break;
            case "z" :
                new_axes.push([0,0,1])
                break;
            default:
                new_axes.push([1,0,0])
                break;
        }
    });

    return new_axes
}

/**
 * Converts a math.matrix object to a WASM-readable array
 * @param {} in_matrix 
 * @returns 
 */
function matrixToWasm(in_matrix) {
    let dim = in_matrix.size()

    let arr = []

    for (let i = 0; i < dim[0]; i++) {
        for (let j = 0; j < dim[1]; j++) {
            arr.push(in_matrix.get([j, i]))
        }
    }

    return arr
}