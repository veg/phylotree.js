var fs = require("fs");

var tape = require("tape"),
    phylotree = require("../dist/phylotree");

tape("tip length export", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let tips = phylo.getTipLengths(phylo);
  test.comment(tips[0].name) 
  test.comment(tips[0].length);
  test.equal(tips[0].name, 'D998_15_KX108943_camel_2015-04-23')
  test.end();

});


