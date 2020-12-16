var fs = require("fs"),
    _  = require("underscore");

var tape = require("tape"),
    phylotree = require("../dist/phylotree");


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

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  phylotree.root_to_tip(phylo);

  let tip = phylo.get_node_by_name("Riyadh_2_2012_KF600652_human_2012-10-30");

  test.ok(Math.abs(tip.data.root_to_tip - 0.0019604097) <= .0001)
  test.end();

});

tape("should compute midpoint", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let midpoint = phylotree.compute_midpoint(phylo);

  test.equal(midpoint.location.data.name, 'D998_15_KX108943_camel_2015-04-23');
  test.end();

});

tape("should compute sackin's index", function(test) {

  let newick_string = "(a : 0.1, (b : 0.11, (c : 0.12, (d: 0.12, (e : 0.12, f : 0.13) : 0.14) : 0.15) : 0.16) : 0.16)";
  let phylo = new phylotree.phylotree(newick_string);

  test.equal(phylotree.sackin(phylo), 20);
  test.end();

});

tape("slatkin-maddison test", function(test) {

  let newick_string = "(a : 0.1, (b : 0.11, (c : 0.12, (d: 0.12, (e : 0.12, f : 0.13) : 0.14) : 0.15) : 0.16) : 0.16)";
  let phylo = new phylotree.phylotree(newick_string);

  test.equal(phylotree.sackin(phylo), 20);
  test.end();

});

