const fs = require("fs");

const tape = require("tape"),
    _ = require("lodash"),
    phylotree = require("../dist/phylotree");

tape("fasta", function(test) {

  let fastaData = fs.readFileSync(__dirname + "/data/sequences.S.compressed.filtered.fas");
  let fasta = phylotree.parseFasta(fastaData);
  test.equal(_.keys(fasta).length, 9)
  test.end();

});

