import * as _ from "underscore";

/*
 *  given a tree, this function will compute quantities required to work with 
 *  all v all pairwise distances (like in COT) 
 *
 *  @param   tree the tree object
 *  @returns leaf count
 *
 */
function compute_pairwise_distances(tree) {
  /*
   *    traverse the tree and populate the following values in each node
   *        
   *        .cot_computed_length -> for each node (except the root), the current branch length 
   *                                (so as to not compute them each time via a callback) 
   *        .cot_leaf_index      -> post_order traversal order of a leaf (0 to number of leaves - 1)
   *        
   *        for each node
   *        
   *        .cot_path_to_leaves_below   
   *                             -> a dictionary that maps a leaf index to the total path length from this node
   *                                to each of the descendant leaves, EXCLUDING the length of this branch
   *
   *        .cot_path_to_leaves_above   
   *                             -> a dictionary that maps a leaf index to the total path length from this node
   *                                to each of the leaves outside the split defined by this node, EXCLUDING
   *                                the length of this branch
   */

  var bl = tree.branch_length_accessor;

  if (!bl) {
    throw "A non-null branch lengths accessor function is required for this operation";
  }

  var leaf_count = 0;

  tree.traverse_and_compute(function(n) {
    n.cot_computed_length = bl(n);

 
    if (n.parent && _.isUndefined(n.cot_computed_length)) {
      throw "Non-null branch lengths are required for this operation: missing branch length at node " + n.data.name;
    }

    if (tree.isLeafNode(n)) {
      n.cot_leaf_index = leaf_count++;
      n.cot_path_to_leaves_below = {};
      n.cot_path_to_leaves_below[n.cot_leaf_index] = 0;
      n.cot_path_to_leaves_above = {};
    } else {
      n.cot_path_to_leaves_below = {};
      n.cot_path_to_leaves_above = {};
    }
  });

  // populate all cot_path_to_leaves_below
  tree.traverse_and_compute(function(n) {
    if (n.parent) {
      _.each(n.cot_path_to_leaves_below, function(length_so_far, leaf_index) {
        n.parent.cot_path_to_leaves_below[leaf_index] =
          length_so_far + n.cot_computed_length;
      });
    }
  });

  // populate all cot_path_to_leaves_above; this is done via a 'pre-order' traversal
  // handle root node first
  var root_node = tree.getRootNode();

  function _copy_from_siblings(a_node) {
    for (var this_node = 0; this_node < a_node.children.length; this_node++) {
      for (
        var other_node = 0;
        other_node < a_node.children.length;
        other_node++
      ) {
        if (this_node != other_node) {
          _.each(a_node.children[other_node].cot_path_to_leaves_below, function(
            length,
            index
          ) {
            if (a_node.children[this_node].cot_path_to_leaves_above) {
              a_node.children[this_node].cot_path_to_leaves_above[index] =
                length + a_node.children[other_node].cot_computed_length;
            }
          });
        }
      }
    }
  }

  _copy_from_siblings(root_node);

  // takes two passes

  tree.traverse_and_compute(function(n) {
    if (n.parent) {
      // copy parent's 'above' nodes
      _.each(n.parent.cot_path_to_leaves_above, function(
        length_so_far,
        leaf_index
      ) {
        n.cot_path_to_leaves_above[leaf_index] =
          length_so_far + n.parent.cot_computed_length;
      });

      if (!tree.isLeafNode(n)) {
        _copy_from_siblings(n);
      }
      // copy sibling's 'below' nodes
    }
  }, "pre-order");

  return leaf_count;
}

export default compute_pairwise_distances;
