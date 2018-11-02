/**
 * Returns T/F whether every branch in the tree has a branch length
 *
 * @returns {Object} true if  every branch in the tree has a branch length
 */
export default function has_branch_lengths () {

  let bl = this.branch_length();

  if (bl) {
    return _.every(this.nodes.descendants(), function(node) {
      return !node.parent || !_.isUndefined(bl(node));
    });
  }

  return false;

}
