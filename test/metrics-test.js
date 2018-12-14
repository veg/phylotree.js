var fs = require("fs"),
    _  = require("underscore");

var tape = require("tape"),
    phylotree = require("../build/phylotree");


tape("pairwise distances", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let pairwise_distance = phylotree.pairwise_distances(phylo);
  test.equal(pairwise_distance, 274)
  test.end();

});

tape("center of tree", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let center = phylotree.center_of_tree(phylo, 1);

  test.equal(center.breakpoint, 0)
  test.end();

});

tape("root to tip", function(test) {

  // TODO : traversal is broken
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  phylotree.root_to_tip(phylo);
  let tip = phylo.get_node_by_name("Riyadh_2_2012_KF600652_human_2012-10-30");
  test.ok(Math.abs(tip.root_to_tip - 0.0019604097) <= .0001)
  test.end();

});



tape("should compute midpoint", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let midpoint = phylotree.compute_midpoint(phylo);

  test.equal(midpoint.location.data.name, 'D998_15_KX108943_camel_2015-04-23');
  test.end();

});



