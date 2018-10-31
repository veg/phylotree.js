var fs = require("fs");

var tape = require("tape"),
    phylotree = require("../");

tape("phylotree should load newick tree", function(test) {
  let newick_string = fs.readFileSync(__dirname + "/data/MERS.txt");
  test.comment(newick_string);
  test.equal(formats.augur(zika).json.strain, 'NODE_0000010');
  test.end();
});
