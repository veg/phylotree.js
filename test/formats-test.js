var fs = require("fs");
var _ = require("underscore");

var tape = require("tape"),
    phylotree = require("../build/phylotree");

tape("NEXUS parse", function(test) {

  let nwk = String(fs.readFileSync(__dirname + "/data/apternodus.tre"));
  let phylo = new phylotree.phylotree(nwk, { type: "nexus" });

  let annotation_file = __dirname + "/data/apternodus.chars.small.nexus";
  let annotations = String(fs.readFileSync(annotation_file));

  let anno = phylotree.parse_annotations(annotations);
  test.equal(_.keys(anno.matrix).length, 30);

  // load annotations
  phylotree.load_annotations(phylo, 'char', anno);

  //test.equal(max, 235);
  test.end();

});


