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
                length: 1,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'z',
                minAngle: -360,
                maxAngle: 360
            }
        },
        { 
            link : {
                length: 4,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'y',
                minAngle: -180,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 4,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'y',
                minAngle: -180,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 4,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'z',
                minAngle: -360,
                maxAngle: 360
            }
        },
        { 
            link : {
                length: 2,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'y',
                minAngle: -180,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 4,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'y',
                minAngle: -180,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 4,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'z',
                minAngle: -180,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 1,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'y',
                minAngle: -180,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 2,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'y',
                minAngle: -180,
                maxAngle: 180
            }
        },
        { 
            link : {
                length: 2,
                width: 1.2,
                height: 1.2
            },
            joint : {
                axis: 'z',
                minAngle: -180,
                maxAngle: 180
            }
        }
    ]
}