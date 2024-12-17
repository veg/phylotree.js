import { isLeafNode } from "../nodes";

export const css_classes = {
  "tree-container": "phylotree-container",
  "tree-scale-bar": "tree-scale-bar",
  node: "node",
  "internal-node": "internal-node",
  "tagged-node": "node-tagged",
  "selected-node": "node-selected",
  "collapsed-node": "node-collapsed",
  "root-node": "root-node",
  branch: "branch",
  "selected-branch": "branch-selected",
  "tagged-branch": "branch-tagged",
  "tree-selection-brush": "tree-selection-brush",
  "branch-tracer": "branch-tracer",
  clade: "clade",
  node_text: "phylotree-node-text"
};

export function initializeCssClasses(classes = {}) {
  Object.keys(classes).forEach(key => {
    css_classes[key] = classes[key]
  })
}

export function internalNames(attr) {
  if (!arguments.length) return this.options["internal-names"];
  this.options["internal-names"] = attr;
  return this;
}

export function radial(attr) {
  if (!arguments.length) return this.options["is-radial"];
  this.options["is-radial"] = attr;
  return this;
}

export function alignTips(attr) {
  if (!arguments.length) return this.options["align-tips"];
  this.options["align-tips"] = attr;
  return this;
}

/**
 * Return the bubble size of the current node.
 *
 * @param {Node} A node in the phylotree.
 * @returns {Float} The size of the bubble associated to this node.
 */
export function nodeBubbleSize(node) {

  // if a custom bubble styler, use that instead

  if(this.options["draw-size-bubbles"] && this.options["bubble-styler"]) {
    return this.options["bubble-styler"](node);
  } else {
    return this.options["draw-size-bubbles"]
      ? this.relative_nodeSpan(node) * this.scales[0] * 0.25
      : 0;
    }
}

export function shiftTip(d) {
  if (this.options["is-radial"]) {
    return [
      (d.text_align == "end" ? -1 : 1) *
        (this.radius_pad_for_bubbles - d.radius),
      0
    ];
  }
  if (this.options["right-to-left"]) {
    return [this.right_most_leaf - d.screen_x, 0];
  }
  return [this.right_most_leaf - d.screen_x, 0];
}

export function layoutHandler(attr) {
  if (!arguments.length) return this.layout_listener_handler;
  this.layout_listener_handler = attr;
  return this;
}

/**
 * Getter/setter for the selection label. Useful when allowing
 * users to make multiple selections.
 *
 * @param {String} attr (Optional) If setting, the new selection label.
 * @returns The current selection label if getting, or the current ``phylotree`` if setting.
 */
export function selectionLabel(attr) {
  if (!arguments.length) return this.selection_attribute_name;
  this.selection_attribute_name = attr;
  this.syncEdgeLabels();
  return this;
}

/**
 * Get or set the current node span. If setting, the argument should
 * be a function of a node which returns a number, so that node spans
 * can be determined dynamically. Alternatively, the argument can be the
 * string ``"equal"``, to give all nodes an equal span.
 *
 * @param {Function} attr Optional; if setting, the nodeSpan function.
 * @returns The ``nodeSpan`` if getting, or the current ``phylotree`` if setting.
 */
export function nodeSpan(attr) {
  if (!arguments.length) return nodeSpan;
  if (typeof attr == "string" && attr == "equal") {
    nodeSpan = function(d) { // eslint-disable-line
      return 1;
    };
  } else {
    nodeSpan = attr; // eslint-disable-line
  }
  return this;
}

// List of all selecters that can be used with the restricted-selectable option
export var predefined_selecters = {
  all: d => {
    return true;
  },
  none: d => {
    return false;
  },
  "all-leaf-nodes": d => {
    return isLeafNode(d.target);
  },
  "all-internal-nodes": d => {
    return !isLeafNode(d.target);
  }
};

/**
 * Getter/setter for the selection callback. This function is called
 * every time the current selection is modified, and its argument is
 * an array of nodes that make up the current selection.
 *
 * @param {Function} callback (Optional) The selection callback function.
 * @returns The current ``_selectionCallback`` if getting, or the current ``this`` if setting.
 */
export function selectionCallback(callback) {
  if (!callback) return this._selectionCallback;
  this._selectionCallback = callback;
  return this;
}
