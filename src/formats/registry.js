import { default as nexml_parser } from "./nexml";
import { default as newick_parser } from "./newick";
import { default as nexus_parser } from "./nexus";
import { default as master_parser } from "./master";
import { default as phyloxml_parser } from "./phyloxml";

/* 
 * A parser must have two fields, the object and
 * options
 */
var format_registry = {
  nexml: nexml_parser,
  phyloxml: phyloxml_parser,
  nexus : nexus_parser,
  master : master_parser,
  nwk: newick_parser
};

export default format_registry;
