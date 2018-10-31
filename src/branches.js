/**
 * Returns T/F whether every branch in the tree has a branch length
 *
 * @returns {Object} true if  every branch in the tree has a branch length
 */
export function has_branch_lengths () {
  var bl = phylotree.branch_length();
  if (bl) {
    return _.every(this.get_nodes(), function(node) {
      return !node.parent || !_.isUndefined(bl(node));
    });
  }
  return false;
};
