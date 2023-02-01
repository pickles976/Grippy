import { reDrawTarget, getTargetVector } from "./three.js";
import { interpolateVectors, targetVecToMatrix } from "./util/Interpolation.js";

var outlineContainer = document.getElementById('outline-container');

let STEP = 50
let index = 0
let keyframes = {}
let sorted = {}
let interpolated = {}

// Generate and initialize the model
function generateModel() {
  let rows = [
    {
      title: "Arm Control",
      selected: false,
      style: {
        height: 35
      },
      keyframes: [
      ],
    }
  ];
  return rows;
}

const rows = generateModel();
var timeline = new timelineModule.Timeline({ id: 'timeline', headerHeight: 45 });
timeline.setModel({ rows: rows });

// Select all elements on key down
document.addEventListener('keydown', function (args) {
  if (args.which === 65 && timeline._controlKeyPressed(args)) {
    timeline.selectAllKeyframes();
    args.preventDefault();
  }
});

var logMessage = function (message, logPanel = 1) {
//   if (message) {
//     let el = document.getElementById('output' + logPanel);
//     el.innerHTML = message + '<br/>' + el.innerHTML;
//   }
};

var logDraggingMessage = function (object, eventName) {
//   if (object.elements) {
//     logMessage('Keyframe value: ' + object.elements[0].val + '. Selected (' + object.elements.length + ').' + eventName);
//   }
};

timeline.onTimeChanged(function (event) {
    let time = event.val
    let vector = interpolated[time]
    // TODO: LOAD INTERPOLATED VALUES
    if (vector != undefined) {
        reDrawTarget(vector)
    }
    showActivePositionInformation();
});
function showActivePositionInformation() {
//   if (timeline) {
//     const fromPx = timeline.scrollLeft;
//     const toPx = timeline.scrollLeft + timeline.getClientWidth();
//     const fromMs = timeline.pxToVal(fromPx - timeline._leftMargin());
//     const toMs = timeline.pxToVal(toPx - timeline._leftMargin());
//     let positionInPixels = timeline.valToPx(timeline.getTime()) + timeline._leftMargin();
//     let message = 'Timeline in ms: ' + timeline.getTime() + 'ms. Displayed from:' + fromMs.toFixed() + 'ms to: ' + toMs.toFixed() + 'ms.';
//     message += '<br>';
//     message += 'Timeline in px: ' + positionInPixels + 'px. Displayed from: ' + fromPx + 'px to: ' + toPx + 'px';
//     document.getElementById('currentTime').innerHTML = message;
//   }
}

// timeline.onSelected(function (obj) {
//   logMessage('Selected Event: (' + obj.selected.length + '). changed selection :' + obj.changed.length, 2);
// });
// timeline.onDragStarted(function (obj) {
//   logDraggingMessage(obj, 'dragstarted');
// });
// timeline.onDrag(function (obj) {
//   logDraggingMessage(obj, 'drag');
// });
// timeline.onKeyframeChanged(function (obj) {
//   console.log('keyframe: ' + obj.val);
// });
timeline.onDragFinished(function (obj) {
  syncStorage()
});
// timeline.onMouseDown(function (obj) {
//   var type = obj.target ? obj.target.type : '';
//   logMessage('mousedown:' + obj.val + '.  target:' + type + '. ' + Math.floor(obj.pos.x) + 'x' + Math.floor(obj.pos.y), 2);
// });
// timeline.onDoubleClick(function (obj) {
//   var type = obj.target ? obj.target.type : '';
//   logMessage('doubleclick:' + obj.val + '.  target:' + type + '. ' + Math.floor(obj.pos.x) + 'x' + Math.floor(obj.pos.y), 2);
// });

timeline.onScroll(function (obj) {
  var options = timeline.getOptions();
  if (options) {
    // Synchronize component scroll renderer with HTML list of the nodes.
    if (outlineContainer) {
      outlineContainer.style.minHeight = obj.scrollHeight + 'px';
      document.getElementById('outline-scroll-container').scrollTop = obj.scrollTop;
    }
  }
  showActivePositionInformation();
});
timeline.onScrollFinished(function (obj) {
  // Stop move component screen to the timeline when user start manually scrolling.
  logMessage('on scroll finished', 2);
});
generateHTMLOutlineListNodes(rows);

/**
 * Generate html for the left menu for each row.
 * */
