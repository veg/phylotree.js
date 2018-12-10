import * as _ from "underscore";
import * as inspector from "./inspectors";

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

export function show_internal_name(node) {
  const i_names = this.internal_names();

  if (i_names) {
    if (typeof i_names === "function") {
      return i_names(node);
    }
    return i_names;
  }

  return false;
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
    ? this.relative_node_span(node) * this.scales[0] * 0.5
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
 * Get or set the current node span. If setting, the argument should
 * be a function of a node which returns a number, so that node spans
 * can be determined dynamically. Alternatively, the argument can be the
 * string ``"equal"``, to give all nodes an equal span.
 *
 * @param {Function} attr Optional; if setting, the node_span function.
 * @returns The ``node_span`` if getting, or the current ``phylotree`` if setting.
 */
export function node_span(attr) {
  if (!arguments.length) return this.node_span;
  if (typeof attr == "string" && attr == "equal") {
    this.node_span = function(d) {
      return 1;
    };
  } else {
    this.node_span = attr;
  }
  return this;
}

export function set_partitions(partitions) {
  this.partitions = partitions;
}

export function get_partitions(attributes) {
  return this.partitions;
}

/**
 * Return tags that were read when parsing the original Newick string.
 *
 * @returns An array of strings, comprising each tag that was read.
 */
export function get_parsed_tags() {
  return this.parsed_tags;
}

/**
 * Get the tips of the tree
 * @returns {Array} Nodes in the current ``phylotree``.
 */
export function get_tips() {
  // get all nodes that have no nodes
  return _.filter(self.nodes, n => {
    return !_.has(n, "children");
  });
}

/**
 * Get the root node.
 *
 * @returns the current root node of the ``phylotree``.
 */
export function get_root_node() {
  // TODO
  return self.nodes[0];
}

/**
 * Get an array of all nodes.
 * @returns {Array} Nodes in the current ``phylotree``.
 */
export function get_nodes() {
  return this.nodes;
}

/**
 * Get a node by name.
 *
 * @param {String} name Name of the desired node.
 * @returns {Node} Desired node.
 */
export function get_node_by_name(name) {
  // TODO
  return _.findWhere(this.nodes, { name: name });
}

/**
 * Add attributes to nodes. New attributes will be placed in the
 * ``annotations`` key of any nodes that are matched.
 *
 * @param {Object} attributes An object whose keys are the names of nodes
 * to modify, and whose values are the new attributes to add.
 */
export function assign_attributes(attributes) {
  //return nodes;
  // add annotations to each matching node
  _.each(this.nodes, function(d) {
    if (_.indexOf(_.keys(attributes), d.name) >= 0) {
      d["annotations"] = attributes[d.name];
    }
  });
}

export function reclass_node(node) {
  let class_var =
    css_classes[inspector.is_leafnode(node) ? "node" : "internal-node"];

  if (inspector.item_tagged(node)) {
    class_var += " " + css_classes["tagged-node"];
  }

  if (inspector.item_selected(node, this.selection_attribute_name)) {
    class_var += " " + css_classes["selected-node"];
  }

  if (!node["parent"]) {
    class_var += " " + css_classes["root-node"];
  }

  if (inspector.is_node_collapsed(node) || inspector.has_hidden_nodes(node)) {
    class_var += " " + css_classes["collapsed-node"];
  }

  return class_var;
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

export function sync_edge_labels() {
  this.links.forEach(function(d) {
    d[this.selection_attribute_name] =
      d.target[this.selection_attribute_name] || false;
    d.tag = d.target.tag || false;
  });

  if (this.count_handler()) {
    let counts = {};

    counts[this.selection_attribute_name] = this.links.reduce(function(p, c) {
      return p + (c[this.selection_attribute_name] ? 1 : 0);
    }, 0);

    counts["tagged"] = this.links.reduce(function(p, c) {
      return p + (inspector.item_tagged(c) ? 1 : 0);
    }, 0);

    //d3_phylotree_trigger_count_update(
    //  this,
    //  counts,
    //  this.count_handler()
    //);
  }
}
