var fs = require("fs");

var tape = require("tape"),
    phylotree = require("../dist/phylotree");


tape("cluster picker", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/EU3031.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  let bootstrap_threshold = 0.9;
  let diameter_threshold = 0.045;

  let clusters = phylotree.cluster_picker(phylo, bootstrap_threshold, diameter_threshold)
  test.equal(clusters.length, 235);
  test.end();

});

tape("phylopart", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/EU3031.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  let bootstrap_threshold = 0.9;
  let diameter_threshold = 0.045;

  let clusters = phylotree.phylopart(phylo, bootstrap_threshold, diameter_threshold)
  test.equal(clusters.length, 297);
  test.end();

});

