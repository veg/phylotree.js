import { default as nexml_parser } from "./nexml";
import { default as newick_parser } from "./newick";
import { default as nexus_parser } from "./nexus";
import { default as phyloxml_parser } from "./phyloxml";
import { default as beast_parser } from "./beast";

/* 
 * A parser must have two fields, the object and
 * options
 */
var format_registry = {
  nexml: nexml_parser,
  phyloxml: phyloxml_parser,
  nexus : nexus_parser,
  nwk: newick_parser,
  nhx: newick_parser,
  beast: beast_parser
};

export default format_registry;
