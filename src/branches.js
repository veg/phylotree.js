import * as _ from "underscore";

// These methods are part of the Phylotree object

export function set_partitions(partitions) {
  this.partitions = partitions;
}

export function get_partitions(attributes) {
  return this.partitions;
}

/**
 * Returns T/F whether every branch in the tree has a branch length
 *
 * @returns {Object} true if  every branch in the tree has a branch length
 */
export default function has_branch_lengths() {
  let bl = this.branch_length;

  if (bl) {
    return _.every(this.nodes.descendants(), function(node) {
      return !node.parent || !_.isUndefined(bl(node));
    });
  }

  return false;
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

/**
 * Get or set branch length accessor.
 *
 * @param {Function} attr Empty if getting, or new branch length accessor if setting.
 * @returns {Object} The branch length accessor if getting, or the current this if setting.
 */
export function set_branch_length(attr) {
  if (!arguments.length) return this.branch_length_accessor;
  this.branch_length_accessor = attr ? attr : def_branch_length_accessor;
  return this;
}

/**
 * Get or set branch name accessor.
 *
 * @param {Function} attr (Optional) If setting, a function that accesses a branch name
 * from a node.
 * @returns The ``node_label`` accessor if getting, or the current ``this`` if setting.
 */
export function branch_name(attr) {
  if (!arguments.length) return this.node_label;
  this.node_label = attr ? attr : def_node_label;
  return this;
}
