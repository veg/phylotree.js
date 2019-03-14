var fs = require("fs");

var tape = require("tape"),
    phylotree = require("../build/phylotree");

tape.only("master parse", function(test) {

  let nwk = String(fs.readFileSync(__dirname + "/data/fastTrans.nexus"));
  let phylo = new phylotree.phylotree(nwk, { type: "master" });
  let edge_list = phylo.leftSiblingRightChild(phylo.nodes);

  // traverse child-sibling
  console.log(edge_list);


  //test.equal(max, 235);
  test.end();

});


