var fs = require("fs");
    _  = require("underscore");

var tape = require("tape"),
    phylotree = require("../build/phylotree"),
    d3 = require("d3");

tape("phylotree should load newick tree", function(test) {
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  test.ok(phylo.newick_string);
  test.end();
});

tape("phylotree should export json", function(test) {
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  test.doesNotThrow(e => { phylo.json() });
  test.end();
});

tape("phylotree has branch lengths", function(test) {
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  test.ok(phylo.has_branch_lengths());
  test.end();
});

tape("phylotree path root", function(test) {
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  test.equal(phylo.path_to_root(phylo.nodes.descendants()[12]).length, 6);
  test.end();
});

tape("phylotree inspectors", function(test) {
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  test.notOk(phylotree.item_selected(phylo.nodes, 'selected'))
  test.ok(phylotree.node_visible(phylo.nodes))
  test.notOk(phylotree.node_notshown(phylo.nodes))

  test.notOk(phylotree.node_notshown(phylo.nodes))

  // not sure when used
  test.notOk(phylotree.item_tagged(phylo.nodes))

  test.end();
});


// Inspectors
