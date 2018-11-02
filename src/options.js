// replacement for d3.functor
function constant(x) {
  return function() {
    return x;
  };
}

var options = {
  layout: "left-to-right",
  logger: console,
  branches: "step",
  scaling: true,
  bootstrap: false,
  "color-fill": true,
  "internal-names": false,
  selectable: true,
  // restricted-selectable can take an array of predetermined
  // selecters that are defined in phylotree.predefined_selecters
  // only the defined functions will be allowed when selecting
  // branches
  "restricted-selectable": false,
  collapsible: true,
  "left-right-spacing": "fixed-step", //'fit-to-size',
  "top-bottom-spacing": "fixed-step",
  "left-offset": 0,
  "show-scale": "top",
  // currently not implemented to support any other positioning
  "draw-size-bubbles": false,
  "binary-selectable": false,
  "is-radial": false,
  "attribute-list": [],
  "max-radius": 768,
  "annular-limit": 0.38196601125010515,
  compression: 0.2,
  "align-tips": false,
  "maximum-per-node-spacing": 100,
  "minimum-per-node-spacing": 2,
  "maximum-per-level-spacing": 100,
  "minimum-per-level-spacing": 10,
  node_circle_size: constant(3),
  transitions: null,
  brush: true,
  reroot: true,
  hide: true,
  "label-nodes-with-name": false,
  zoom: false,
  "show-menu": true,
  "show-labels": true
}

export function def_branch_length_accessor(_node) {
  let _node_data = _node.data;

  if (
    "attribute" in _node_data &&
    _node_data["attribute"] &&
    _node_data["attribute"].length
  ) {
    let bl = parseFloat(_node_data["attribute"]);
    if (!isNaN(bl)) {
      return Math.max(0, bl);
    }
  }
  return undefined;
}

export default options;
