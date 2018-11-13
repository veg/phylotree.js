import * as _ from "underscore";
import {default as nexml_parser} from "./nexml";
import {default as newick_parser} from "./newick";
import {default as phyloxml_parser} from "./phyloxml";


/* 
 * A parser must have two fields, the object and
 * options
 */
var format_registry = {
  nexml: nexml_parser,
  phyloxml: phyloxml_parser,
  nwk: newick_parser
};

export default format_registry;
