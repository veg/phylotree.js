import * as _ from "underscore";

function annotateCopyNumber(tree) {
  tree.traverse_and_compute(function(node) {
    if (tree.isLeafNode(node)) {
      node.data.copy_number = 1;
    }
  });
}

// internal function used by best root fitting
function computeRootToTipOtherRoot(
  tree,
  node,
  coming_from,
  shared_distance,
  distance_to_new_root
) {

  var my_bl = tree.branch_length(node);

  var go_up = false;

  if (!coming_from) {
    shared_distance = node.data.rootToTip;
    distance_to_new_root = 0;
    go_up = true;
  }

  if (node.children) {
    for (var c = 0; c < node.children.length; c++) {
      if (node.children[c] != coming_from) {
        computeRootToTipOtherRoot(
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

  node.data.rtta = node.data.rootToTip - shared_distance + distance_to_new_root;

  if (go_up) {
    shared_distance -= my_bl;
    distance_to_new_root += my_bl;
  }

  if (node.parent && go_up) {
    computeRootToTipOtherRoot(
      tree,
      node.parent,
      node,
      shared_distance,
      distance_to_new_root
    );
  }
}

export function fitRootToTip(tree) {

  var linear_data = [],
    max_r2 = 0,
    best_node = 0;

  annotateCopyNumber(tree);
  rootToTip(tree);

  // To return if best node is the root already
  tree.traverse_and_compute(function(node) {
    if (tree.isLeafNode(node) && !_.isNull(node.data.decimal_date_value)) {
      linear_data.push([node.data.decimal_date_value, node.data.rtta, node.data.copy_number]);
    }
  });

  let best_fit = linearFit(linear_data);

  tree.traverse_and_compute(function(node) {

    if (tree.isLeafNode(node) && !_.isNull(node.data.decimal_date_value)) {

      computeRootToTipOtherRoot(tree, node, null, 0, 0);

      linear_data = [];

      tree.traverse_and_compute(function(node) {
        if (tree.isLeafNode(node) && !_.isNull(node.data.decimal_date_value)) {
          linear_data.push([
            node.data.decimal_date_value,
            node.data.rtta,
            node.data.copy_number
          ]);
        }
      });

      var fit = linearFit(linear_data),
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
function linearFit(data) {

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
 *   the node.rootToTip field
 *   
 *   @param tree
 *   @return tree with rootToTip computed
 *
 */
export default function rootToTip(tree) {

  var bl = tree.branch_length_accessor,
    index = 0;

  tree.traverse_and_compute(n => {
    if (n.parent) {
      n.data._computed_length = bl(n);
      if (!_.isNumber(n.data._computed_length)) {
        throw "rootToTip cannot be run on trees with missing branch lengths";
      }
    }
    if (tree.isLeafNode(n)) {
      n.data.leaf_index = index++;
    }
    if ("r2t" in n.data) {
      delete n.data.r2t;
    }
  });

  tree.traverse_and_compute(n => {
    if (n.parent) {
      if (!("r2t" in n.parent.data)) {
        n.parent.data.r2t = {};
      }
      if (tree.isLeafNode(n)) {
        n.parent.data.r2t[n.data.leaf_index] = n.data._computed_length;
      } else {
        _.each(n.data.r2t, function(v, idx) {
          n.parent.data.r2t[idx] = v + n.data._computed_length;
        });
        delete n.data.r2t;
      }
      delete n.data._computed_length;
    }
  });

  var r2t = tree.getRootNode().data.r2t;

  tree.traverse_and_compute(n => {
    if (tree.isLeafNode(n)) {
      n.data.rootToTip = r2t[n.data.leaf_index] || 0;
      delete n.data.leaf_index;
    }
  });

  delete tree.getRootNode().data.r2t;

  return tree;
}
