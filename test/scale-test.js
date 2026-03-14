var fs = require("fs");
const _ = require("underscore");

var tape = require("tape"),
    phylotree = require("../dist/phylotree");

tape("normalize", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/seed.seq.bis.sim.nwk"));
  let phylo = new phylotree.phylotree(newick_string);

  // normalize
  phylo.normalizeBranchLengths();

  test.ok(_.map(phylo.getBranchLengths(), d => { return d <= 1}));
  
  test.end();

});


tape("scaler", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/seed.seq.bis.sim.nwk"));
  let phylo = new phylotree.phylotree(newick_string);

  // array([-0.00076478, -0.01971795,  0.03945753,  0.00099495])

  // normalize
  phylo.normalizeBranchLengths();
  
  let scaler = function(bl) {
    return bl * 0.02;
  }

  phylo.scaleBranchLengths(scaler)
  let max_branch_length = _.max(phylo.getBranchLengths());
  test.equal(max_branch_length, 0.02);
  test.end();

});

