import * as _ from "underscore";

function annotate_copy_number(tree) {
  tree.traverse_and_compute(function(node) {
    if (tree.is_leafnode(node)) {
      node.copy_number = 1;
    }
  });
}

// internal function used by best root fitting
function compute_root_to_tip_other_root(
  tree,
  node,
  coming_from,
  shared_distance,
  distance_to_new_root
) {
  var my_bl = tree.branch_length(node);

  var go_up = false;

  if (!coming_from) {
    shared_distance = node.root_to_tip;
    distance_to_new_root = 0;
    go_up = true;
  }

  if (node.children) {
    for (var c = 0; c < node.children.length; c++) {
      if (node.children[c] != coming_from) {
        compute_root_to_tip_other_root(
          tree,
          node.children[c],
          node,
          shared_distance,
          distance_to_new_root
        );
      } else {
        go_up = true;
      }
    }
  }

  node.rtta = node.root_to_tip - shared_distance + distance_to_new_root;

  if (go_up) {
    shared_distance -= my_bl;
    distance_to_new_root += my_bl;
  }

  if (node.parent && go_up) {
    compute_root_to_tip_other_root(
      tree,
      node.parent,
      node,
      shared_distance,
      distance_to_new_root
    );
  }
}

// Requires stuff
export function fit_root_to_tip(tree) {
  var linear_data = [],
    max_r2 = 0,
    best_node = 0;

  annotate_copy_number(tree);
  root_to_tip(tree);

  // To return if best node is the root already
  tree.traverse_and_compute(function(node) {
    if (tree.is_leafnode(node) && !_.isNull(node.decimal_date_value)) {
      linear_data.push([node.decimal_date_value, node.rtta, node.copy_number]);
    }
  });

  var best_fit = linear_fit(linear_data);

  tree.traverse_and_compute(function(node) {
    if (tree.is_leafnode(node) && !_.isNull(node.decimal_date_value)) {
      compute_root_to_tip_other_root(tree, node, null, 0, 0);

      linear_data = [];

      tree.traverse_and_compute(function(node) {
        if (tree.is_leafnode(node) && !_.isNull(node.decimal_date_value)) {
          linear_data.push([
            node.decimal_date_value,
            node.rtta,
            node.copy_number
          ]);
        }
      });

      var fit = linear_fit(linear_data),
        r2 = fit["r2"];

      if (r2 > max_r2) {
        max_r2 = r2;
        best_node = node;
        best_fit = fit;
      }
    }
  });

  return { root: best_node, fit: best_fit };
}

// linear fit of root to tip distances
function linear_fit(data) {
  var ss = data.reduce(function(p, c) {
      return c[2] + p;
    }, 0), // sample count
    sx = data.reduce(function(p, c) {
      return c[2] * c[0] + p;
    }, 0), // sum X
    sy = data.reduce(function(p, c) {
      return c[2] * c[1] + p;
    }, 0), // sum Y
    sxoss = sx / ss,
    syoss = sy / ss;

  var fitB = 0,
    st2 = 0,
    vary = 0;

  data.forEach(function(point) {
    var t = point[0] - sxoss;
    st2 += point[2] * t * t;
    fitB += point[2] * t * point[1];
    vary += point[2] * (point[1] - syoss) * (point[1] - syoss);
  });

  fitB /= st2;
  var a = (sy - sx * fitB) / ss;

  var varres = 0;

  data.forEach(function(point) {
    var t = point[1] - a - fitB * point[0];
    varres += point[2] * t * t;
  });

  return {
    intercept: a,
    slope: fitB,
    r2: 1 - varres / vary,
    "var (intercept)": Math.sqrt((1 + sx * sx / (ss * st2)) / ss),
    "var (slope)": Math.sqrt(1 / st2)
  };
}

/**
 *   fast and memory efficient root to tip distance calculator
 *   for each leaf node stores the current root to tip distance in 
 *   the node.root_to_tip field
 *   
 *   @param tree
 *   @return tree with root_to_tip computed
 *
 */
export default function root_to_tip(tree) {
  var bl = tree.branch_length,
    index = 0;

  tree.traverse_and_compute(n => {
    if (n.parent) {
      n._computed_length = bl(n);
      if (!_.isNumber(n._computed_length)) {
        throw "root_to_tip cannot be run on trees with missing branch lengths";
      }
    }
    if (tree.is_leafnode(n)) {
      n.leaf_index = index++;
    }
    if ("r2t" in n) {
      delete n.r2t;
    }
  });

  tree.traverse_and_compute(n => {
    if (n.parent) {
      if (!("r2t" in n.parent)) {
        n.parent.r2t = {};
        n.parent.hi = [];
      }
      if (tree.is_leafnode(n)) {
        n.parent.r2t[n.leaf_index] = n._computed_length;
      } else {
        _.each(n.r2t, function(v, idx) {
          n.parent.r2t[idx] = v + n._computed_length;
        });
        delete n.r2t;
      }
      delete n._computed_length;
    }
  });

  var r2t = tree.get_root_node().r2t;

  tree.traverse_and_compute(n => {
    if (tree.is_leafnode(n)) {
      n.root_to_tip = r2t[n.leaf_index];
      delete n.leaf_index;
    }
  });

  delete tree.get_root_node().r2t;

  return tree;
}
