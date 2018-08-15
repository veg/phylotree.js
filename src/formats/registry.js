const nexml_parser = require("./nexml");
const newick_parser = require("./newick");
const phyloxml_parser = require("./phyloxml");

/* 
 * A parser must have two fields, the object and
 * options
 */
var format_registry = {
  nexml: nexml_parser,
  phyloxml: phyloxml_parser,
  nwk: newick_parser
};

module.exports = format_registry;