function generateHTMLOutlineListNodes(rows) {
  var options = timeline.getOptions();
  var headerElement = document.getElementById('outline-header');
  headerElement.style.maxHeight = headerElement.style.minHeight = options.headerHeight + 'px';
  // headerElement.style.backgroundColor = options.headerFillColor;
  outlineContainer.innerHTML = '';
  rows.forEach(function (row, index) {
    var div = document.createElement('div');
    div.classList.add('outline-node');
    const h = (row.style ? row.style.height : 0) || options.rowsStyle.height;
    div.style.maxHeight = div.style.minHeight = h + 'px';
    div.style.marginBottom = options.rowsStyle.marginBottom + 'px';
    div.innerText = row.title || 'Track ' + index;
    outlineContainer.appendChild(div);
  });
}

function removeKeyframe() {
  if (timeline) {
    // Add keyframe
    const currentModel = timeline.getModel();
    if (currentModel && currentModel.rows) {
      currentModel.rows.forEach((row) => {
        if (row.keyframes) {
          row.keyframes = row.keyframes.filter((p) => !p.selected);
        }
      });
    }

    timeline.setModel(currentModel);
    syncStorage()
  }
}
export function addKeyframe() {
  if (timeline) {
    // Add keyframe
    const currentModel = timeline.getModel();

    // let keyframe = { val: timeline.getTime(), id: index++, data: Math.random() * 1000 }
    let keyframe = { val: timeline.getTime(), id: index++, data: getTargetVector()}
    currentModel.rows[0].keyframes.push(keyframe);
    timeline.setModel(currentModel);
    syncStorage()
  }
}

let playing = false;
let playStep = STEP;
// Automatic tracking should be turned off when user interaction happened.
let trackTimelineMovement = false;
function onPlayClick(event) {
  playing = true;
  trackTimelineMovement = true;
  if (timeline) {
    moveTimelineIntoTheBounds();
    // Don't allow to manipulate timeline during playing (optional).
    timeline.setOptions({ timelineDraggable: false });
  }
}
function onPauseClick(event) {
  playing = false;
  if (timeline) {
    timeline.setOptions({ timelineDraggable: true });
  }
}

function moveTimelineIntoTheBounds() {
  if (timeline) {
    if (timeline._startPos || timeline._scrollAreaClickOrDragStarted) {
      // User is manipulating items, don't move screen in this case.
      return;
    }
    const fromPx = timeline.scrollLeft;
    const toPx = timeline.scrollLeft + timeline.getClientWidth();

    let positionInPixels = timeline.valToPx(timeline.getTime()) + timeline._leftMargin();
    // Scroll to timeline position if timeline is out of the bounds:
    if (positionInPixels <= fromPx || positionInPixels >= toPx) {
      this.timeline.scrollLeft = positionInPixels;
    }
  }
}
function initPlayer() {
  setInterval(() => {
    if (playing) {
      if (timeline) {
        timeline.setTime(timeline.getTime() + playStep);
        moveTimelineIntoTheBounds();
      }
    }
  }, playStep);
}

// interpolation functions
function syncStorage() {
    keyframes = timeline.getModel().rows[0].keyframes
    sorted = sortKeyframes(keyframes)
    interpolated = interpolate(sorted)
}

function sortKeyframes() {
    let array = keyframes.map((keyframe) => keyframe)
    array = array.sort((a, b) => a.val - b.val)
    return array
}

function interpolate(array) { 

    let stepSize = STEP
    let interpolated = {}

    for (let i = 0; i < array.length - 1; i++) {

        let ki = array[i] // get final and initial keyframes for a tween
        let kf = array[i + 1]

        let numSteps = kf.val - ki.val // duration between keyframes
        numSteps /= stepSize // convert to the number of steps

        let tween = interpolateVectors(ki.data, kf.data, numSteps) // get the tween between two keyframes

        // load tweened values into interpolated object
        for (let j = 0; j < numSteps; j++) {
            interpolated[ki.val + (j * stepSize)] = tween[j]
        }

        interpolated[kf.val] = kf.data

    }

    return interpolated

}

// Note: this can be any other player: audio, video, svg and etc.
// In this case you have to synchronize events of the component and player.
initPlayer();
showActivePositionInformation();
window.onresize = showActivePositionInformation;

document.getElementById("onPlayClick").addEventListener('click', onPlayClick)
document.getElementById("onPauseClick").addEventListener('click', onPauseClick)
document.getElementById("addKeyFrame").addEventListener('click', addKeyframe)
document.getElementById("removeKeyFrame").addEventListener('click', removeKeyframe)