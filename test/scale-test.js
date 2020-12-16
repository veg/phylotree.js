var fs = require("fs");
const _ = require("underscore");

var tape = require("tape"),
    phylotree = require("../dist/phylotree");

tape("normalize", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/seed.seq.bis.sim.nwk"));
  let phylo = new phylotree.phylotree(newick_string);

  // normalize
  phylo.normalize_branch_lengths();

  test.ok(_.map(phylo.get_branch_lengths(), d => { return d <= 1}));
  
  test.end();

});


tape("scaler", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/seed.seq.bis.sim.nwk"));
  let phylo = new phylotree.phylotree(newick_string);

  // array([-0.00076478, -0.01971795,  0.03945753,  0.00099495])

  // normalize
  phylo.normalize_branch_lengths();
  
  let scaler = function(bl) {
    return bl * 0.02;
  }

  phylo.scale_branch_lengths(scaler)
  let max_branch_length = _.max(phylo.get_branch_lengths());
  test.equal(max_branch_length, 0.02);
  test.end();

});

