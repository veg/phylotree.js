var fs = require("fs"),
    _  = require("underscore");

var tape = require("tape"),
    phylotree = require("../build/phylotree");


tape("pairwise distances", function(test) {

  // TODO : traversal is broken
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let pairwise_distance = phylotree.pairwise_distances(phylo);

  //console.log(pairwise_distance);
  test.end();

});

tape("center of tree", function(test) {

  // TODO : traversal is broken
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  let center = phylotree.center_of_tree(phylo, 2);
  //console.log(center);
  test.end();

});

tape.only("root to tip", function(test) {

  // TODO : traversal is broken
  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  phylotree.root_to_tip(phylo);
  let tips = phylo.get_tips();
  test.ok(_.every(tips, d => { return _.has("root_to_tip")}));
  //let sum = _.reduce(tips, (sum, d) => { sum + d.root_to_tip }, 0);
  //console.log(sum);
  test.end();

});



tape("should compute midpoint", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let midpoint = phylotree.compute_midpoint(phylo);

  test.equal(midpoint.location.data.name, 'root');
  test.end();

});



