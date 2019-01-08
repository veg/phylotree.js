/**
 * Compute midpoint of a phylogenetic tree
 * 
 * @param {Object} tree -- the phylotree.js tree object 
 * @return {Object} the calculated midpoint to root on
 *  { location: root_node, breakpoint: 0 }
 *
 */
export function compute_midpoint(tree) {
  if (!tree.has_branch_lengths()) {
    throw "Center of tree calculation cannot be performed on trees that do not have fully specified branch lengths";
  }

  var bl = tree.branch_length;

  tree.traverse_and_compute(function(node) {
    if (node.parent) {
      var my_longest_path_length = bl(node);
      var my_longest_path_terminus;

      if (tree.is_leafnode(node)) {
        my_longest_path_terminus = node;
        node.max_path = 0;
        node.max_path_terminus = node;
      } else {
        my_longest_path_length += node.max_path;
        my_longest_path_terminus = node.max_path_terminus;
      }

      if (
        !node.parent.max_path ||
        node.parent.max_path < my_longest_path_length
      ) {
        node.parent.max_path = my_longest_path_length;
        node.parent.max_path_terminus = my_longest_path_terminus;
      }
    }
  });

  var root_node = tree.get_root_node();
  var longest_path_length = 0;
  var second_longest;

  root_node.children.forEach(function(root_child) {
    if (root_child.max_path_terminus !== root_node.max_path_terminus) {
      var pl = root_child.max_path + bl(root_child);
      if (pl >= longest_path_length) {
        longest_path_length = pl;
        second_longest = root_child.max_path_terminus;
      }
    }
  });

  if (root_node.max_path > longest_path_length) {
    // not already midpoint rooted
    longest_path_length = (longest_path_length + root_node.max_path) * 0.5;

    // start traversing up from the deepest leaf to the root, until we find the
    // half-way point

    var root_on = root_node.max_path_terminus;

    while (true) {
      var current_bl = bl(root_on);
      //console.log (current_bl, longest_path_length);
      if (current_bl <= longest_path_length) {
        longest_path_length -= current_bl;
        root_on = root_on.parent;
      } else {
        //console.log ("Rooting on ", root_on, longest_path_length[0], current_bl);

        return {
          location: root_on,
          breakpoint: longest_path_length / current_bl
        };

        //console.log ("Longest " + root_path (tree.get_node_by_name(root_node.max_path_terminus.name)));
        //console.log ("Second longest " + root_path (tree.get_node_by_name(longest_path_length[1].name)));
      }
    }
  }
  return { location: root_node, breakpoint: 0 };
}
