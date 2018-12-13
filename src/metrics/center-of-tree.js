import * as _ from "underscore";

/*
 *special case for L^2
 *
 *For a fixed branch B, we have one parameter : where to break the branch `t` in [0, T], 
 *where T is the branch length
 *
 *D   = sum (a is a leaf above B) [d(B,a) + (T-t)] ^ 2 +
 *      sum (b is a leaf below B) [d(B,b) + t] ^ 2;
 *      
 *expanding, we have 
 *
 *D   = sum (a is a leaf above B) [d^2 (B,a) + 2(T-t) d(B,a) + (T-t)^2]
 *      sum (b is a leaf below B) [d^2 (B,b) + 2(t) d(B,b) + t^2]
 *      
 *    = (sum distances above)^2 + sum (distances above)*2(T-t) + (T-t)^2 * # leaves_above
 *      (sum distances below)^2 + sum (distances below)*2*t    + t^2 * # leaves_below
 *
 *      
 *Taking a derivative with respect to t we have
 *
 *dD / dt = - 2 sum (a is a leaf above B) [d(B,a) + (T-t)]
 *          + 2 sum (b is a leaf below B) [d(B,b) + t]
 *          
 *
 *second derivative is positive the function is convex, so can set to the nearest boundary if solution is outside range
 *
 *setting dD / dt to zero, we have 
 *
 *- sum (distances leaves above) - T * (#leaves above) + t * (#leaves above) + sum (distances leaves below) + t * (#leaves below) = 0
 *
 *t = [sum (distances leaves above) - sum (distances leaves below) + T * (#leaves above)] / (#leaves)
 */


import {default as pairwise_distances} from "./pairwise-distances";

export function center_of_tree(tree, power) {

  power = power || 2;

  var leaf_count = pairwise_distances(tree);

  var current_min = Number.MAX_VALUE,
      current_split = 0,
      current_location = null;

  if (power == 2) {

    tree.traverse_and_compute(function(n) {
      if (n.parent) {

        // can't consider the root
        var sum_below = 0,
          sum_below_squared = 0,
          sum_above = 0,
          sum_above_squared = 0;

        var count_below = 0;

        _.each(n.cot_path_to_leaves_below, function(l) {
          sum_below += l;
          sum_below_squared += l * l;
          count_below++;
        });

        _.each(n.cot_path_to_leaves_above, function(l) {
          sum_above += l;
          sum_above_squared += l * l;
        });

        var count_above = leaf_count - count_below;

        var tt =
          (sum_above - sum_below + n.cot_computed_length * count_above) /
          leaf_count;
        if (tt < 0) {
          tt = 0;
        } else if (tt > n.cot_computed_length) {
          tt = n.cot_computed_length;
        }

        var score =
          sum_above_squared +
          sum_below_squared +
          2 * (sum_above * (n.cot_computed_length - tt) + sum_below * tt) +
          count_below * tt * tt +
          (n.cot_computed_length - tt) *
            (n.cot_computed_length - tt) *
            count_above;

        if (score < current_min) {
          current_location = n;
          current_split = tt / n.cot_computed_length; //n.cot_computed_length-tt;//1 - tt / n.cot_computed_length;
          current_min = score;
        }

        delete n.cot_computed_length;
        delete n.cot_path_to_leaves_below;
        delete n.cot_path_to_leaves_above;
        delete n.cot_leaf_index;

      }
    });
  } else {
    // in the general case try a simple grid optimization
    tree.traverse_and_compute(function(n) {
      if (n.parent) {
        // can't consider the root

        var optimization_step =
            n.cot_computed_length > 0.0 ? n.cot_computed_length * 0.05 : 0.1,
          current_t = 0;

        while (current_t < n.cot_computed_length) {

          var score = 0.0;

          _.each(n.cot_path_to_leaves_below, function(l) {
            score += Math.pow(l + current_t, power);
          });

          _.each(n.cot_path_to_leaves_above, function(l) {
            score += Math.pow(l + (n.cot_computed_length - current_t), power);
          });

          if (score < current_min) {
            current_location = n;
            current_split = current_t / n.cot_computed_length; //n.cot_computed_length-tt;//1 - tt / n.cot_computed_length;
            current_min = score;
          }
          current_t += optimization_step;
        }
      }
    });
  }

  return {
    location: current_location,
    breakpoint: current_split,
    distance: current_min
  };
}

