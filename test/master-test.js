var fs = require("fs");
var _ = require("lodash");
var d3 = require("d3");

var tape = require("tape"),
    phylotree = require("../build/phylotree");

tape( "handles small chain transmission" ,function(test) {

  let nwk = "(a : 0.1, (b : 0.11, (c : 0.12, d : 0.13) : 0.14) : 0.15)"
  let phylo = new phylotree.phylotree(nwk);
  phylotree.annotateInfection(phylo.nodes);

  let edge_list = phylotree.getMasterEdgeList(phylo);

  // traverse child-sibling
  test.equal(edge_list.length, 3);

  //test.equal(max, 235);
  test.end();

});

tape.only("master parse", function(test) {

  let nwk = String(fs.readFileSync(__dirname + "/data/fastTrans.nexus"));
  let phylo = new phylotree.phylotree(nwk, { type: "master" });

  phylotree.annotateBeastNames(phylo.nodes);
  phylotree.annotateInfection(phylo.nodes);

  let edge_list = phylotree.getMasterEdgeList(phylo);

  // traverse child-sibling
  test.equal(edge_list.length, 986);
  
  //test.equal(max, 235);
  test.end();

});


