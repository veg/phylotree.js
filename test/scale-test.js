var fs = require("fs");
const _ = require("underscore");

var tape = require("tape"),
    phylotree = require("../build/phylotree");

tape("normalize", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/seed.seq.bis.sim.nwk"));
  let phylo = new phylotree.phylotree(newick_string);

  // normalize
  phylo.normalize();

  test.ok(_.map(phylo.get_branch_lengths(), d => { return d <= 1}));
  
  test.end();

});


//tape("scaler", function(test) {

//  let newick_string = String(fs.readFileSync(__dirname + "/data/seed.seq.bis.sim.nwk"));
//  let phylo = new phylotree.phylotree(newick_string);

//  console.log(phylo.links[10].target.data.attribute);

//  // normalize
//  phylo.normalize();
//  console.log(phylo.get_branch_lengths())
  
//  // scale to alpha distribution

//  //phylotree.scale(phylo, scaler)
//  //let distances = phylotree.get_tips();
//  //test.equal(clusters.length, 235);
//  test.end();

//});

