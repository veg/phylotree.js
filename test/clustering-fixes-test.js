var fs = require("fs");

var tape = require("tape"),
  phylotree = require("../dist/phylotree");

tape("clusterPicker honors setBranchLength", function(test) {
  let tree = new phylotree.phylotree("((A:1,B:1)0.95:1,(C:1,D:1)0.95:1);");
  test.ok(phylotree.clusterPicker(tree, 0.9, 2.5).length > 0);
  tree.setBranchLength(function() {
    return 100;
  });
  test.equal(phylotree.clusterPicker(tree, 0.9, 2.5).length, 0);
  test.end();
});

tape("clusterPicker treats unlabeled support as missing", function(test) {
  let tree = new phylotree.phylotree("((A:1,B:1):1,(C:1,D:1):1);");
  let clusters = phylotree.clusterPicker(tree, 0.9, 2.5);
  test.ok(clusters.length > 0);
  clusters.forEach(function(c) {
    test.equal(c.bootstrap, 1);
  });
  test.equal(phylotree.clusterPicker(tree, 0.9, 2.5, null, 0).length, 0);
  test.end();
});

tape("clusterPicker validates thresholds", function(test) {
  let tree = new phylotree.phylotree("((A:1,B:1):1,(C:1,D:1):1);");
  test.throws(function() {
    phylotree.clusterPicker(tree, {
      bootstrap_threshold: 0.9,
      distance_threshold: 0.045
    });
  });
  test.throws(function() {
    phylotree.clusterPicker(tree, 0.9, "0.5");
  });
  test.throws(function() {
    phylotree.clusterPicker(tree, 0.9, -1);
  });
  test.throws(function() {
    phylotree.clusterPicker(tree, NaN, 1);
  });
  test.end();
});

tape("phylopart median stays finite", function(test) {
  let tree = new phylotree.phylotree(
    "((A:1,B:1):0.01,((C:5,D:5):1,(E:5,F:5):1):0.01,G:1);"
  );
  let clusters = phylotree.phylopart(tree, 0.5, 0.5);
  test.ok(clusters.length > 0);
  clusters.forEach(function(c) {
    test.ok(isFinite(c.median), "median is finite");
  });
  test.end();
});

tape("phylopart includes all root path segments", function(test) {
  let eu = new phylotree.phylotree(
    String(fs.readFileSync(__dirname + "/data/EU3031.txt"))
  );
  test.equal(phylotree.phylopart(eu, 0.9, 0.045).length, 300);
  test.end();
});
