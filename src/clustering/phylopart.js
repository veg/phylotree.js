import * as d3 from "d3";

/*
 *Implements a linear time / space version of the Phylopart algorithm
 *Nature Communications volume 2, Article number: 321 (2011)
 *
 *@param tree                 -- the tree object 
 *
 *@param bootstrap_thresold -- value in [0,1] that sets the stringency of bootstrap support
 *
 *@param percentile threshold -- a value in 0-1, which is used to delineate how clusters
 *                               are defined; the actual criterion used is 
 *        [approximate] median pairwise distance in a cluster <= %-le of tree-wide distribution 
 *                               
 *@param missing_bootstrap_value -- if a branch is missing bootstrap support value, use this value instead
 *                    (1.0 by default)
 *                    
 *@param resolution -- the width of the bin for the histogram; by default is set to be the   
 *                     minimum of 0.001, branch length range / 100,
 *                     however, the maximum number of histogram bins is capped at 500 for 
 *                     performance reasons
 *                                 
 *@return an array of clusters, where cluster = 
 *{
 *    'root'              : [root node of cluster]
 *    'members'           : [list of leaf. nodes]
 *    'median'            : approximate median cluster distance,
 *    'bootstrap'         : bootstrap support at the root node
 *}                        
 */


import {default as pairwise_distances} from "../metrics/pairwise-distances";

function phylopart(
  tree,
  bootstrap_threshold,
  percentile_threshold,
  missing_bootstrap_value,
  resolution
) {

  /** TODO SLKP 20180817 : this implementation does not compute pairwise distances correctly at the moment;
   instead it computes root-to-tip distances */
  missing_bootstrap_value = _.isNumber(missing_bootstrap_value)
    ? missing_bootstrap_value
    : 1;

  var leaf_count = pairwise_distances(tree);

  /** first, decide on the domain of branch lengths **/

  var core_node = tree.get_root_node().children[0];

  var min_bl = Number.MAX_VALUE,
    min_bl2 = Number.MAX_VALUE;

  if (!(percentile_threshold > 0 && percentile_threshold < 1)) {
    throw "Invalid percentile threshold in perform_phylopart";
  }

  tree.traverse_and_compute(function(n) {
    if (d3.layout.phylotree.is_leafnode(n)) {
      if (n.cot_computed_length < min_bl) {
        if (min_bl < min_bl2) {
          min_bl2 = min_bl;
        }
        min_bl = n.cot_computed_length;
      } else {
        if (n.cot_computed_length < min_bl2) {
          min_bl2 = n.cot_computed_length;
        }
      }
    }
  });

  min_bl += min_bl2;

  // pairwise distances are bounded below by the sum of two shortest terminal branches

  // compute the upper bound
  var max_path_length =
    _.reduce(
      core_node.cot_path_to_leaves_below,
      function(c, n) {
        return n > c ? n : c;
      },
      0
    ) +
    _.reduce(
      core_node.cot_path_to_leaves_above,
      function(c, n) {
        return n > c ? n : c;
      },
      0
    ) +
    core_node.cot_computed_length;

  var domain = max_path_length - min_bl;

  if (_.isUndefined(resolution)) {
    resolution = Math.min(1e-3, domain / 100);
  }

  var number_of_bins = ((domain / resolution) >> 0) + 1;
  if (number_of_bins > 500) {
    number_of_bins = 500;
    resolution = domain / number_of_bins;
  }

  var root_node = tree.get_root_node();

  root_node.paths_to_leaves = new Array(leaf_count);

  _.each(root_node.children, function(cn) {
    _.each(root_node.cot_path_to_leaves_below, function(v, i) {
      root_node.paths_to_leaves[i] = v + cn.cot_computed_length;
    });
  });

  tree.traverse_and_compute(function(n) {
    if (!d3.layout.phylotree.is_leafnode(n)) {
      n.histogram = new Array(number_of_bins);
      for (var i = 0; i < number_of_bins; i++) {
        n.histogram[i] = 0;
      }
      if (n.parent) {
        var index = 0;
        n.paths_to_leaves = [];
        _.each(n.cot_path_to_leaves_below, function(v, i) {
          n.paths_to_leaves[index++] = v;
        });
      }
    }
    delete n.cot_path_to_leaves_above;
    delete n.cot_path_to_leaves_below;
  });

  /**
        for each internal node, produce a histogram of pairwise distances on sequences that are defined 
        by the subtree at that node
        
        this could be approximated (I think), by merging histograms of children
    */

  tree.traverse_and_compute(function(n) {
    if (!d3.layout.phylotree.is_leafnode(n)) {
      for (var n1 = 0; n1 < n.paths_to_leaves.length; n1++) {
        for (var n2 = n1 + 1; n2 < n.paths_to_leaves.length; n2++) {
          var sum = n.paths_to_leaves[n1] + n.paths_to_leaves[n2];
          n.histogram[((sum - min_bl) / resolution) >> 0]++;
        }
      }
      n.leaf_count = n.paths_to_leaves.length;

      delete n.paths_to_leaves;
    }
  });

  // compute the percentile distance cutoff

  var total_comparisons =
    (leaf_count - 1) * leaf_count / 2 * percentile_threshold;
  var bin_i = 0;
  for (
    ;
    bin_i < number_of_bins - 1 &&
    total_comparisons > root_node.histogram[bin_i];
    bin_i++
  ) {
    total_comparisons -= root_node.histogram[bin_i];
  }

  var median_threshold =
    min_bl +
    (bin_i +
      (root_node.histogram[bin_i] - total_comparisons) /
        root_node.histogram[bin_i]) *
      resolution;

  var clusters = [];

  tree.traverse_and_compute(_.noop, "pre-order", null, function(n) {
    if (!d3.layout.phylotree.is_leafnode(n)) {
      var bs = _.isString(n.bootstrap_values)
        ? +n.bootstrap_values
        : missing_bootstrap_value;
      if (bs >= bootstrap_threshold) {
        var total_comparisons = n.leaf_count * (n.leaf_count - 1) * 0.25;

        var bin_i = 0;
        for (
          ;
          bin_i < number_of_bins - 1 && total_comparisons > n.histogram[bin_i];
          bin_i++
        ) {
          total_comparisons -= n.histogram[bin_i];
        }

        var my_median =
          min_bl +
          (bin_i +
            (n.histogram[bin_i] - total_comparisons) / n.histogram[bin_i]) *
            resolution;

        if (my_median <= median_threshold) {
          clusters.push({ root: n, median: my_median, bootstrap: bs });
          return true;
        }
      }
    }
    return false;
  });

  tree.traverse_and_compute(function(n) {
    if (!d3.layout.phylotree.is_leafnode(n)) {
      if ("histogram" in n) {
        delete n.histogram;
        delete n.leaf_count;
      }
    }
  });

  _.each(clusters, function(cluster) {
    cluster["members"] = [];
    tree.traverse_and_compute(
      function(n) {
        if (d3.layout.phylotree.is_leafnode(n)) {
          cluster["members"].push(n);
        }
      },
      "post-order",
      cluster["root"]
    );
  });

  return clusters;
}

export default phylopart;

