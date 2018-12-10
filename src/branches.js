import * as _ from "underscore";

/**
 * Returns T/F whether every branch in the tree has a branch length
 *
 * @returns {Object} true if  every branch in the tree has a branch length
 */
export default function has_branch_lengths() {
  let bl = this.branch_length();

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
