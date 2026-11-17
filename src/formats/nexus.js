import * as _ from "underscore";
import {default as newickParser} from "./newick";

export function parseAnnotations (buf) {

  let str = buf;
  let index = str.search(/BEGIN\s+DATA\s*;/i);

  if(index < 0) {
    return { 'dimensions' : {}, 'format' : { symbols : [] }, 'matrix' : {} };
  }

  let data = str.slice(index);

  index = data.toUpperCase().indexOf('END;');
  let data_str = index < 0 ? data : data.slice(0, index);

  // split on semicolon
  data = _.map(data_str.split(';'), d => { return d.trim() } );

  // turn "KEY=value KEY=value" into an object with lower case keys
  const toObject = line => {
    return _.object(_.map(_.compact(_.rest(line.split(/\s+/))), d => {
      let pair = d.split('=');
      return [pair[0].toLowerCase(), pair[1]];
    }));
  };

  // get dimensions
  let dimensions = _.filter(data, d => {return d.toUpperCase().startsWith('DIMENSION')});
  dimensions = dimensions.length ? toObject(dimensions[0]) : {};

  // get formats
  let format = _.filter(data, d => {return d.toUpperCase().startsWith('FORMAT')});
  format = format.length ? toObject(format[0]) : {};
  format.symbols = _.reject((format.symbols || '').split(""), d => d=='"');

  // get character matrix
  let matrix = _.filter(data, d => {return d.toUpperCase().startsWith('MATRIX')});
  matrix = matrix.length ? matrix[0].split('\n') : [];
  matrix = _.object(_.filter(_.map(_.rest(matrix), d=> { return _.compact(d.split(/\s+/)) }), d => d.length > 1));

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
export function loadAnnotations(tree, label, annotations) {

  // if filename, then load from filesystem
  _.each(tree.getTips(), d => { d.data[label] = annotations.matrix[d.data.name] });

  // decorate nodes with annotations

}

// Removes surrounding single or double quotes from a NEXUS token
function unquote(token) {
  return token.replace(/^(['"])(.*)\1$/, '$2');
}

// Split on `sep` wherever it is not inside a 'quoted label' ('' escapes a
// quote) or a [comment].
function splitOutside(str, sep) {
  let parts = [], current = '', quoted = false, comment = 0;
  for (let i = 0; i < str.length; i++) {
    let c = str[i];
    if (quoted) {
      if (c === "'") {
        if (str[i + 1] === "'") { current += c; i++; }
        else { quoted = false; }
      }
    } else if (comment) {
      if (c === ']') comment--;
      else if (c === '[') comment++;
    } else if (c === "'") {
      quoted = true;
    } else if (c === '[') {
      comment = 1;
    } else if (c === sep) {
      parts.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts;
}

export default function loadTree(buf, options) {

  // if filename, then load from filesystem
  // Parse first tree from NEXUS file and send to newickParser

  let str = buf;

  // Get TREE block
  let index = str.search(/BEGIN\s+TREES\s*;/i);

  if(index < 0) {
    return { json: null, error: 'no TREES block' };
  }

  let split = str.slice(index);
  index = split.toUpperCase().indexOf('END;');
  let tree_str = index < 0 ? split : split.slice(0, index);

  // Statements are separated by semicolons outside quotes and [comments]
  let statements = _.map(splitOutside(tree_str, ';'), d => {
    // a statement may be preceded by [comments]
    return d.replace(/^(\s*\[[^\]]*\])+/, '').trim();
  });

  let tree = _.find(statements, d => { return /^TREE\s/i.test(d) });

  if(!tree) {
    return { json: null, error: 'no tree in TREES block' };
  }

  // Map translate tokens to names
  let translate = {};
  let translate_statement = _.find(statements, d => { return /^TRANSLATE\s/i.test(d) });

  if(translate_statement) {
    _.each(splitOutside(translate_statement.replace(/^TRANSLATE\s+/i, ''), ','), d => {
      let tokens = d.trim().split(/\s+/);
      if(tokens.length > 1) {
        translate[tokens[0]] = unquote(tokens.slice(1).join(' '));
      }
    });
  }

  // Identify start of newick string
  let result = newickParser(tree + ';', options);

  if(result.json && !_.isEmpty(translate)) {
    let translateTips = node => {
      if(node.children && node.children.length) {
        _.each(node.children, translateTips);
      }
      else if(_.has(translate, node.name)) {
        node.name = translate[node.name];
      }
    };
    translateTips(result.json);
  }

  return result;

}
