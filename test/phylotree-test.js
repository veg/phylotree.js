var fs = require("fs");

var tape = require("tape"),
    phylotree = require("../dist/phylotree");

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

  test.ok(phylo.hasBranchLengths());
  test.end();

});

tape("phylotree path root", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  test.equal(phylo.pathToRoot(phylo.nodes.descendants()[12]).length, 6);
  test.end();
  
});

// Inspectors
tape("phylotree inspectors", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  test.notOk(phylo.isLeafNode(phylo.nodes))
  test.ok(phylo.isLeafNode(phylo.nodes.leaves()[0]))

  test.end();

});

//tape("phylotree maximum parsimony", function(test) {

//  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
//  let phylo = new phylotree.phylotree(newick_string);

//  test.equal();
//  test.end();
  
//});

tape("phylotree newick export", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  test.equal(phylo.getNewick().length, 18898);
  test.end();
  
});

tape("phylotree nodes", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  // delete a node
  let before = phylo.nodes.descendants().length;
  phylo.deleteANode(4);
  let after = phylo.nodes.descendants().length;
  test.equal(before - after, 1);
  test.end();
  
});

tape("phylotree rooting", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  phylo.reroot(phylo.nodes.descendants()[520]);
  test.equal(phylo.nodes.data.name, 'new_root');
  test.end();
  
});


tape("phylotree get tips", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  test.equal(phylo.getTips().length, 274);
  test.end();
  
});

