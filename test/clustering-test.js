var fs = require("fs");

var tape = require("tape"),
    phylotree = require("../build/phylotree");


tape.only("cluster picker", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/EU3031.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  let bootstrap_threshold = 0.9;
  let diameter_threshold = 0.045;

  let clusters = phylotree.cluster_picker(phylo, bootstrap_threshold, diameter_threshold)
  test.equal(clusters.length, 235);
  test.end();

});

//tape.only("phylopart", function(test) {

//  let newick_string = String(fs.readFileSync(__dirname + "/data/EU3031.txt"));
//  let phylo = new phylotree.phylotree(newick_string);
//  let center = phylotree.center_of_tree(phylo, 1);

//  test.equal(center.breakpoint, 0)
//  test.end();

//});

