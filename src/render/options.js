import { is_leafnode } from "../nodes";

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

export function internal_names(attr) {
  if (!arguments.length) return this.options["internal-names"];
  this.options["internal-names"] = attr;
  return this;
}

export function radial(attr) {
  if (!arguments.length) return this.options["is-radial"];
  this.options["is-radial"] = attr;
  return this;
}

export function align_tips(attr) {
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
export function node_bubble_size(node) {

  return this.options["draw-size-bubbles"]
    ? this.relative_node_span(node) * this.scales[0] * 0.25
    : 0;
}

export function shift_tip(d) {
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

export function layout_handler(attr) {
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
export function selection_label(attr) {
  if (!arguments.length) return this.selection_attribute_name;
  this.selection_attribute_name = attr;
  this.sync_edge_labels();
  return this;
}

/**
 * Get or set the current node span. If setting, the argument should
 * be a function of a node which returns a number, so that node spans
 * can be determined dynamically. Alternatively, the argument can be the
 * string ``"equal"``, to give all nodes an equal span.
 *
 * @param {Function} attr Optional; if setting, the node_span function.
 * @returns The ``node_span`` if getting, or the current ``phylotree`` if setting.
 */
export function node_span(attr) {
  if (!arguments.length) return node_span;
  if (typeof attr == "string" && attr == "equal") {
    node_span = function(d) {
      return 1;
    };
  } else {
    node_span = attr;
  }
  return phylotree;
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
    return is_leafnode(d.target);
  },
  "all-internal-nodes": d => {
    return !is_leafnode(d.target);
  }
};

/**
 * Getter/setter for the selection callback. This function is called
 * every time the current selection is modified, and its argument is
 * an array of nodes that make up the current selection.
 *
 * @param {Function} callback (Optional) The selection callback function.
 * @returns The current ``selection_callback`` if getting, or the current ``this`` if setting.
 */
export function selection_callback(callback) {
  if (!callback) return this.selection_callback;
  this.selection_callback = callback;
  return this;
}
