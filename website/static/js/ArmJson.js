// export const ArmJson = {
//     lengths: [1, 4, 4, 4, 4, 2, 2],
//     axes: ['z', 'y', 'y', 'y', 'y', 'x', 'z'],
//     minAngles: [0, 0, 0, 0, 0, 0, 0],
//     maxAngles: [Math.PI, Math.PI, Math.PI, Math.PI, Math.PI, Math.PI, Math.PI]
// }

export const ArmJson = {
    arm: [
        { 
            link : {
                length: 1
            },
            joint : {
                axis: 'z',
                minAngle: -180,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 4
            },
            joint : {
                axis: 'y',
                minAngle: 0,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 4
            },
            joint : {
                axis: 'y',
                minAngle: 0,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 4
            },
            joint : {
                axis: 'y',
                minAngle: 0,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 4
            },
            joint : {
                axis: 'y',
                minAngle: 0,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 2
            },
            joint : {
                axis: 'x',
                minAngle: 0,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 2
            },
            joint : {
                axis: 'z',
                minAngle: -180,
                maxAngle: 180
            }
        }
    ]
}