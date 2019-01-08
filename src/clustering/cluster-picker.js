import * as d3 from "d3";
import * as _ from "underscore";

/**
 * Implements a linear time / space version of the Cluster picker algorithm
 * 
 * @param tree -- the tree object 
 * @param bootstrap_thresold -- value in [0,1] that sets the stringency of bootstrap support
 * @param diameter_threshold -- value >=0 that defines the maximum allowable pairwise distance in a cluster
 * @param root_node -- if specified, traverse the tree starting here (useful for only looking at parts of the tree),
 * tree root by default
 * @param missing_bootstrap_value -- if a branch is missing bootstrap support value, use this value instead
 *                   (1.0 by default)
 *                                 
 * @return an array of clusters, where cluster = 
 * {
 *    'root'   : [root node of cluster],
 *    'members' : [list of leaf. nodes],
 *    'diameter' : max distance in the cluster,
 *    'bootstrap' : bootstrap support at the root node
 * }                        
 */
function cluster_picker(
  tree,
  bootstrap_threshold,
  diameter_threshold,
  root_node,
  missing_bootstrap_value
) {
  root_node = root_node || tree.get_root_node();
  missing_bootstrap_value = _.isNumber(missing_bootstrap_value)
    ? missing_bootstrap_value
    : 1;

  // perform a bottom-up pass of the tree  
  // where each internal node will receive a floating point value 
  // that stores the longest path from the internal node to any of its descendants, 
  // the diameter of the cluster,  is then the sum of longest paths of all of its children
  let bl = tree.branch_length;

  // initialize member variables
  tree.traverse_and_compute(function(n) {
    if (n.parent) {
      n._computed_length = bl(n);
      if (!_.isNumber(n._computed_length)) {
        throw "cluster_picker cannot be run on trees with missing branch lengths";
      }
      n.max_path_length = 0;
    }
  });

  tree.traverse_and_compute(function(n) {
    if (n.parent) {
      n.parent.max_path_length = Math.max(
        n.parent.max_path_length,
        n.max_path_length + n._computed_length
      );
    }
  });

  var clusters = [];

  tree.traverse_and_compute(_.noop, "pre-order", root_node, function(n) {

    if (!tree.is_leafnode(n)) {

      var bs = _.isString(n.data.bootstrap_values)
        ? +n.data.bootstrap_values
        : missing_bootstrap_value;

      if (bs >= bootstrap_threshold) {

        var my_diameter = _.reduce(
          n.children,
          function(c, n) {
            return n.max_path_length + n._computed_length + c;
          },
          0
        );

        if (my_diameter <= diameter_threshold) {
          clusters.push({ root: n, diameter: my_diameter, bootstrap: bs });
          return true;
        }
      }

    }

    return false;

  });

  // clean up member variables
  tree.traverse_and_compute(
    function(n) {
      if (n.parent) {
        delete n._computed_length;
        delete n.max_path_length;
      }
    },
    "post-order",
    root_node
  );

  _.each(clusters, function(cluster) {
    cluster["members"] = [];
    tree.traverse_and_compute(
      function(n) {
        if (tree.is_leafnode(n)) {
          cluster["members"].push(n);
        }
      },
      "post-order",
      cluster["root"]
    );
  });

  return clusters;
}


export default cluster_picker;

