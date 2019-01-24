import * as _ from "underscore";
import {default as newick_parser} from "./newick";

export function parse_annotations (buf) {

  let str = buf;

  let index = str.toUpperCase().indexOf('BEGIN DATA;');
  let data = str.slice(index);

  if(data.length < 2) {
    console.log('No DATA section found');
    return '';
  }

  index = data.toUpperCase().indexOf('END;');
  let data_str = data.slice(0, index);

  // split on semicolon
  data = _.map(data_str.split(';'), d => { return d.trim() } );

  // get dimensions
  let dimensions = _.filter(data, d => {return d.toUpperCase().startsWith('DIMENSION')}); 
  dimensions = dimensions[0].split(' ');
  dimensions = _.object(_.map(_.rest(dimensions), d => { return d.split('=') }));

  // get formats
  let format = _.filter(data, d => {return d.toUpperCase().startsWith('FORMAT')}); 
  format = format[0].split(' ');
  format = _.object(_.map(_.rest(format), d => { return d.split('=') }));
  format.symbols = _.reject(format.symbols.split(""), d => d=='"');

  // get character matrix
  let matrix = _.filter(data, d => {return d.toUpperCase().startsWith('MATRIX')}); 
  matrix = matrix[0].split('\n')
  matrix = _.object(_.map(_.rest(matrix), d=> { return _.compact(d.split(' ')) }));

  // create all possible states for matrix
  matrix = _.mapObject(matrix, (v,k) => { 

    if(v == '?') {
      return format.symbols
    }
    else { 
      return Array(v)
    }
  
  });

  return { 'dimensions' : dimensions, 'format' : format, 'matrix' : matrix }

}

/**
 *  Loads annotations from a nexus-formatted buffer and annotates existing tree
 *  nodes appropriately.
 *
 * @param {Object} tree - Instatiated phylotree
 * @param {String} NEXUS string
 * @returns {Object} Annotations
 */
export function load_annotations(tree, label, annotations) {

  // if filename, then load from filesystem
  _.each(tree.get_tips(), d => { d.data[label] = annotations.matrix[d.data.name] });

  console.log(tree.get_tips());

  // decorate nodes with annotations

}

export default function loadTree(buf) {
  // if filename, then load from filesystem
  // Parse first tree from NEXUS file and send to newick_parser

  // Make all upper case
  let str = buf;

  // Get TREE block
  let index = str.toUpperCase().indexOf('BEGIN TREES;');
  let split = str.slice(index);

  if(split.length < 2) {
    console.log('No TREE section found');
    return '';
  }

  index = split.toUpperCase().indexOf('END;');
  let tree_str = split.slice(0, index);

  // Filter lines that start with TREE
  let trees = tree_str.split('\n');
  trees = _.filter(trees, d => { return d.trim().toUpperCase().startsWith('TREE') });

  // Identify start of newick string
  return newick_parser(trees[0]);

}

