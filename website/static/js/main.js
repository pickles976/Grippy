var outlineContainer = document.getElementById('outline-container');

let index = 0

function generateModel() {
  let rows = [
    {
      title: "Arm Control",
      selected: false,
      style: {
        height: 35
      },
      keyframes: [
        {
          style:{
            cursor: 'default',
          },
          val: 2000,
        },
        {
          val: 2500,
        },
        {
          val: 2600,
        },
      ],
    }
  ];
  return rows;
}
const rows = generateModel();
var timeline = new timelineModule.Timeline();
timeline.initialize({ id: 'timeline', headerHeight: 45 });
timeline.setModel({ rows: rows });

// Select all elements on key down
document.addEventListener('keydown', function (args) {
  if (args.which === 65 && timeline._controlKeyPressed(args)) {
    timeline.selectAllKeyframes();
    args.preventDefault();
  }
});
var logMessage = function (message, logPanel = 1) {
  if (message) {
    let el = document.getElementById('output' + logPanel);
    el.innerHTML = message + '<br/>' + el.innerHTML;
  }
};

var logDraggingMessage = function (object, eventName) {
  if (object.elements) {
    logMessage('Keyframe value: ' + object.elements[0].val + '. Selected (' + object.elements.length + ').' + eventName);
  }
};

timeline.onTimeChanged(function (event) {
  showActivePositionInformation();
});
function showActivePositionInformation() {
  if (timeline) {
    const fromPx = timeline.scrollLeft;
    const toPx = timeline.scrollLeft + timeline.getClientWidth();
    const fromMs = timeline.pxToVal(fromPx - timeline._leftMargin());
    const toMs = timeline.pxToVal(toPx - timeline._leftMargin());
    let positionInPixels = timeline.valToPx(timeline.getTime()) + timeline._leftMargin();
    let message = 'Timeline in ms: ' + timeline.getTime() + 'ms. Displayed from:' + fromMs.toFixed() + 'ms to: ' + toMs.toFixed() + 'ms.';
    message += '<br>';
    message += 'Timeline in px: ' + positionInPixels + 'px. Displayed from: ' + fromPx + 'px to: ' + toPx + 'px';
    document.getElementById('currentTime').innerHTML = message;
  }
}
timeline.onSelected(function (obj) {
  logMessage('Selected Event: (' + obj.selected.length + '). changed selection :' + obj.changed.length, 2);
});
timeline.onDragStarted(function (obj) {
  logDraggingMessage(obj, 'dragstarted');
});
timeline.onDrag(function (obj) {
  logDraggingMessage(obj, 'drag');
});
timeline.onKeyframeChanged(function (obj) {
  console.log('keyframe: ' + obj.val);
});
timeline.onDragFinished(function (obj) {
  logDraggingMessage(obj, 'dragfinished');
});
timeline.onMouseDown(function (obj) {
  var type = obj.target ? obj.target.type : '';
  logMessage('mousedown:' + obj.val + '.  target:' + type + '. ' + Math.floor(obj.pos.x) + 'x' + Math.floor(obj.pos.y), 2);
});
timeline.onDoubleClick(function (obj) {
  var type = obj.target ? obj.target.type : '';
  logMessage('doubleclick:' + obj.val + '.  target:' + type + '. ' + Math.floor(obj.pos.x) + 'x' + Math.floor(obj.pos.y), 2);
});

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

/*Handle events from html page*/
function selectMode() {
  if (timeline) {
    timeline.setInteractionMode('selector');
  }
}
function zoomMode() {
  if (timeline) {
    timeline.setInteractionMode('zoom');
  }
}
function noneMode() {
  if (timeline) {
    timeline.setInteractionMode('none');
  }
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
  }
}
function addKeyframe() {
  if (timeline) {
    // Add keyframe
    const currentModel = timeline.getModel();

    let keyframe = { val: timeline.getTime(), id: index++, data: 210 }
    console.log(currentModel)
    currentModel.rows[0].keyframes.push(keyframe);
    timeline.setModel(currentModel);

    // Generate outline list menu
    // generateHTMLOutlineListNodes(currentModel.rows);
  }
}
function panMode(interactive) {
  if (timeline) {
    timeline.setInteractionMode(interactive ? 'pan' : 'nonInteractivePan');
  }
}
// Set scroll back to timeline when mouse scroll over the outline
function outlineMouseWheel(event) {
  if (timeline) {
    this.timeline._handleWheelEvent(event);
  }
}
playing = false;
playStep = 50;
// Automatic tracking should be turned off when user interaction happened.
trackTimelineMovement = false;
function onPlayClick(event) {
  playing = true;
  trackTimelineMovement = true;
  if (timeline) {
    this.moveTimelineIntoTheBounds();
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
// Note: this can be any other player: audio, video, svg and etc.
// In this case you have to synchronize events of the component and player.
initPlayer();
showActivePositionInformation();
window.onresize = showActivePositionInformation;