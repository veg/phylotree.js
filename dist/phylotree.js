(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('underscore'), require('lodash'), require('d3-time-format')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3', 'underscore', 'lodash', 'd3-time-format'], factory) :
  (global = global || self, factory(global.phylotree = global.phylotree || {}, global.d3, global._, global._$1, global.d3TimeFormat));
}(this, (function (exports, d3, _, _$1, d3TimeFormat) { 'use strict';

  //import { parseString } from "xml2js";

  var nexml_parser = function(xml_string, options) {
    var trees;
    parseString(xml_string, function(error, xml) {
      trees = xml["nex:nexml"].trees[0].tree.map(function(nexml_tree) {
        var node_list = nexml_tree.node.map(d => d.$),
          node_hash = node_list.reduce(function(a, b) {
            b.edges = [];
            b.name = b.id;
            a[b.id] = b;
            return a;
          }, {}),
          roots = node_list.filter(d => d.root),
          root_id = roots > 0 ? roots[0].id : node_list[0].id;
        node_hash[root_id].name = "root";

        nexml_tree.edge.map(d => d.$).forEach(function(edge) {
          node_hash[edge.source].edges.push(edge);
        });

        function parse_nexml(node, index) {
          if (node.edges) {
            var targets = _.pluck(node.edges, "target");
            node.children = _.values(_.pick(node_hash, targets));
            node.children.forEach(function(child, i) {
              child.attribute = node.edges[i].length || "";
            });
            node.children.forEach(parse_nexml);
            node.annotation = "";
          }
        }

        parse_nexml(node_hash[root_id]);
        return node_hash[root_id];
      });
    });
    return trees;
  };

  // These methods are part of the Phylotree object

  function graft_a_node(graft_at, new_child, new_parent, lengths) {

    let nodes = this.nodes.descendants();

    if (graft_at.parent) {
      let node_index = nodes.indexOf(graft_at);

      if (node_index >= 0) {
        let parent_index = graft_at.parent.children.indexOf(graft_at);

        let new_split = {
            name: new_parent,
            parent: graft_at.parent,
            attribute: lengths ? lengths[2] : null,
            original_child_order: graft_at["original_child_order"]
          },
          new_node = {
            name: new_child,
            parent: new_split,
            attribute: lengths ? lengths[1] : null,
            original_child_order: 2
          };

        new_split["children"] = [graft_at, new_node];
        graft_at["parent"].children[parent_index] = new_split;
        graft_at.parent = new_split;
        graft_at["attribute"] = lengths ? lengths[0] : null;
        graft_at["original_child_order"] = 1;
      }
    }

    return this;

  }

  /**
   * Delete a given node.
   *
   * @param {Node} The node to be deleted, or the index of such a node.
   * @returns The current ``phylotree``.
   */
  function delete_a_node(index) {
    let nodes = this.nodes.descendants();

    if (typeof index != "number") {
      return this.delete_a_node(nodes.indexOf(index));
    }

    if (index > 0 && index < nodes.length) {
      let node = nodes[index];

      if (node.parent) {
        // can only delete nodes that are not the root
        let delete_me_idx = node.parent.children.indexOf(node);

        if (delete_me_idx >= 0) {
          nodes.splice(index, 1);

          if (node.children) {
            node.children.forEach(function(d) {
              d["original_child_order"] = node.parent.children.length;
              node.parent.children.push(d);
              d.parent = node.parent;
            });
          }

          if (node.parent.children.length > 2) {
            node.parent.children.splice(delete_me_idx, 1);
          } else {
            if (node.parent.parent) {
              node.parent.parent.children[
                node.parent.parent.children.indexOf(node.parent)
              ] =
                node.parent.children[1 - delete_me_idx];
              node.parent.children[1 - delete_me_idx].parent = node.parent.parent;
              nodes.splice(nodes.indexOf(node.parent), 1);
            } else {
              nodes.splice(0, 1);
              nodes.parent = null;
              delete nodes.data["attribute"];
              delete nodes.data["annotation"];
              delete nodes.data["original_child_order"];
              nodes.name = "root";
              nodes.data.name = "root";
            }
          }
        }
      }
    }

    return this;
  }

  /**
   * Get the tips of the tree
   * @returns {Array} Nodes in the current ``phylotree``.
   */
  function get_tips() {
    // get all nodes that have no nodes
    return _.filter(this.nodes.descendants(), n => {
      return !_.has(n, "children");
    });
  }

  /**
   * Get the internal nodes of the tree
   * @returns {Array} Nodes in the current ``phylotree``.
   */
  function get_internals() {
    // get all nodes that have no nodes
    return _.filter(this.nodes.descendants(), n => {
      return _.has(n, "children");
    });
  }


  /**
   * Get the root node.
   *
   * @returns the current root node of the ``phylotree``.
   */
  function get_root_node() {
    return this.nodes;
  }

  /**
   * Get an array of all nodes.
   * @returns {Array} Nodes in the current ``phylotree``.
   */
  function get_nodes() {
    return this.nodes;
  }

  /**
   * Get a node by name.
   *
   * @param {String} name Name of the desired node.
   * @returns {Node} Desired node.
   */
  function get_node_by_name(name) {
    return _.filter(this.nodes.descendants(), d => {
      return d.data.name == name;
    })[0];
  }

  /**
   * Add attributes to nodes. New attributes will be placed in the
   * ``annotations`` key of any nodes that are matched.
   *
   * @param {Object} attributes An object whose keys are the names of nodes
   * to modify, and whose values are the new attributes to add.
   */
  function assign_attributes(attributes) {
    //return nodes;
    // add annotations to each matching node
    _.each(this.nodes, function(d) {
      if (_.indexOf(_.keys(attributes), d.name) >= 0) {
        d["annotations"] = attributes[d.name];
      }
    });
  }

  /**
   * Determine if a given node is a leaf node.
   *
   * @param {Node} A node in a tree.
   * @returns {Bool} Whether or not the node is a leaf node.
   */
  function is_leafnode(node) {
    return !_.has(node, "children")
  }

  /**
   * Update a given key name in each node.
   *
   * @param {String} old_key The old key name.
   * @param {String} new_key The new key name.
   * @returns The current ``this``.
   */
  function update_key_name(old_key, new_key) {
    this.nodes.each(function(n) {
      if (old_key in n) {
        if (new_key) {
          n[new_key] = n[old_key];
        }
        delete n[old_key];
      }
    });

    return this;
  }

  function clear_internal_nodes(respect) {
    if (!respect) {
      this.nodes.each(d => {
        if (!is_leafnode(d)) {
          d[this.selection_attribute_name] = false;
        }
      });
    }
  }

  var node_operations = /*#__PURE__*/Object.freeze({
    __proto__: null,
    graft_a_node: graft_a_node,
    delete_a_node: delete_a_node,
    get_tips: get_tips,
    get_internals: get_internals,
    get_root_node: get_root_node,
    get_nodes: get_nodes,
    get_node_by_name: get_node_by_name,
    assign_attributes: assign_attributes,
    is_leafnode: is_leafnode,
    update_key_name: update_key_name,
    clear_internal_nodes: clear_internal_nodes
  });

  /**
   * Parses a Newick string into an equivalent JSON representation that is
   * suitable for consumption by ``hierarchy``.
   *
   * Optionally accepts bootstrap values. Currently supports Newick strings with or without branch lengths,
   * as well as tagged trees such as
   *  ``(a,(b{TAG},(c{TAG},d{ANOTHERTAG})))``
   *
   * @param {String} nwk_str - A string representing a phylogenetic tree in Newick format.
   * @param {Object} bootstrap_values.
   * @returns {Object} An object with keys ``json`` and ``error``.
   */

  function newick_parser(nwk_str, bootstrap_values, delimiter) {
    bootstrap_values = true;
    let left_delimiter = delimiter || '{',
      right_delimiter = left_delimiter == '{' ? '}' : ']';
    let clade_stack = [];

    function add_new_tree_level() {
      let new_level = {
        name: null
      };

      let the_parent = clade_stack[clade_stack.length - 1];

      if (!("children" in the_parent)) {
        the_parent["children"] = [];
      }

      clade_stack.push(new_level);

      the_parent["children"].push(clade_stack[clade_stack.length - 1]);

      clade_stack[clade_stack.length - 1]["original_child_order"] =
        the_parent["children"].length;
    }

    function finish_node_definition() {
      let this_node = clade_stack.pop();

      this_node["name"] = current_node_name;

      if (bootstrap_values && "children" in this_node) {
        this_node["bootstrap_values"] = current_node_name;
      } else {
        this_node["name"] = current_node_name;
      }

      this_node["attribute"] = current_node_attribute;
      this_node["annotation"] = current_node_annotation;

      current_node_name = "";
      current_node_attribute = "";
      current_node_annotation = "";
    }

    function generate_error(location) {
      return {
        json: null,
        error:
          "Unexpected '" +
          nwk_str[location] +
          "' in '" +
          nwk_str.substring(location - 20, location + 1) +
          "[ERROR HERE]" +
          nwk_str.substring(location + 1, location + 20) +
          "'"
      };
    }

    let automaton_state = 0;
    let current_node_name = "";
    let current_node_attribute = "";
    let current_node_annotation = "";
    let quote_delimiter = null;

    let name_quotes = {
      "'": 1,
      '"': 1
    };

    let tree_json = {
      name: "root"
    };

    clade_stack.push(tree_json);

    var space = /\s/;

    for (var char_index = 0; char_index < nwk_str.length; char_index++) {
      try {
        var current_char = nwk_str[char_index];
        switch (automaton_state) {
          case 0: {
            // look for the first opening parenthesis
            if (current_char == "(") {
              add_new_tree_level();
              automaton_state = 1; // expecting node name
            }
            break;
          }
          case 1: // name
          case 3: {
            // branch length
            // reading name
            if (current_char == ":") {
              automaton_state = 3;
            } else if (current_char == "," || current_char == ")") {
              try {
                finish_node_definition();
                automaton_state = 1;
                if (current_char == ",") {
                  add_new_tree_level();
                }
              } catch (e) {
                return generate_error(char_index);
              }
            } else if (current_char == "(") {
              if (current_node_name.length > 0) {
                return generate_error(char_index);
              } else {
                add_new_tree_level();
              }
            } else if (current_char in name_quotes) {
              if (
                automaton_state == 1 &&
                current_node_name.length === 0 &&
                current_node_attribute.length === 0 &&
                current_node_annotation.length === 0
              ) {
                automaton_state = 2;
                quote_delimiter = current_char;
                continue;
              }
              return generate_error(char_index);
            } else {
              if (current_char == left_delimiter) {
                if (current_node_annotation.length) {
                  return generate_error(char_index);
                } else {
                  automaton_state = 4;
                }
              } else {
                if (automaton_state == 3) {
                  current_node_attribute += current_char;
                } else {
                  if (space.test(current_char)) {
                    continue;
                  }
                  if (current_char == ";") {
                    // semicolon terminates tree definition
                    char_index = nwk_str.length;
                    break;
                  }
                  current_node_name += current_char;
                }
              }
            }

            break;
          }
          case 2: {
            // inside a quoted expression
            if (current_char == quote_delimiter) {
              if (char_index < nwk_str.length - 1) {
                if (nwk_str[char_index + 1] == quote_delimiter) {
                  char_index++;
                  current_node_name += quote_delimiter;
                  continue;
                }
              }
              quote_delimiter = 0;
              automaton_state = 1;
              continue;
            } else {
              current_node_name += current_char;
            }
            break;
          }
          case 4: {
            // inside a comment / attribute
            if (current_char == right_delimiter) {
              automaton_state = 3;
            } else {
              if (current_char == left_delimiter) {
                return generate_error(char_index);
              }
              current_node_annotation += current_char;
            }
            break;
          }
        }
      } catch (e) {
        return generate_error(char_index);
      }
    }

    if (clade_stack.length != 1) {
      return generate_error(nwk_str.length - 1);
    }

    return {
      json: tree_json,
      error: null
    };
  }

  /**
   * Return Newick string representation of a phylotree.
   *
   * @param {Function} annotator - Function to apply to each node, determining
   * what label is written (optional).
   * @returns {String} newick - Phylogenetic tree serialized as a Newick string.
   */

  // TODO: break this out into two seperate functions
  function get_newick(annotator) {

    let self = this;

    if (!annotator) annotator = d => d.data.name;

    function node_display(n) {
      if (!is_leafnode(n)) {
        element_array.push("(");
        n.children.forEach(function(d, i) {
          if (i) {
            element_array.push(",");
          }
          node_display(d);
        });
        element_array.push(")");
      }

      //element_array.push(escape_string(self.node_label(n)));
      element_array.push(annotator(n));

      let bl = self.branch_length_accessor(n);

      if (bl !== undefined) {
        element_array.push(":" + bl);
      }
    }

    let element_array = [];
    annotator = annotator || "";
    node_display(this.nodes);

    return element_array.join("")+";";

  }

  function parse_annotations (buf) {

    let str = buf;
    let index = str.toUpperCase().indexOf('BEGIN DATA;');
    let data = str.slice(index);

    if(data.length < 2) {
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
    matrix = matrix[0].split('\n');
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
  function load_annotations(tree, label, annotations) {

    // if filename, then load from filesystem
    _.each(tree.get_tips(), d => { d.data["test"] = annotations.matrix[d.data.name]; });

    // decorate nodes with annotations

  }

  function loadTree(buf) {

    // if filename, then load from filesystem
    // Parse first tree from NEXUS file and send to newick_parser

    // Make all upper case
    let str = buf;

    // Get TREE block
    let index = str.toUpperCase().indexOf('BEGIN TREES;');
    let split = str.slice(index);

    if(split.length < 2) {
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

  var nexus = /*#__PURE__*/Object.freeze({
    __proto__: null,
    parse_annotations: parse_annotations,
    load_annotations: load_annotations,
    'default': loadTree
  });

  // Changes XML to JSON
  // Modified version from here: http://davidwalsh.name/convert-xml-json
  function xmlToJson(xml) {

  	// Create the return object
  	var obj = {};

  	if (xml.nodeType == 1) { // element
  		// do attributes
  		if (xml.attributes.length > 0) {
  		obj["@attributes"] = {};
  			for (var j = 0; j < xml.attributes.length; j++) {
  				var attribute = xml.attributes.item(j);
  				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
  			}
  		}
  	} else if (xml.nodeType == 3) { // text
  		obj = xml.nodeValue;
  	}

  	// do children
  	// If just one text node inside
  	if (xml.hasChildNodes() && xml.childNodes.length === 1 && xml.childNodes[0].nodeType === 3) {
  		obj = xml.childNodes[0].nodeValue;
  	}
  	else if (xml.hasChildNodes()) {
  		for(var i = 0; i < xml.childNodes.length; i++) {
  			var item = xml.childNodes.item(i);
  			var nodeName = item.nodeName;
  			if (typeof(obj[nodeName]) == "undefined") {
  				obj[nodeName] = xmlToJson(item);
  			} else {
  				if (typeof(obj[nodeName].push) == "undefined") {
  					var old = obj[nodeName];
  					obj[nodeName] = [];
  					obj[nodeName].push(old);
  				}
  				obj[nodeName].push(xmlToJson(item));
  			}
  		}
  	}
  	return obj;
  }

  var phyloxml_parser = function(xml, options) {

    function parse_phyloxml(node, index) {
      if (node.clade) {
        node.clade.forEach(parse_phyloxml);
        node.children = node.clade;
        delete node.clade;
      }

  		node.annotation = 1;
  		node.attribute = "0.01";
      if (node.branch_length) {
  			node.attribute = node.branch_length;
      }
      if (node.taxonomy) {
        node.name = node.taxonomy.scientific_name;
      }

      node.annotation = "";

    }

    var tree_json;

    xml = xmlToJson(xml);
    tree_json = xml.phyloxml.phylogeny.clade;
    tree_json.name = "root";
    parse_phyloxml(tree_json);

    return {
      json: tree_json,
      error: null
    };
  };

  function beast_parser(newick) {
    const parsed_newick = newick_parser(newick, null, '[');
    function parse_beast_node(node) {
      if(node.annotation) {
        node.beast = {};
        const tokens = node.annotation.split(/=|,|{|}/)
          .filter(token => token);
        for(var i = 0; i < tokens.length; i+=2) {
          let key = tokens[i].replace(/&|%/g, '');
          if(/[a-df-zA-DF-Z]+/.test(tokens[i+2])) {
            node.beast[key] = +tokens[i+1];
          } else {
            node.beast[key] = [+tokens[i+1], +tokens[i+2]];
            i++;
          }
        }
      }
      node.annotation = undefined;
      if(node.children) {
        node.children.forEach(parse_beast_node);
      }
    }
    parse_beast_node(parsed_newick.json);
    return parsed_newick;
  }

  /* 
   * A parser must have two fields, the object and
   * options
   */
  var format_registry = {
    nexml: nexml_parser,
    phyloxml: phyloxml_parser,
    nexus : loadTree,
    nwk: newick_parser,
    beast: beast_parser
  };

  function max_parsimony(respect_existing, attr_name) {

    function populate_mp_matrix(d, attr_name) {

      d.mp = [
        [0, 0], // score for parent selected / not selected
        [false, false]
      ]; // selected or not

      if (is_leafnode(d)) {

        d.mp[1][0] = d.mp[1][1] = d.data.trait == attr_name || false;
        d.mp[0][0] = d.mp[1][0] ? 1 : 0;
        d.mp[0][1] = 1 - d.mp[0][0];

      } else {

        d.children.forEach(pop_mp_mat);

        var s0 = d.children.reduce(function(p, n) {
          return n.mp[0][0] + p;
        }, 0);

        // cumulative children score if this node is 0
        var s1 = d.children.reduce(function(p, n) {
          return n.mp[0][1] + p;
        }, 0);

        // cumulative children score if this node is 1
        // parent = 0

        if (d.data.trait == attr_name) {
          // respect selected
          d.mp[0][0] = s1 + 1;
          d.mp[1][0] = true;
          d.mp[0][1] = s1;
          d.mp[1][1] = true;
        } else {
          if (s0 < s1 + 1) {
            d.mp[0][0] = s0;
            d.mp[1][0] = false;
          } else {
            d.mp[0][0] = s1 + 1;
            d.mp[1][0] = true;
          }

          // parent = 1

          if (s1 < s0 + 1) {
            d.mp[0][1] = s1;
            d.mp[1][1] = true;
          } else {
            d.mp[0][1] = s0 + 1;
            d.mp[1][1] = false;
          }
        }
      }
    }

    const pop_mp_mat = _.partial(populate_mp_matrix, _, attr_name);
    pop_mp_mat(this.nodes);

    this.nodes.each(d => {
      if (d.parent) {
        d.mp = d.mp[1][d.parent.mp ? 1 : 0];
      } else {
        d.mp = d.mp[1][d.mp[0][0] < d.mp[0][1] ? 0 : 1];
      }
      if(d.mp) d.data.trait = attr_name;
    });

    //this.display.modify_selection((d, callback) => {
    //  if (is_leafnode(d.target)) {
    //    return d.target[this.selection_attribute_name];
    //  }
    //  return d.target.mp;
    //});

  }

  function postOrder(node, callback, backtrack) {

    let nodes = [node],
      next = [],
      children,
      i,
      n;

    while ((node = nodes.pop())) {
      if (!(backtrack && backtrack(node))) {
        next.push(node), (children = node.children);
        if (children)
          for (i = 0, n = children.length; i < n; ++i) {
            nodes.push(children[i]);
          }
      }
    }

    while ((node = next.pop())) {
      callback(node);
    }

    return node;

  }

  function preOrder(node, callback, backtrack) {
    let nodes = [node],
      children,
      i;

    while ((node = nodes.pop())) {
      if (!(backtrack && backtrack(node))) {
        callback(node), (children = node.children);
        if (children)
          for (i = children.length - 1; i >= 0; --i) {
            nodes.push(children[i]);
          }
      }
    }

    return node;
  }

  function inOrder(node, callback, backtrack) {
    let current,
      next = [node],
      children,
      i,
      n;

    do {
      (current = next.reverse()), (next = []);
      while ((node = current.pop())) {
        if (!(backtrack && backtrack(node))) {
          callback(node), (children = node.children);
          if (children)
            for (i = 0, n = children.length; i < n; ++i) {
              next.push(children[i]);
            }
        }
      }
    } while (next.length);

    return node;
  }

  /**
   * Traverses a tree that represents left-child right-sibling
   * @param {Object} tree -- the phylotree.js tree object 
   * @return {Object} An edge list that represents the original multi-way tree
   *
   */
  function leftChildRightSibling(root) {

    let declareTrueParent = function(n) {

      if(n.children) {
        // left child is the child
        n.children[0].data.multiway_parent = n;

        // right child is the sibling
        n.children[1].data.multiway_parent = n.parent;
      }

    };

    // First decorate each node with its true parent node
    postOrder(root, declareTrueParent);

    // return edge list
    let edge_list = _$1.map(root.descendants(), n => { 

      let source = n.data.multiway_parent; 
      let name = "unknown";

      if(source) {
        name = source.data.name;
      }

      // In order to get the true name of the infector/infectee, we must traverse
      // the tree from the multiway_parents node.

      return {"source" : n.data.multiway_parent, "target" : n } });

    // Construct edge list by new parent-child listing
    return edge_list;

  }

  /**
   * Returns T/F whether every branch in the tree has a branch length
   *
   * @returns {Object} true if  every branch in the tree has a branch length
   */
  function has_branch_lengths() {

    let bl = this.branch_length;

    if (bl) {
      return _.every(this.nodes.descendants(), function(node) {
        return !node.parent || !_.isUndefined(bl(node));
      });
    }

    return false;
  }

  /**
   * Returns T/F whether every branch in the tree has a branch length
   *
   * @returns {Object} true if  every branch in the tree has a branch length
   */
  function get_branch_lengths() {

    let bl = this.branch_length;
    return _.map(this.nodes.descendants(), node => { return bl(node)});

  }


  function def_branch_length_accessor(_node, new_length) {

    let _node_data = _node.data;

    if (
      "attribute" in _node_data &&
      _node_data["attribute"] &&
      _node_data["attribute"].length
    ) {

      if(new_length > 0) {
        _node_data["attribute"] = String(new_length);
      }

      let bl = parseFloat(_node_data["attribute"]);
      if (!isNaN(bl)) {
        return Math.max(0, bl);
      }

    }

    return undefined;

  }

  /**
   * Get or set branch length accessor.
   *
   * @param {Function} attr Empty if getting, or new branch length accessor if setting.
   * @returns {Object} The branch length accessor if getting, or the current this if setting.
   */
  function set_branch_length(attr) {
    if (!arguments.length) return this.branch_length_accessor;
    this.branch_length_accessor = attr ? attr : def_branch_length_accessor;
    return this;
  }

  /**
   * Normalizes branch lengths
   */
  function normalize(attr) {

    let bl = this.branch_length;

    let branch_lengths = _.map(this.nodes.descendants(), function(node) {
      if(bl(node)) {
      return bl(node);
      } else {
        return null;
      }
    });

    const max_bl = _.max(branch_lengths);
    const min_bl = _.min(branch_lengths);

    let scaler = function (x) {
      return (x - min_bl)/(max_bl - min_bl);
    };

    _.each(this.nodes.descendants(), (node) => {
        let len = bl(node);
        if(len) {
          bl(node, scaler(len));
        }     
    });

    return this;

  }


  /**
   * Scales branch lengths
   *
   * @param {Function} function that scales the branches
   */
  function scale(scale_by) {

    let bl = this.branch_length;

    _.each(this.nodes.descendants(), (node) => {
        let len = bl(node);
        if(len) {
          bl(node, scale_by(len));
        }     
    });

    return this;

  }

  /**
   * Get or set branch name accessor.
   *
   * @param {Function} attr (Optional) If setting, a function that accesses a branch name
   * from a node.
   * @returns The ``node_label`` accessor if getting, or the current ``this`` if setting.
   */
  function branch_name(attr) {
    if (!arguments.length) return this.node_label;
    this.node_label = attr ? attr : def_node_label;
    return this;
  }

  /**
  * Reroot the tree on the given node.
  *
  * @param {Node} node Node to reroot on.
  * @param {fraction} if specified, partition the branch not into 0.5 : 0.5, but according to 
                     the specified fraction
                     
  * @returns {Phylotree} The current ``phylotree``.
  */
  function reroot(node, fraction) {

    /** TODO add the option to root in the middle of a branch */

    let nodes = this.nodes.descendants();

    fraction = fraction !== undefined ? fraction : 0.5;

    if (node.parent) {

      var new_json = d3.hierarchy({
        name: "new_root",
        //__mapped_bl: undefined,
        "children": [{
            name : node.data.name
        }]
      });
      
      _.extendOwn (new_json.children[0], node);
      new_json.children[0].parent = new_json;

      nodes.forEach(n => {
        n.__mapped_bl = this.branch_length_accessor(n);
        n.data.__mapped_bl = this.branch_length_accessor(n);
      });

      this.set_branch_length(function(n) {
        return n.__mapped_bl || n.data.__mapped_bl;
      });


      let remove_me = node,
        current_node = node.parent,
        stashed_bl = _.noop();

      let apportioned_bl =
        node.data.__mapped_bl === undefined ? undefined : node.data.__mapped_bl * fraction;

      stashed_bl = current_node.data.__mapped_bl;

      current_node.data.__mapped_bl =
        node.data.__mapped_bl === undefined
          ? undefined
          : node.__mapped_bl - apportioned_bl;

      node.data._mapped_bl = apportioned_bl;

      var remove_idx;

      if (current_node.parent) {

        new_json.children.push(current_node);

        while (current_node.parent) {
          remove_idx = current_node.children.indexOf(remove_me);
          if (current_node.parent.parent) {
            current_node.children.splice(remove_idx, 1, current_node.parent);
          } else {
            current_node.children.splice(remove_idx, 1);
          }

          let t = current_node.parent.data.__mapped_bl;

          if (t !== undefined) {
            current_node.parent.data.__mapped_bl = stashed_bl;
            stashed_bl = t;
          }
          remove_me = current_node;
          current_node = current_node.parent;
        }
        remove_idx = current_node.children.indexOf(remove_me);
        current_node.children.splice(remove_idx, 1);
      } else {
        remove_idx = current_node.children.indexOf(remove_me);
        current_node.children.splice(remove_idx, 1);
        stashed_bl = current_node.data.__mapped_bl;
        remove_me = new_json;
      }

      // current_node is now old root, and remove_me is the root child we came up
      // the tree through
      if (current_node.children.length == 1) {
        if (stashed_bl) {
          current_node.children[0].data.__mapped_bl += stashed_bl;
        }
        remove_me.children = remove_me.children.concat(current_node.children);
      } else {
        let new_node = new d3.hierarchy({ name: "__reroot_top_clade", __mapped_bl: stashed_bl });
        _.extendOwn (new_json.children[0], node);
        new_node.data.__mapped_bl = stashed_bl;
        new_node.children = current_node.children.map(function(n) {
          n.parent = new_node;
          return n;
        });
        new_node.parent = remove_me;
        remove_me.children.push(new_node);
       }

    }
    
    // need to traverse the nodes and update parents
    this.update(new_json);

    this.traverse_and_compute(n => {
      _.each (n.children, (c) => {c.parent = n;});
    }, "pre-order");

  	if(!_.isUndefined(this.display)) {
  		// get container
  		let container = this.display.container;
  		let options = this.display.options;
  		// get options
  		delete this.display;
    	this.render(container, options);
  	}

    return this;

  }

  function rootpath(attr_name, store_name) {
    attr_name = attr_name || "attribute";
    store_name = store_name || "y_scaled";

    if ("parent" in this) {
      let my_value = parseFloat(this[attr_name]);

      this[store_name] =
        this.parent[store_name] + (isNaN(my_value) ? 0.1 : my_value);
    } else {
      this[store_name] = 0.0;
    }

    return this[store_name];
  }

  function path_to_root(node) {
    let selection = [];
    while (node) {
      selection.push(node);
      node = node.parent;
    }
    return selection;
  }

  var rooting = /*#__PURE__*/Object.freeze({
    __proto__: null,
    reroot: reroot,
    rootpath: rootpath,
    path_to_root: path_to_root
  });

  function x_coord(d) {
    return d.y;
  }

  function y_coord(d) {
    return d.x;
  }

  function radial_mapper(r, a, radial_center) {
    return {
      x: radial_center + r * Math.sin(a),
      y: radial_center + r * Math.cos(a)
    };
  }

  function cartesian_to_polar(
    node,
    radius,
    radial_root_offset,
    radial_center,
    scales,
    size
  ) {
    node.radius = radius * (node.radius + radial_root_offset);

    //if (!node.angle) {
    node.angle = 2 * Math.PI * node.x * scales[0] / size[0];
    //}

    let radial = radial_mapper(node.radius, node.angle, radial_center);

    node.x = radial.x;
    node.y = radial.y;

    return node;
  }

  function draw_arc(points, radial_center) {
    var start = radial_mapper(points[0].radius, points[0].angle, radial_center),
      end = radial_mapper(points[0].radius, points[1].angle, radial_center);

    return (
      "M " +
      x_coord(start) +
      "," +
      y_coord(start) +
      " A " +
      points[0].radius +
      "," +
      points[0].radius +
      " 0,0, " +
      (points[1].angle > points[0].angle ? 1 : 0) +
      " " +
      x_coord(end) +
      "," +
      y_coord(end) +
      " L " +
      x_coord(points[1]) +
      "," +
      y_coord(points[1])
    );
  }

  function arc_segment_placer(edge, where, radial_center) {
    var r = radial_mapper(
      edge.target.radius + (edge.source.radius - edge.target.radius) * where,
      edge.target.angle,
      radial_center
    );
    return { x: x_coord(r), y: y_coord(r) };
  }

  var draw_line = d3.line()
    .x(function(d) {
      return x_coord(d);
    })
    .y(function(d) {
      return y_coord(d);
    })
    .curve(d3.curveStepBefore);

  function line_segment_placer(edge, where) {
    return {
      x:
        x_coord(edge.target) +
        (x_coord(edge.source) - x_coord(edge.target)) * where,
      y: y_coord(edge.target)
    };
  }

  function item_tagged(item) {
    return item.tag || false;
  }

  function item_selected(item, tag) {
    return item[tag] || false;
  }

  const css_classes = {
    "tree-container": "phylotree-container",
    "tree-scale-bar": "tree-scale-bar",
    node: "node",
    "internal-node": "internal-node",
    "tagged-node": "node-tagged",
    "selected-node": "node-selected",
    "collapsed-node": "node-collapsed",
    "root-node": "root-node",
    branch: "branch",
    "selected-branch": "branch-selected",
    "tagged-branch": "branch-tagged",
    "tree-selection-brush": "tree-selection-brush",
    "branch-tracer": "branch-tracer",
    clade: "clade",
    node_text: "phylotree-node-text"
  };

  function internal_names(attr) {
    if (!arguments.length) return this.options["internal-names"];
    this.options["internal-names"] = attr;
    return this;
  }

  function radial(attr) {
    if (!arguments.length) return this.options["is-radial"];
    this.options["is-radial"] = attr;
    return this;
  }

  function align_tips(attr) {
    if (!arguments.length) return this.options["align-tips"];
    this.options["align-tips"] = attr;
    return this;
  }

  /**
   * Return the bubble size of the current node.
   *
   * @param {Node} A node in the phylotree.
   * @returns {Float} The size of the bubble associated to this node.
   */
  function node_bubble_size(node) {

    return this.options["draw-size-bubbles"]
      ? this.relative_node_span(node) * this.scales[0] * 0.25
      : 0;
  }

  function shift_tip(d) {
    if (this.options["is-radial"]) {
      return [
        (d.text_align == "end" ? -1 : 1) *
          (this.radius_pad_for_bubbles - d.radius),
        0
      ];
    }
    if (this.options["right-to-left"]) {
      return [this.right_most_leaf - d.screen_x, 0];
    }
    return [this.right_most_leaf - d.screen_x, 0];
  }

  function layout_handler(attr) {
    if (!arguments.length) return this.layout_listener_handler;
    this.layout_listener_handler = attr;
    return this;
  }

  /**
   * Getter/setter for the selection label. Useful when allowing
   * users to make multiple selections.
   *
   * @param {String} attr (Optional) If setting, the new selection label.
   * @returns The current selection label if getting, or the current ``phylotree`` if setting.
   */
  function selection_label(attr) {
    if (!arguments.length) return this.selection_attribute_name;
    this.selection_attribute_name = attr;
    this.sync_edge_labels();
    return this;
  }

  /**
   * Get or set the current node span. If setting, the argument should
   * be a function of a node which returns a number, so that node spans
   * can be determined dynamically. Alternatively, the argument can be the
   * string ``"equal"``, to give all nodes an equal span.
   *
   * @param {Function} attr Optional; if setting, the node_span function.
   * @returns The ``node_span`` if getting, or the current ``phylotree`` if setting.
   */
  function node_span(attr) {
    if (!arguments.length) return node_span;
    if (typeof attr == "string" && attr == "equal") {
      node_span = function(d) {
        return 1;
      };
    } else {
      node_span = attr;
    }
    return phylotree;
  }

  // List of all selecters that can be used with the restricted-selectable option
  var predefined_selecters = {
    all: d => {
      return true;
    },
    none: d => {
      return false;
    },
    "all-leaf-nodes": d => {
      return is_leafnode(d.target);
    },
    "all-internal-nodes": d => {
      return !is_leafnode(d.target);
    }
  };

  /**
   * Getter/setter for the selection callback. This function is called
   * every time the current selection is modified, and its argument is
   * an array of nodes that make up the current selection.
   *
   * @param {Function} callback (Optional) The selection callback function.
   * @returns The current ``selection_callback`` if getting, or the current ``this`` if setting.
   */
  function selection_callback(callback) {
    if (!callback) return this.selection_callback;
    this.selection_callback = callback;
    return this;
  }

  var opt = /*#__PURE__*/Object.freeze({
    __proto__: null,
    css_classes: css_classes,
    internal_names: internal_names,
    radial: radial,
    align_tips: align_tips,
    node_bubble_size: node_bubble_size,
    shift_tip: shift_tip,
    layout_handler: layout_handler,
    selection_label: selection_label,
    get node_span () { return node_span; },
    predefined_selecters: predefined_selecters,
    selection_callback: selection_callback
  });

  function shift_tip$1(d) {

    if (this.radial()) {
      return [
        (d.text_align == "end" ? -1 : 1) *
          (this.radius_pad_for_bubbles - d.radius),
        0
      ];
    }

    if (this.options["right-to-left"]) {
      return [this.right_most_leaf - d.screen_x, 0];
    }

    return [this.right_most_leaf - d.screen_x, 0];

  }

  function draw_node(container, node, transitions) {

    container = d3.select(container);
    var is_leaf = is_leafnode(node);

    if (is_leaf) {
      container = container.attr("data-node-name", node.data.name);
    }

    let labels = container.selectAll("text").data([node]),
      tracers = container.selectAll("line");

    if (is_leaf || (this.show_internal_name(node) && !is_node_collapsed(node))) {

      labels = labels
        .enter()
        .append("text")
        .classed(this.css_classes["node_text"], true)
        .merge(labels)
        .on("click", this.handle_node_click)
        .attr("dy", d => {
          return this.shown_font_size * 0.33;
        })
        .text(d => {
          return this.options["show-labels"] ? this._node_label(d) : "";
        })
        .style("font-size", d => {
          return this.ensure_size_is_in_px(this.shown_font_size);
        });

      if (this.radial()) {
        labels = labels
          .attr("transform", d => {
            return (
              this.d3_phylotree_svg_rotate(d.text_angle) +
              this.d3_phylotree_svg_translate(
                this.align_tips() ? this.shift_tip(d) : null
              )
            );
          })
          .attr("text-anchor", d => {
            return d.text_align;
          });
      } else {
        labels = labels.attr("text-anchor", "start").attr("transform", d => {
          if (this.options["layout"] == "right-to-left") {
            return this.d3_phylotree_svg_translate([-20, 0]);
          }
          return this.d3_phylotree_svg_translate(
            this.align_tips() ? this.shift_tip(d) : null
          );
        });
      }

      if (this.align_tips()) {
        tracers = tracers.data([node]);

        if (transitions) {
          tracers = tracers
            .enter()
            .append("line")
            .classed(this.css_classes["branch-tracer"], true)
            .merge(tracers)
            .attr("x1", d => {
              return (
                (d.text_align == "end" ? -1 : 1) * this.node_bubble_size(node)
              );
            })
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", 0)
            .attr("x2", d => {
              if (this.options["layout"] == "right-to-left") {
                return d.screen_x;
              }

              return this.shift_tip(d)[0];
            })
            .attr("transform", d => {
              return this.d3_phylotree_svg_rotate(d.text_angle);
            })
            .attr("x2", d => {
              if (this.options["layout"] == "right-to-left") {
                return d.screen_x;
              }
              return this.shift_tip(d)[0];
            })
            .attr("transform", d => {
              return this.d3_phylotree_svg_rotate(d.text_angle);
            });
        } else {
          tracers = tracers
            .enter()
            .append("line")
            .classed(this.css_classes["branch-tracer"], true)
            .merge(tracers)
            .attr("x1", d => {
              return (
                (d.text_align == "end" ? -1 : 1) * this.node_bubble_size(node)
              );
            })
            .attr("y2", 0)
            .attr("y1", 0)
            .attr("x2", d => {
              return this.shift_tip(d)[0];
            });
          tracers.attr("transform", d => {
            return this.d3_phylotree_svg_rotate(d.text_angle);
          });
        }
      } else {
        tracers.remove();
      }

      if (this.options["draw-size-bubbles"]) {

        var shift = this.node_bubble_size(node);

        let circles = container
          .selectAll("circle")
          .data([shift])
          .enter()
          .append("circle");

        circles.attr("r", function(d) {
          return d;
        });

        if (this.shown_font_size >= 5) {
          labels = labels.attr("dx", d => {
            return (
              (d.text_align == "end" ? -1 : 1) *
              ((this.align_tips() ? 0 : shift) + this.shown_font_size * 0.33)
            );
          });
        }
      } else {
        if (this.shown_font_size >= 5) {
          labels = labels.attr("dx", d => {
            return (d.text_align == "end" ? -1 : 1) * this.shown_font_size * 0.33;
          });
        }
      }
    }

    if (!is_leaf) {
      let circles = container
          .selectAll("circle")
          .data([node])
          .enter()
          .append("circle"),
        radius = this.node_circle_size()(node);

      if (radius > 0) {
        circles
          .merge(circles)
          .attr("r", d => {
            return Math.min(this.shown_font_size * 0.75, radius);
          })
          .on("click", d => {
            this.handle_node_click(d);
          });
      } else {
        circles.remove();
      }
    }

    if (this.node_styler) {
      this.node_styler(container, node);
    }

    return node;
  }

  function update_has_hidden_nodes() {
    let nodes = this.phylotree.nodes.descendants();

    for (let k = nodes.length - 1; k >= 0; k -= 1) {
      if (is_leafnode(nodes[k])) {
        nodes[k].has_hidden_nodes = nodes[k].notshown;
      } else {
        nodes[k].has_hidden_nodes = nodes[k].children.reduce(function(p, c) {
          return c.notshown || p;
        }, false);
      }
    }

    return this;
  }

  function show_internal_name(node) {

    const i_names = this.internal_names();

    if (i_names) {
      if (typeof i_names === "function") {
        return i_names(node);
      }
      return i_names;
    }

    return false;
  }

  /**
   * Get or set the current node span. If setting, the argument should
   * be a function of a node which returns a number, so that node spans
   * can be determined dynamically. Alternatively, the argument can be the
   * string ``"equal"``, to give all nodes an equal span.
   *
   * @param {Function} attr Optional; if setting, the node_span function.
   * @returns The ``node_span`` if getting, or the current ``phylotree`` if setting.
   */
  function node_span$1(attr) {
    if (!arguments.length) return this.node_span;
    if (typeof attr == "string" && attr == "equal") {
      this.node_span = function(d) {
        return 1;
      };
    } else {
      this.node_span = attr;
    }
    return this;
  }

  function reclass_node(node) {

    let class_var = css_classes[is_leafnode(node) ? "node" : "internal-node"];

    if (item_tagged(node)) {
      class_var += " " + css_classes["tagged-node"];
    }

    if (item_selected(node, this.selection_attribute_name)) {
      class_var += " " + css_classes["selected-node"];
    }

    if (!node["parent"]) {
      class_var += " " + css_classes["root-node"];
    }

    if (is_node_collapsed(node) || has_hidden_nodes(node)) {
      class_var += " " + css_classes["collapsed-node"];
    }

    return class_var;
  }

  function node_visible(node) {
    return !(node.hidden || node.notshown || false);
  }

  function node_notshown(node) {
    return node.notshown;
  }

  function has_hidden_nodes(node) {
    return node.has_hidden_nodes || false;
  }

  function is_node_collapsed(node) {
    return node.collapsed || false;
  }

  function node_css_selectors(css_classes) {
    return [
      css_classes["node"],
      css_classes["internal-node"],
      css_classes["collapsed-node"],
      css_classes["tagged-node"],
      css_classes["root-node"]
    ].reduce(function(p, c, i, a) {
      return (p += "g." + c + (i < a.length - 1 ? "," : ""));
    }, "");
  }

  function internal_label(callback, respect_existing) {

    this.phylotree.clear_internal_nodes(respect_existing);

    for (var i = self.nodes.length - 1; i >= 0; i--) {
      var d = self.nodes[i];
      if (!(is_leafnode(d) || item_selected(d, selection_attribute_name))) {
        d[selection_attribute_name] = callback(d.children);
      }
    }

    this.modify_selection(function(d, callback) {
      if (is_leafnode(d.target)) {
        return d.target[selection_attribute_name];
      }
      return d.target[selection_attribute_name];
    });
  }

  function def_node_label$1(_node) {

    _node = _node.data;

    if (is_leafnode(_node)) {
      return _node.name || "";
    }

    if (this.show_internal_name(_node)) {
      return _node.name;
    }

    return "";

  }

  /**
   * Get or set node_label accessor.
   *
   * @param {Function} attr (Optional) If setting, a function that accesses a branch name
   * from a node.
   * @returns The ``node_label`` accessor if getting, or the current ``this`` if setting.
   */
  function node_label(attr) {
    if (!arguments.length) return this._node_label;
    this._node_label = attr ? attr : def_node_label$1;
  	this.update();
    return this;
  }

  var render_nodes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    shift_tip: shift_tip$1,
    draw_node: draw_node,
    update_has_hidden_nodes: update_has_hidden_nodes,
    show_internal_name: show_internal_name,
    node_span: node_span$1,
    reclass_node: reclass_node,
    node_visible: node_visible,
    node_notshown: node_notshown,
    has_hidden_nodes: has_hidden_nodes,
    is_node_collapsed: is_node_collapsed,
    node_css_selectors: node_css_selectors,
    internal_label: internal_label,
    def_node_label: def_node_label$1,
    node_label: node_label
  });

  function clade_css_selectors(css_classes) {
    return [css_classes["clade"]].reduce(function(p, c, i, a) {
      return (p += "path." + c + (i < a.length - 1 ? "," : ""));
    }, "");
  }

  function update_collapsed_clades(transitions) {
    let enclosure = this.svg.selectAll("." + this.css_classes["tree-container"]);

    let collapsed_clades = enclosure
      .selectAll(clade_css_selectors(this.css_classes))
      .data(
        this.phylotree.nodes.descendants().filter(is_node_collapsed),
        function(d) {
          return d.id || (d.id = ++node_id);
        }
      );

    let spline = function() {};
    let spline_f = _.noop();

    // Collapse radial differently
    if (this.radial()) {
      spline = d3.line()
        .curve(d3.curveBasis)
        .y(function(d) {
          return d[0];
        })
        .x(function(d) {
          return d[1];
        });

      spline_f = function(coord, i, d, init_0, init_1) {
        if (i) {
          return [
            d.screen_y + (coord[0] - init_0) / 50,
            d.screen_x + (coord[1] - init_1) / 50
          ];
        } else {
          return [d.screen_y, d.screen_x];
        }
      };
    } else {
      spline = d3.line()
        .curve(d3.curveBasis)
        .y(function(d) {
          return d[0];
        })
        .x(function(d) {
          return d[1];
        });

      spline_f = function(coord, i, d, init_0, init_1) {
        if (i) {
          return [
            d.screen_y + (coord[0] - init_0) / 50,
            d.screen_x + (coord[1] - init_1) / 50
          ];
        } else {
          return [d.screen_y, d.screen_x];
        }
      };
    }

    collapsed_clades
      .exit()
      .each(function(d) {
        d.collapsed_clade = null;
      })
      .remove();

    if (transitions) {
      collapsed_clades
        .enter()
        .insert("path", ":first-child")
        .attr("class", this.css_classes["clade"])
        .merge(collapsed_clades)
        .attr("d", function(d) {
          if (d.collapsed_clade) {
            return d.collapsed_clade;
          }

          let init_0 = d.collapsed[0][0];
          let init_1 = d.collapsed[0][1];

          // #1 return spline(d.collapsed.map(spline_f, d, init_0, init_1));
          return spline(
            d.collapsed.map(function(coord, i) {
              return spline_f(coord, i, d, init_0, init_1);
            })
          );
        })
        .attr("d", function(d) {
          return (d.collapsed_clade = spline(d.collapsed));
        });
    } else {
      collapsed_clades
        .enter()
        .insert("path", ":first-child")
        .attr("class", this.css_classes["clade"])
        .merge(collapsed_clades)
        .attr("d", function(d) {
          return (d.collapsed_clade = spline(d.collapsed));
        });
    }
  }

  var clades = /*#__PURE__*/Object.freeze({
    __proto__: null,
    clade_css_selectors: clade_css_selectors,
    update_collapsed_clades: update_collapsed_clades
  });

  function draw_edge(container, edge, transition) {

    container = d3.select(container);

    container = container
      .attr("class", d => {
        return this.reclass_edge(d);
      })
      .on("click", d => {
        this.modify_selection([d.target], this.selection_attribute_name);

        //console.log("click called, this", this, d);
        if (this.selection_callback) {
          this.selection_callback(this, d.target);
        }
      });

    let new_branch_path = this.draw_branch([edge.source, edge.target]);

    if (transition) {

      if (container.datum().existing_path) {
        container = container.attr("d", function(d) {
          return d.existing_path;
        });
      }

      container = container.attr("d", new_branch_path);

    } else {
      container = container.attr("d", new_branch_path);
    }

    edge.existing_path = new_branch_path;

    var bl = this.phylotree.branch_length_accessor(edge.target);

    if (bl !== undefined) {
      var haz_title = container.selectAll("title");

      if (haz_title.empty()) {
        haz_title = container.append("title");
      }
      haz_title.text("Length = " + bl);
    } else {
      container.selectAll("title").remove();
    }

    if (this.edge_styler) {
      this.edge_styler(container, edge, transition);
    }

    return this.phylotree;

  }

  function reclass_edge(edge) {

    let class_var = css_classes["branch"];

    if (item_tagged(edge)) {
      class_var += " " + css_classes["tagged-branch"];
    }

    if (item_selected(edge, this.selection_attribute_name)) {
      class_var += " " + css_classes["selected-branch"];
    }

    return class_var;

  }

  function sync_edge_labels() {

    this.phylotree.links.forEach(d => {
      d[this.selection_attribute_name] =
        d.target[this.selection_attribute_name] || false;
      d.tag = d.target.tag || false;
    });

    if (this.count_handler()) {

      let counts = {};

      counts[
        this.selection_attribute_name
      ] = this.phylotree.links.reduce((p, c) => {
        return p + (c[this.selection_attribute_name] ? 1 : 0);
      }, 0);

      counts["tagged"] = this.phylotree.links.reduce(function(p, c) {
        return p + (item_tagged(c) ? 1 : 0);
      }, 0);

      this.count_update(this, counts, this.count_handler());

    }

  }

  function edge_visible(edge) {
    return !(edge.target.hidden || edge.target.notshown || false);
  }

  function edge_css_selectors(css_classes) {
    return [
      css_classes["branch"],
      css_classes["selected-branch"],
      css_classes["tagged-branch"]
    ].reduce(function(p, c, i, a) {
      return (p += "path." + c + (i < a.length - 1 ? "," : ""));
    }, "");
  }

  function place_along_an_edge (e, where) {
      return this.edge_placer (e, where);
  }

  var render_edges = /*#__PURE__*/Object.freeze({
    __proto__: null,
    draw_edge: draw_edge,
    reclass_edge: reclass_edge,
    sync_edge_labels: sync_edge_labels,
    edge_visible: edge_visible,
    edge_css_selectors: edge_css_selectors,
    place_along_an_edge: place_along_an_edge
  });

  let d3_layout_phylotree_event_id = "phylotree.event";

  /**
   * Toggle collapsed view of a given node. Either collapses a clade into
   * a smaller blob for viewing large trees, or expands a node that was
   * previously collapsed.
   *
   * @param {Node} node The node to toggle.
   * @returns {Phylotree} The current ``phylotree``.
   */
  function toggle_collapse(node) {
    if (node.collapsed) {
      node.collapsed = false;

      let unhide = function(n) {
        if (!is_leafnode(n)) {
          if (!n.collapsed) {
            n.children.forEach(unhide);
          }
        }
        n.hidden = false;
      };

      unhide(node);
    } else {
      node.collapsed = true;
    }

    this.placenodes();
    return this;
  }

  function resize_svg(tree, svg, tr) {

    let sizes = this.size;

    if (this.radial()) {
      let pad_radius = this.pad_width(),
        vertical_offset =
          this.options["top-bottom-spacing"] != "fit-to-size"
            ? this.pad_height()
            : 0;

      sizes = [
        sizes[1] + 2 * pad_radius,
        sizes[0] + 2 * pad_radius + vertical_offset
      ];

      if (svg) {
        svg
          .selectAll("." + css_classes["tree-container"])
          .attr(
            "transform",
            "translate (" +
              pad_radius +
              "," +
              (pad_radius + vertical_offset) +
              ")"
          );
      }
    } else {

      sizes = [
        sizes[0] +
          (this.options["top-bottom-spacing"] != "fit-to-size"
            ? this.pad_height()
            : 0),
        sizes[1] +
          (this.options["left-right-spacing"] != "fit-to-size"
            ? this.pad_width()
            : 0)
      ];

    }


    if (svg) {

      if (tr) {
        svg = svg.transition(100);
      }

      svg.attr("height", sizes[0]).attr("width", sizes[1]);

    }

    this.size = sizes;

    return sizes;

  }

  function rescale(scale, attr_name) {
    attr_name = attr_name || "y_scaled";
    if (attr_name in this) {
      this[attr_name] *= scale;
    }
  }

  function trigger_refresh(tree) {

    var event = new CustomEvent(d3_layout_phylotree_event_id, {
      detail: ["refresh", tree]
    });

    document.dispatchEvent(event);

  }

  function count_update(tree, counts) {
    var event = new CustomEvent(d3_layout_phylotree_event_id, {
      detail: ["count_update", counts, tree.count_handler()]
    });
    document.dispatchEvent(event);
  }

  function d3_phylotree_trigger_layout(tree) {
    var event = new CustomEvent(d3_layout_phylotree_event_id, {
      detail: ["layout", tree, tree.layout_handler()]
    });
    document.dispatchEvent(event);
  }

  function d3_phylotree_event_listener(event) {
    switch (event.detail[0]) {
      case "refresh":
        event.detail[1].refresh();
        break;
      case "count_update":
      case "layout":
        event.detail[2](event.detail[1]);
        break;
    }
    return true;
  }

  function d3_phylotree_add_event_listener() {
    document.addEventListener(
      d3_layout_phylotree_event_id,
      d3_phylotree_event_listener,
      false
    );
  }

  function d3_phylotree_svg_translate(x) {
    if (x && (x[0] !== null || x[1] !== null))
      return (
        "translate (" +
        (x[0] !== null ? x[0] : 0) +
        "," +
        (x[1] !== null ? x[1] : 0) +
        ") "
      );

    return "";
  }

  function d3_phylotree_svg_rotate(a) {
    if (a !== null) {
      return "rotate (" + a + ") ";
    }
    return "";
  }

  var events = /*#__PURE__*/Object.freeze({
    __proto__: null,
    toggle_collapse: toggle_collapse,
    resize_svg: resize_svg,
    rescale: rescale,
    trigger_refresh: trigger_refresh,
    count_update: count_update,
    d3_phylotree_trigger_layout: d3_phylotree_trigger_layout,
    d3_phylotree_event_listener: d3_phylotree_event_listener,
    d3_phylotree_add_event_listener: d3_phylotree_add_event_listener,
    d3_phylotree_svg_translate: d3_phylotree_svg_translate,
    d3_phylotree_svg_rotate: d3_phylotree_svg_rotate
  });

  let d3_layout_phylotree_context_menu_id = "d3_layout_phylotree_context_menu";

  function node_dropdown_menu(node, container, phylotree, options) {
    let menu_object = d3.select(container)
      .select("#" + d3_layout_phylotree_context_menu_id);

    if (menu_object.empty()) {
      menu_object = d3.select(container)
        .append("div")
        .attr("id", d3_layout_phylotree_context_menu_id)
        .attr("class", "dropdown-menu")
        .attr("role", "menu");
    }

    menu_object.selectAll("a").remove();
    menu_object.selectAll("h6").remove();
    menu_object.selectAll("div").remove();

    if (node) {
      if (
        !_.some([
          Boolean(node.menu_items),
          options["hide"],
          options["selectable"],
          options["collapsible"]
        ]) ||
        !options["show-menu"]
      )
        return;
      if (!is_leafnode(node)) {
        if (options["collapsible"]) {
          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text(is_node_collapsed(node) ? "Expand Subtree" : "Collapse Subtree")
            .on("click", d => {
              menu_object.style("display", "none");
              this.toggle_collapse(node).update();
            });
          if (options["selectable"]) {
            menu_object.append("div").attr("class", "dropdown-divider");
            menu_object
              .append("h6")
              .attr("class", "dropdown-header")
              .text("Toggle selection");
          }
        }

        if (options["selectable"]) {
          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text("All descendant branches")
            .on("click", function(d) {
              menu_object.style("display", "none");
              phylotree.modify_selection(
                phylotree.select_all_descendants(node, true, true)
              );
            });

          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text("All terminal branches")
            .on("click", function(d) {
              menu_object.style("display", "none");
              phylotree.modify_selection(
                phylotree.select_all_descendants(node, true, false)
              );
            });

          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text("All internal branches")
            .on("click", function(d) {
              menu_object.style("display", "none");
              phylotree.modify_selection(
                phylotree.select_all_descendants(node, false, true)
              );
            });
        }
      }

      if (node.parent) {
        if (options["selectable"]) {
          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text("Incident branch")
            .on("click", function(d) {
              menu_object.style("display", "none");
              phylotree.modify_selection([node]);
            });

          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text("Path to root")
            .on("click", d => {
              menu_object.style("display", "none");
              this.modify_selection(this.phylotree.path_to_root(node));
            });

          if (options["reroot"] || options["hide"]) {
            menu_object.append("div").attr("class", "dropdown-divider");
          }
        }

        if (options["reroot"]) {
          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text("Reroot on this node")
            .on("click", d => {
              menu_object.style("display", "none");
              this.phylotree.reroot(node);
              this.refresh().update();
            });
        }

        if (options["hide"]) {
          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text("Hide this " + (is_leafnode(node) ? "node" : "subtree"))
            .on("click", d => {
              menu_object.style("display", "none");
              this.modify_selection([node], "notshown", true, true)
                .update_has_hidden_nodes()
                .update();
            });
        }
      }

      if (has_hidden_nodes(node)) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Show all descendant nodes")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree
              .modify_selection(
                phylotree.select_all_descendants(node, true, true),
                "notshown",
                true,
                true,
                "false"
              )
              .update_has_hidden_nodes()
              .update();
          });
      }

      // now see if we need to add user defined menus

      var has_user_elements = [];
      if ("menu_items" in node && typeof node["menu_items"] === "object") {
        node["menu_items"].forEach(function(d) {
          if (d.length == 3) {
            if (!d[2] || d[2](node)) {
              has_user_elements.push([d[0], d[1]]);
            }
          }
        });
      }

      if (has_user_elements.length) {
        const show_divider_options = [
          options["hide"],
          options["selectable"],
          options["collapsible"]
        ];

        if (_.some(show_divider_options)) {
          menu_object.append("div").attr("class", "dropdown-divider");
        }

        has_user_elements.forEach(function(d) {
          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text(constant(d[0])(node))
            .on("click", _.partial(d[1], node));
        });
      }

      let tree_container = $(container);
      let coordinates = d3.mouse(tree_container[0]);

      menu_object
        .style("position", "absolute")
        .style("left", "" + coordinates[0] + "px")
        .style("top", "" + coordinates[1] + "px")
        .style("display", "block");
    } else {
      menu_object.style("display", "none");
    }
  }

  function add_custom_menu(node, name, callback, condition) {
    if (!("menu_items" in node)) {
      node["menu_items"] = [];
    }
    if (
      !node["menu_items"].some(function(d) {
        return d[0] == name && d[1] == callback && d[2] == condition;
      })
    ) {
      node["menu_items"].push([name, callback, condition]);
    }
  }

  /**
   *
   * Modify the current selection, via functional programming.
   *
   * @param {Function} node_selecter A function to apply to each node, which
   * determines whether they become part of the current selection. Alternatively,
   * if ``restricted-selectable`` mode is enabled, a string describing one of
   * the pre-defined restricted-selectable options.
   * @param {String} attr (Optional) The selection attribute to modify.
   * @param {Boolean} place (Optional) Whether or not ``placenodes`` should be called.
   * @param {Boolean} skip_refresh (Optional) Whether or not a refresh is called.
   * @param {String} mode (Optional) Can be ``"toggle"``, ``"true"``, or ``"false"``.
   * @returns The current ``this``.
   *
   */
  function modify_selection(
    node_selecter,
    attr,
    place,
    skip_refresh,
    mode
  ) {
    attr = attr || this.selection_attribute_name;
    mode = mode || "toggle";

    // check if node_selecter is a value of pre-defined selecters

    if (this.options["restricted-selectable"].length) {
      // the selection must be from a list of pre-determined selections
      if (_.contains(_.keys(predefined_selecters), node_selecter)) {
        node_selecter = predefined_selecters[node_selecter];
      } else {
        return;
      }
    }

    if (
      (this.options["restricted-selectable"] || this.options["selectable"]) &&
      !this.options["binary-selectable"]
    ) {
      var do_refresh = false;

      if (typeof node_selecter === "function") {
        this.phylotree.links.forEach(function(d) {
          var select_me = node_selecter(d);
          d[attr] = d[attr] || false;
          if (d[attr] != select_me) {
            d[attr] = select_me;
            do_refresh = true;
            d.target[attr] = select_me;
          }
        });
      } else {
        node_selecter.forEach(function(d) {
          var new_value;
          switch (mode) {
            case "true":
              new_value = true;
              break;
            case "false":
              new_value = false;
              break;
            default:
              new_value = !d[attr];
              break;
          }

          if (d[attr] != new_value) {
            d[attr] = new_value;
            do_refresh = true;
          }
        });

        this.links.forEach(function(d) {
          d[attr] = d.target[attr];
        });
      }

      var counts;

      if (do_refresh) {
        if (!skip_refresh) {
          trigger_refresh(this);
        }
        if (this.count_handler()) {
          counts = {};
          counts[attr] = this.phylotree.links.reduce(function(p, c) {
            return p + (c[attr] ? 1 : 0);
          }, 0);
          count_update(this, counts, this.count_handler());
        }

        if (place) {
          this.placenodes();
        }
      }
    } else if (this.options["binary-selectable"]) {
      if (typeof node_selecter === "function") {
        this.phylotree.links.forEach(function(d) {
          var select_me = node_selecter(d);
          d[attr] = d[attr] || false;

          if (d[attr] != select_me) {
            d[attr] = select_me;
            do_refresh = true;
            d.target[attr] = select_me;
          }

          this.options["attribute-list"].forEach(function(type) {
            if (type != attr && d[attr] === true) {
              d[type] = false;
              d.target[type] = false;
            }
          });
        });
      } else {
        node_selecter.forEach(function(d) {
          var new_value;
          new_value = !d[attr];

          if (d[attr] != new_value) {
            d[attr] = new_value;
            do_refresh = true;
          }
        });

        this.phylotree.links.forEach(function(d) {
          d[attr] = d.target[attr];
          this.phylotree.options["attribute-list"].forEach(function(type) {
            if (type != attr && d[attr] !== true) {
              d[type] = false;
              d.target[type] = false;
            }
          });
        });
      }

      if (do_refresh) {
        if (!skip_refresh) {
          trigger_refresh(this);
        }
        if (this.count_handler()) {
          counts = {};
          counts[attr] = this.phylotree.links.reduce(function(p, c) {
            return p + (c[attr] ? 1 : 0);
          }, 0);
          this.count_update(this, counts, this.count_handler());
        }

        if (place) {
          this.placenodes();
        }
      }
    }

    if (this.selection_callback && attr != "tag") {
      this.selection_callback(this.get_selection());
    }

    this.refresh();
    return this;
  }

  /**
   * Get nodes which are currently selected.
   *
   * @returns {Array} An array of nodes that match the current selection.
   */
  function get_selection() {
    return []; // the code below doesn't seem to work
  }

  /**
   * Select all descendents of a given node, with options for selecting
   * terminal/internal nodes.
   *
   * @param {Node} node The node whose descendents should be selected.
   * @param {Boolean} terminal Whether to include terminal nodes.
   * @param {Boolean} internal Whther to include internal nodes.
   * @returns {Array} An array of selected nodes.
   */
  function select_all_descendants(node, terminal, internal) {
    let selection = [];

    function sel(d) {
      if (is_leafnode(d)) {
        if (terminal) {
          if (d != node) selection.push(d);
        }
      } else {
        if (internal) {
          if (d != node) selection.push(d);
        }
        d.children.forEach(sel);
      }
    }

    sel(node);
    return selection;
  }

  /**
   * Getter/setter for the selection callback. This function is called
   * every time the current selection is modified, and its argument is
   * an array of nodes that make up the current selection.
   *
   * @param {Function} callback (Optional) The selection callback function.
   * @returns The current ``selection_callback`` if getting, or the current ``this`` if setting.
   */
  function selection_callback$1(callback) {
    if (!callback) return this.selection_callback;
    this.selection_callback = callback;
    return this;
  }

  var menus = /*#__PURE__*/Object.freeze({
    __proto__: null,
    node_dropdown_menu: node_dropdown_menu,
    add_custom_menu: add_custom_menu,
    modify_selection: modify_selection,
    get_selection: get_selection,
    select_all_descendants: select_all_descendants,
    selection_callback: selection_callback$1
  });

  // replacement for d3.functor
  function constant$1(x) {
    return function() {
      return x;
    };
  }

  class TreeRender {

    constructor(phylotree, container, options = {}) {
      this.css_classes = css_classes;
      this.phylotree = phylotree;
      this.container = container;
      this.separation = function(_node, _previous) {
        return 0;
      };

      this._node_label = this.def_node_label;
      this.svg = null;
      this.selection_callback = null;
      this.scales = [1, 1];
      this.size = [1, 1];
      this.fixed_width = [30, 20];
      this.font_size = 12;
      this.scale_bar_font_size = 12;
      this.offsets = [0, this.font_size / 2];

      this.draw_branch = draw_line;
      this.draw_scale_bar = null;
      this.edge_placer = line_segment_placer;
      this.count_listener_handler = function() {};
      this.layout_listener_handler = function() {};
      this.node_styler = undefined;
      this.edge_styler = undefined;
      this.shown_font_size = this.font_size;
      this.selection_attribute_name = "selected";
      this.right_most_leaf = 0;
      this.label_width = 0;
      this.radial_center = 0;
      this.radius = 1;
      this.radius_pad_for_bubbles = 0;

      this.rescale_node_span = 1;
      this.node_span = function(_node) {
        return 1;
      };
      this.relative_node_span = function(_node) {
        return this.node_span(_node) / this.rescale_node_span;
      };

      let default_options = {
        layout: "left-to-right",
        logger: console,
        branches: "step",
        scaling: true,
        bootstrap: false,
        "color-fill": true,
        "internal-names": false,
        selectable: true,
        // restricted-selectable can take an array of predetermined
        // selecters that are defined in phylotree.predefined_selecters
        // only the defined functions will be allowed when selecting
        // branches
        "restricted-selectable": false,
        collapsible: true,
        "left-right-spacing": "fixed-step", //'fit-to-size',
        "top-bottom-spacing": "fixed-step",
        "left-offset": 0,
        "right-offset": 0,
        "show-scale": "top",
        // currently not implemented to support any other positioning
        "draw-size-bubbles": false,
        "binary-selectable": false,
        "is-radial": false,
        "attribute-list": [],
        "max-radius": 768,
        "annular-limit": 0.38196601125010515,
        compression: 0.2,
        "align-tips": false,
        "maximum-per-node-spacing": 100,
        "minimum-per-node-spacing": 2,
        "maximum-per-level-spacing": 100,
        "minimum-per-level-spacing": 10,
        node_circle_size: constant$1(3),
        transitions: null,
        brush: true,
        reroot: true,
        hide: true,
        "label-nodes-with-name": false,
        zoom: false,
        "show-menu": true,
        "show-labels": true
      };

      this.ensure_size_is_in_px = function(value) {
        return typeof value === "number" ? value + "px" : value;
      };

      this.options = _.defaults(options, default_options);

      this.width = this.options.width || 800;
      this.height = this.options.height || 600;

      this.rescale_node_span =
        this.phylotree.nodes.children
          .map(d => {
            if (is_leafnode(d) || this.show_internal_name(d))
              return this.node_span(d);
          })
          .reduce(function(p, c) {
            return Math.min(c, p || 1e200);
          }, null) || 1;

      this.initialize_svg(this.container);
      this.links = this.phylotree.nodes.links();
      this.update();
    }

    pad_height() {
      if (this.draw_scale_bar) {
        return this.scale_bar_font_size + 25;
      }

      return 0;
    }

    pad_width() {
      // reset label_width
      this.label_width = this._label_width(this.shown_font_size);

      const _label_width = this.options["show-labels"] ? this.label_width : 0;
      return this.offsets[1] + this.options["left-offset"]
        + this.options["right-offset"] // TODO TEST THIS
        + _label_width;
    }

    /**
     * Collapses a given node.
     *
     * @param {Node} node A node to be collapsed.
     */
    collapse_node(n) {
      if (!is_node_collapsed(n)) {
        n.collapsed = true;
      }
    }

    /**
     * Get or set the size of tree in pixels.
     *
     * @param {Array} attr (optional) An array of the form ``[height, width]``.
     * @returns {Phylotree} The current ``size`` array if getting, or the current ``phylotree``
     * if setting.
     */
    set_size(attr) {

      if (!arguments.length) {
        return this.size;
      }

      let phylo_attr = attr;

      if (this.options["top-bottom-spacing"] != "fixed-step") {
        this.size[0] = phylo_attr[0];
      }
      if (this.options["left-right-spacing"] != "fixed-step") {
        this.size[1] = phylo_attr[1];
      }

      return this;

    }

    /**
     * Getter/setter for the SVG element for the Phylotree to be rendered in.
     *
     * @param {d3-selection} svg_element (Optional) SVG element to render within, selected by D3.
     * @returns The selected SVG element if getting, or the current ``phylotree`` if setting.`
     */
    initialize_svg(svg_element) {
      if (!arguments.length) return this.svg;

      if (this.svg !== svg_element) {
        d3.select(svg_element).select("svg").remove();

        this.svg = d3.select(svg_element)
          .append("svg")
          .attr("width", this.width)
          .attr("height", this.height);

        this.set_size([this.height, this.width]);

        if (this.css_classes["tree-container"] == "phylotree-container") {
          this.svg.selectAll("*").remove();
          this.svg.append("defs");
        }

        d3.select(this.container).on(
          "click",
          d => {
            this.handle_node_click(null);
          },
          true
        );
      }

      return this;
    }

    update_layout(new_json, do_hierarchy) {

      if (do_hierarchy) {
        this.nodes = d3.hierarchy(new_json);
        this.nodes.each(function(d) {
          d.id = null;
        });
      }

      this.update();
      this.sync_edge_labels();

    }

    /**
     * Update the current phylotree, i.e., alter the svg
     * elements.
     *
     * @param {Boolean} transitions (Optional) Toggle whether transitions should be shown.
     * @returns The current ``phylotree``.
     */
    update(transitions) {

      var self = this;

      if (!this.svg) return this;

      this.placenodes();

      transitions = this.transitions(transitions);

      let node_id = 0;

      let enclosure = this.svg
        .selectAll("." + css_classes["tree-container"])
        .data([0]);

      enclosure = enclosure
        .enter()
        .append("g")
        .attr("class", css_classes["tree-container"])
        .merge(enclosure)
        .attr("transform", d => {
          return this.d3_phylotree_svg_translate([
            this.offsets[1] + this.options["left-offset"]
  ,
            this.pad_height()
          ]);
        });

      if (this.draw_scale_bar) {

        let scale_bar = this.svg
          .selectAll("." + css_classes["tree-scale-bar"])
          .data([0]);

        scale_bar
          .enter()
          .append("g")
          .attr("class", css_classes["tree-scale-bar"])
          .style("font-size", this.ensure_size_is_in_px(this.scale_bar_font_size))
          .merge(scale_bar)
          .attr("transform", d => {
            return this.d3_phylotree_svg_translate([
              this.offsets[1] + this.options["left-offset"],
              this.pad_height() - 10
            ]);
          })
          .call(this.draw_scale_bar);

        scale_bar.selectAll("text").style("text-anchor", "end");
      } else {
        this.svg.selectAll("." + css_classes["tree-scale-bar"]).remove();
      }

      enclosure = this.svg
        .selectAll("." + css_classes["tree-container"])
        .data([0]);

      this.update_collapsed_clades(transitions);

      let drawn_links = enclosure
        .selectAll(edge_css_selectors(css_classes))
        .data(this.links.filter(edge_visible), d => {
          return d.target.id || (d.target.id = ++node_id);
        });

      if (transitions) {
        drawn_links.exit().remove();
      } else {
        drawn_links.exit().remove();
      }

      drawn_links = drawn_links
        .enter()
        .insert("path", ":first-child")
        .merge(drawn_links)
        .each(function(d) {
          self.draw_edge(this, d, transitions);
        });

      let drawn_nodes = enclosure
        .selectAll(node_css_selectors(css_classes))
        .data(
          this.phylotree.nodes.descendants().filter(node_visible),
          d => {
            return d.id || (d.id = ++node_id);
          }
        );

      drawn_nodes.exit().remove();

      drawn_nodes = drawn_nodes
        .enter()
        .append("g")
        .attr("class", this.reclass_node)
        .merge(drawn_nodes)
        .attr("transform", d => {
          const should_shift =
            this.options["layout"] == "right-to-left" && is_leafnode(d);

          d.screen_x = x_coord(d);
          d.screen_y = y_coord(d);

          return this.d3_phylotree_svg_translate([
            should_shift ? 0 : d.screen_x,
            d.screen_y
          ]);
        })
        .each(function(d) {
          self.draw_node(this, d, transitions);
        })
        .attr("transform", d => {
          if (!_.isUndefined(d.screen_x) && !_.isUndefined(d.screen_y)) {
            return "translate(" + d.screen_x + "," + d.screen_y + ")";
          }
        });

      if (this.options["label-nodes-with-name"]) {
        drawn_nodes = drawn_nodes.attr("id", d => {
          return "node-" + d.name;
        });
      }

      this.resize_svg(this.phylotree, this.svg, transitions);

      if (this.options["brush"]) {

        var brush = enclosure
          .selectAll("." + css_classes["tree-selection-brush"])
          .data([0])
          .enter()
          .insert("g", ":first-child")
          .attr("class", css_classes["tree-selection-brush"]);

        var brush_object = d3.brush()
          .on("brush", () => {
            var extent = d3.event.target.extent(),
              shown_links = this.links.filter(edge_visible),
              selected_links = shown_links
                .filter((d, i) => {
                  return (
                    d.source.screen_x >= extent[0][0] &&
                    d.source.screen_x <= extent[1][0] &&
                    d.source.screen_y >= extent[0][1] &&
                    d.source.screen_y <= extent[1][1] &&
                    d.target.screen_x >= extent[0][0] &&
                    d.target.screen_x <= extent[1][0] &&
                    d.target.screen_y >= extent[0][1] &&
                    d.target.screen_y <= extent[1][1]
                  );
                })
                .map(d => {
                  return d.target;
                });

            this.modify_selection(
              this.phylotree.links.map(d => {
                return d.target;
              }),
              "tag",
              false,
              selected_links.length > 0,
              "false"
            );

            this.modify_selection(selected_links, "tag", false, false, "true");
          })
          .on("end", () => {
            //brush.call(d3.event.target.clear());
          });

        brush.call(brush_object);

      }

      this.sync_edge_labels();

      if (this.options["zoom"]) {

        let zoom = d3.zoom().scaleExtent([0.1, 10]).on("zoom", () => {

          var translate = [];
          translate[0] = 
            d3.event.transform.x +
            this.offsets[1] + this.options["left-offset"] - this.options["right-offset"];
          translate[1] = d3.event.transform.y + this.pad_height();

          d3.select("." + css_classes["tree-container"])
            .attr(
              "transform",
              "translate(" + translate + ")scale(" + d3.event.transform.k + ")"
            );
        });

        this.svg.call(zoom);

      }

      return this;

    }

    _handle_single_node_layout(
      a_node,
      last_node,
      last_span,
      is_under_collapsed_parent,
      save_x
    ) {

      let _node_span = this.node_span(a_node) / this.rescale_node_span;
      // compute the relative size of nodes (0,1)
      // sum over all nodes is 1

      this.x = a_node.x =
        this.x +
        this.separation(last_node, a_node) +
        (last_span + _node_span) * 0.5;

      // separation is a user-settable callback to add additional spacing on nodes
      this._extents[1][1] = Math.max(this._extents[1][1], a_node.y);
      this._extents[1][0] = Math.min(
        this._extents[1][0],
        a_node.y - _node_span * 0.5
      );

      if (is_under_collapsed_parent) {
        this._extents[0][1] = Math.max(
          this._extents[0][1],
          save_x +
            (a_node.x - save_x) * this.options["compression"] +
            this.save_span +
            (_node_span * 0.5 + this.separation(last_node, a_node)) *
              this.options["compression"]
        );
      } else {
        this._extents[0][1] = Math.max(
          this._extents[0][1],
          this.x + _node_span * 0.5 + this.separation(last_node, a_node)
        );
      }

      last_node = a_node;
      last_span = _node_span;

      this.last_node = last_node;
      this.last_span = last_span;

      return [last_node, last_span];
    }

    tree_layout(a_node) {
      /**
              for each node: 
                  y: the y coordinate is root to tip
                      (left to right in cladogram layout, radius is radial layout
                  x : the x coordinate is top-most to bottom-most 
                      (top to bottom in cladogram layout, angle in radial layout)
                  
                  
           @return the x-coordinate of a_node or undefined in the node is not displayed
                   (hidden or under a collapsed node)
          */

      // do not layout hidden nodes
      if (node_notshown(a_node)) {
        return undefined;
      }

      let is_leaf = is_leafnode(a_node);

      // the next four members are radial layout options
      a_node.text_angle = null; // the angle at which text is being laid out
      a_node.text_align = null; // css alignment option for node labels
      a_node.radius = null; // radial layout radius
      a_node.angle = null; // radial layout angle (in radians)

      /** determine the root-to-tip location of this node;
              
        the root node receives the co-ordinate of 0
        
        if the tree has branch lengths, then the placement of each node is simply the 
        total branch length to the root
        
        if the tree has no branch lengths, all leaves get the same depth ("number of internal nodes on the deepest path")
        and all internal nodes get the depth in integer units of the # of internal nodes on the path to the root + 1
          
      */

      let undef_BL = false;

      /** _extents computes a bounding box for the tree (initially NOT in screen 
              coordinates)

          all account for node sizes

          _extents [1][0] -- the minimum x coordinate (breadth)
          _extents [1][1] -- the maximum y coordinate (breadth)
          _extents [1][0] -- the minimum y coordinate (root-to-tip, or depthwise)
          _extents [1][1] -- the maximum y coordinate (root-to-tip, or depthwise)

      */

      let last_node = null;

      // last node laid out in the top bottom hierarchy
      let last_span = 0;
      let is_under_collapsed_parent = false;

      if (a_node["parent"]) {
        if (this.do_scaling) {
          if (undef_BL) {
            return 0;
          }

          a_node.y = this.phylotree.branch_length_accessor(a_node);

          if (typeof a_node.y === "undefined") {
            undef_BL = true;
            return 0;
          }

          a_node.y += a_node.parent.y;
        } else {
          a_node.y = is_leaf ? this.max_depth : a_node.depth;
        }
      } else {
        this.x = 0.0;
        // the span of the last node laid out in the top to bottom hierarchy
        a_node.y = 0.0;
      }

      /** the next block has to do with top-to-bottom spacing of nodes **/

      if (is_leaf) {
        // displayed internal nodes are handled in `process_internal_node`
        this._handle_single_node_layout(
          a_node,
          last_node,
          last_span,
          is_under_collapsed_parent,
          0.0
        );
      }

      if (!is_leaf) {
        // for internal nodes
        if (
          is_node_collapsed(a_node) &&
          !is_under_collapsed_parent
        ) {
          // collapsed node
          let save_x = this.x;
          this.save_span = this.last_span * 0.5;
          is_under_collapsed_parent = true;
          this.process_internal_node(a_node);
          is_under_collapsed_parent = false;

          if (typeof a_node.x === "number") {
            a_node.x =
              save_x +
              (a_node.x - save_x) * this.options["compression"] +
              this.save_span;

            a_node.collapsed = [[a_node.x, a_node.y]];

            var map_me = n => {
              n.hidden = true;

              if (is_leafnode(n)) {
                this.x = n.x =
                  save_x +
                  (n.x - save_x) * this.options["compression"] +
                  this.save_span;

                a_node.collapsed.push([n.x, n.y]);
              } else {
                n.children.map(map_me);
              }
            };

            this.x = save_x;
            map_me(a_node);

            a_node.collapsed.splice(1, 0, [save_x, a_node.y]);
            a_node.collapsed.push([this.x, a_node.y]);
            a_node.collapsed.push([a_node.x, a_node.y]);
            a_node.hidden = false;
          }
        } else {
          // normal node, or under a collapsed parent
          this.process_internal_node(a_node);
        }
      }

      return a_node.x;
    }

    process_internal_node(a_node) {
      /** 
              decide if the node will be shown, and compute its top-to-bottom (breadthwise)
              placement 
          */

      let count_undefined = 0;

      if (this.show_internal_name(a_node)) {
        // do in-order traversal to allow for proper internal node spacing
        // (x/2) >> 0 is integer division
        let half_way = (a_node.children.length / 2) >> 0;
        let displayed_children = 0;
        let managed_to_display = false;

        for (let child_id = 0; child_id < a_node.children.length; child_id++) {
          let child_x = this.tree_layout(a_node.children[child_id]).bind(this);

          if (typeof child_x == "number") {
            displayed_children++;
          }

          if (displayed_children >= half_way && !managed_to_display) {
            this._handle_single_node_layout(a_node);
            managed_to_display = true;
          }
        }

        if (displayed_children == 0) {
          a_node.notshown = true;
          a_node.x = undefined;
        } else {
          if (!managed_to_display) {
            this._handle_single_node_layout(a_node);
          }
        }
      } else {
        // postorder layout
        a_node.x = a_node.children
          .map(this.tree_layout.bind(this))
          .reduce((a, b) => {
            if (typeof b == "number") return a + b;
            count_undefined += 1;
            return a;
          }, 0.0);

        if (count_undefined == a_node.children.length) {
          a_node.notshown = true;
          a_node.x = undefined;
        } else {
          a_node.x /= a_node.children.length - count_undefined;
        }
      }
    }

    do_lr(at_least_one_dimension_fixed) {

      if (this.radial() && at_least_one_dimension_fixed) {
        this.offsets[1] = 0;
      }


      if (this.options["left-right-spacing"] == "fixed-step") {

        this.size[1] = this.max_depth * this.fixed_width[1];

        this.scales[1] =
          (this.size[1] - this.offsets[1] - this.options["left-offset"] - this.options["right-offset"]) /  //  TEST right offset here
          this._extents[1][1];

        this.label_width = this._label_width(this.shown_font_size);

        if (this.radial()) {
          this.label_width *= 2;
        }
      } else {

        this.label_width = this._label_width(this.shown_font_size);

        at_least_one_dimension_fixed = true;

        let available_width =
          this.size[1] - this.offsets[1] - this.options["left-offset"] - this.options["right-offset"]; // TEST this

        if (available_width * 0.5 < this.label_width) {
          this.shown_font_size *= available_width * 0.5 / this.label_width;
          this.label_width = available_width * 0.5;
        }

        this.scales[1] =
          (this.size[1] -
            this.offsets[1] -
            (this.options["left-offset"] + this.options['right-offset']) - // TEST this
            this.label_width) /
          this._extents[1][1];

      }
    }

    /**
     * Place the current nodes, i.e., determine their coordinates based
     * on current settings.
     *
     * @returns The current ``phylotree``.
     */
    placenodes() {

      this._extents = [[0, 0], [0, 0]];

      let x = 0.0,
        last_span = 0;

      (this.save_x = x), (this.save_span = last_span * 0.5);

      this.do_scaling = this.options["scaling"];
      let undef_BL = false;

      this.is_under_collapsed_parent = false;
      this.max_depth = 1;

      // Set initial x
      this.phylotree.nodes.x = this.tree_layout(
        this.phylotree.nodes,
        this.do_scaling
      );

      this.max_depth = d3.max(this.phylotree.nodes.descendants(), n => {
        return n.depth;
      });

      if (this.do_scaling && undef_BL) {

        // requested scaling, but some branches had no branch lengths
        // redo layout without branch lengths
        this.do_scaling = false;
        this.phylotree.nodes.x = this.tree_layout(this.phylotree.nodes);

      }

      let at_least_one_dimension_fixed = false;

      this.draw_scale_bar = this.options["show-scale"] && this.do_scaling;

      // this is a hack so that phylotree.pad_height would return ruler spacing
      this.offsets[1] = Math.max(
          this.font_size,
          -this._extents[1][0] * this.fixed_width[0]
        );


      if (this.options["top-bottom-spacing"] == "fixed-step") {
        this.size[0] = this._extents[0][1] * this.fixed_width[0];
        this.scales[0] = this.fixed_width[0];
      } else {
        this.scales[0] = (this.size[0] - this.pad_height()) / this._extents[0][1];
        at_least_one_dimension_fixed = true;
      }

      this.shown_font_size = Math.min(this.font_size, this.scales[0]);

      if (this.radial()) {
        // map the nodes to polar coordinates
        this.draw_branch = _.partial(draw_arc, _, this.radial_center);
        this.edge_placer = arc_segment_placer;

        let last_child_angle = null,
          last_circ_position = null,
          last_child_radius = null,
          min_radius = 0,
          effective_span = this._extents[0][1] * this.scales[0];

        let compute_distance = function(r1, r2, a1, a2, annular_shift) {
          annular_shift = annular_shift || 0;
          return Math.sqrt(
            (r2 - r1) * (r2 - r1) +
              2 *
                (r1 + annular_shift) *
                (r2 + annular_shift) *
                (1 - Math.cos(a1 - a2))
          );
        };

        let max_r = 0;

        this.phylotree.nodes.each(d => {

          let my_circ_position = d.x * this.scales[0];
          d.angle = 2 * Math.PI * my_circ_position / effective_span;
          d.text_angle = d.angle - Math.PI / 2;
          d.text_angle = d.text_angle > 0 && d.text_angle < Math.PI;
          d.text_align = d.text_angle ? "end" : "start";
          d.text_angle = (d.text_angle ? 180 : 0) + d.angle * 180 / Math.PI;

        });

        this.do_lr(at_least_one_dimension_fixed);

        this.phylotree.nodes.each(d => {
          d.radius = d.y * this.scales[1] / this.size[1];
          max_r = Math.max(d.radius, max_r);
        });

        let annular_shift = 0;

        this.phylotree.nodes.each(d => {
          if (!d.children) {
            let my_circ_position = d.x * this.scales[0];
            if (last_child_angle !== null) {
              let required_spacing = my_circ_position - last_circ_position,
                radial_dist = compute_distance(
                  d.radius,
                  last_child_radius,
                  d.angle,
                  last_child_angle,
                  annular_shift
                );

              let local_mr =
                radial_dist > 0
                  ? required_spacing / radial_dist
                  : 10 * this.options["max-radius"];

              if (local_mr > this.options["max-radius"]) {
                // adjust the annular shift
                let dd = required_spacing / this.options["max-radius"],
                  b = d.radius + last_child_radius,
                  c =
                    d.radius * last_child_radius -
                    (dd * dd -
                      (last_child_radius - d.radius) *
                        (last_child_radius - d.radius)) /
                      2 /
                      (1 - Math.cos(last_child_angle - d.angle)),
                  st = Math.sqrt(b * b - 4 * c);

                annular_shift = Math.min(
                  this.options["annular-limit"] * max_r,
                  (-b + st) / 2
                );
                min_radius = this.options["max-radius"];
              } else {
                min_radius = Math.max(min_radius, local_mr);
              }
            }

            last_child_angle = d.angle;
            last_circ_position = my_circ_position;
            last_child_radius = d.radius;
          }
        });

        this.radius = Math.min(
          this.options["max-radius"],
          Math.max(effective_span / 2 / Math.PI, min_radius)
        );

        if (at_least_one_dimension_fixed) {
          this.radius = Math.min(
            this.radius,
            (Math.min(effective_span, this._extents[1][1] * this.scales[1]) -
              this.label_width) *
              0.5 -
              this.radius * annular_shift
          );
        }

        this.radial_center = this.radius_pad_for_bubbles = this.radius;
        this.draw_branch = _.partial(draw_arc, _, this.radial_center);

        let scaler = 1;

        if (annular_shift) {
          scaler = max_r / (max_r + annular_shift);
          this.radius *= scaler;
        }

        this.phylotree.nodes.each(d => {
          cartesian_to_polar(
            d,
            this.radius,
            annular_shift,
            this.radial_center,
            this.scales,
            this.size
          );

          max_r = Math.max(max_r, d.radius);

          if (this.options["draw-size-bubbles"]) {
            this.radius_pad_for_bubbles = Math.max(
              this.radius_pad_for_bubbles,
              d.radius + this.node_bubble_size(d)
            );
          } else {
            this.radius_pad_for_bubbles = Math.max(
              this.radius_pad_for_bubbles,
              d.radius
            );
          }

          if (d.collapsed) {
            d.collapsed = d.collapsed.map(p => {
              let z = {};
              z.x = p[0];
              z.y = p[1];
              z = cartesian_to_polar(
                z,
                this.radius,
                annular_shift,
                this.radial_center,
                this.scales,
                this.size
              );
              return [z.x, z.y];
            });

            let last_point = d.collapsed[1];

            d.collapsed = d.collapsed.filter(function(p, i) {
              if (i < 3 || i > d.collapsed.length - 4) return true;
              if (
                Math.sqrt(
                  Math.pow(p[0] - last_point[0], 2) +
                    Math.pow(p[1] - last_point[1], 2)
                ) > 3
              ) {
                last_point = p;
                return true;
              }
              return false;
            });
          }
        });

        this.size[0] = this.radial_center + this.radius / scaler;
        this.size[1] = this.radial_center + this.radius / scaler;

      } else {

        this.do_lr();

        this.draw_branch = draw_line;
        this.edge_placer = line_segment_placer;
        this.right_most_leaf = 0;

        this.phylotree.nodes.each(d => {

          d.x *= this.scales[0];
          d.y *= this.scales[1]*.8;

          if (this.options["layout"] == "right-to-left") {
            d.y = this._extents[1][1] * this.scales[1] - d.y;
          }

          if (is_leafnode(d)) {
            this.right_most_leaf = Math.max(
              this.right_most_leaf,
              d.y + this.node_bubble_size(d)
            );
          }

          if (d.collapsed) {

            d.collapsed.map(p => {
              return [(p[0] *= this.scales[0]), (p[1] *= this.scales[1])];
            });

            let last_x = d.collapsed[1][0];

            d.collapsed = d.collapsed.filter(function(p, i) {
              if (i < 3 || i > d.collapsed.length - 4) return true;
              if (p[0] - last_x > 3) {
                last_x = p[0];
                return true;
              }
              return false;
            });

          }
        });
      }

      if (this.draw_scale_bar) {

        let domain_limit, range_limit;

        if (this.radial()) {
          range_limit = Math.min(this.radius / 5, 50);
          domain_limit = Math.pow(
            10,
            Math.ceil(
              Math.log(this._extents[1][1] * range_limit / this.radius) /
                Math.log(10)
            )
          );

          range_limit = domain_limit * (this.radius / this._extents[1][1]);

          if (range_limit < 30) {
            let stretch = Math.ceil(30 / range_limit);
            range_limit *= stretch;
            domain_limit *= stretch;
          }
        } else {
          domain_limit = this._extents[1][1];
          range_limit =
            this.size[1] - this.offsets[1] - this.options["left-offset"] - this.options["right-offset"];
        }

        let scale = d3.scaleLinear()
            .domain([0, domain_limit])
            .range([this.shown_font_size, this.shown_font_size + range_limit]),
          scaleTickFormatter = d3.format(".2g");

        this.draw_scale_bar = d3.axisTop().scale(scale).tickFormat(function(d) {

          if (d === 0) {
            return "";
          }

          return scaleTickFormatter(d);

        });

        if (this.radial()) {
          this.draw_scale_bar.tickValues([domain_limit]);
        } else {
          let round = function(x, n) {
            return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
          };

          let my_ticks = scale.ticks();
          my_ticks = my_ticks.length > 1 ? my_ticks[1] : my_ticks[0];

          this.draw_scale_bar.ticks(
            Math.min(
              10,
              round(
                range_limit /
                  (this.shown_font_size *
                    scaleTickFormatter(my_ticks).length *
                    0.8),
                0
              )
            )
          );
        }

      } else {
        this.draw_scale_bar = null;
      }

      return this;
    }

    /**
     * Get or set spacing in the x-direction.
     *
     * @param {Number} attr (Optional), the new spacing value if setting.
     * @param {Boolean} skip_render (Optional), whether or not a refresh should be performed.
     * @returns The current ``spacing_x`` value if getting, or the current ``phylotree`` if setting.
     */
    spacing_x(attr, skip_render) {
      if (!arguments.length) return this.fixed_width[0];

      if (
        this.fixed_width[0] != attr &&
        attr >= this.options["minimum-per-node-spacing"] &&
        attr <= this.options["maximum-per-node-spacing"]
      ) {
        this.fixed_width[0] = attr;
        if (!skip_render) {
          this.placenodes();
        }
      }

      return this;
    }

    /**
     * Get or set spacing in the y-direction.
     *
     * @param {Number} attr (Optional), the new spacing value if setting.
     * @param {Boolean} skip_render (Optional), whether or not a refresh should be performed.
     * @returns The current ``spacing_y`` value if getting, or the current ``phylotree`` if setting.
     */
    spacing_y(attr, skip_render) {

      if (!arguments.length) return this.fixed_width[1];

      if (
        this.fixed_width[1] != attr &&
        attr >= this.options["minimum-per-level-spacing"] &&
        attr <= this.options["maximum-per-level-spacing"]
      ) {
        this.fixed_width[1] = attr;
        if (!skip_render) {
          this.placenodes();
        }
      }
      return this;
    }

    _label_width(_font_size) {

      _font_size = _font_size || this.shown_font_size;
      let width = 0;

      this.phylotree.nodes
        .descendants()
        .filter(node_visible)
        .forEach(node => {

          let node_width = 12 + this._node_label(node).length * _font_size * 0.8;

          if (node.angle !== null) {
            node_width *= Math.max(
              Math.abs(Math.cos(node.angle)),
              Math.abs(Math.sin(node.angle))
            );
          }
          width = Math.max(node_width, width);
        });

      return width;

    }

    /**
     * Get or set font size.
     *
     * @param {Function} attr Empty if getting, or new font size if setting.
     * @returns The current ``font_size`` accessor if getting, or the current ``phylotree`` if setting.
     */
    font_size(attr) {
      if (!arguments.length) return this.font_size;
      this.font_size = attr === undefined ? 12 : attr;
      return this;
    }

    scale_bar_font_size(attr) {
      if (!arguments.length) return this.scale_bar_font_size;
      this.scale_bar_font_size = attr === undefined ? 12 : attr;
      return this;
    }

    node_circle_size(attr, attr2) {
      if (!arguments.length) return this.options["node_circle_size"];
      this.options["node_circle_size"] = constant$1(attr === undefined ? 3 : attr);
      return this;
    }

    css(opt) {
      if (arguments.length === 0) return this.css_classes;

      if (arguments.length > 2) {
        var arg = {};
        arg[opt[0]] = opt[1];
        return this.css(arg);
      }

      for (var key in css_classes) {
        if (key in opt && opt[key] != css_classes[key]) {
          css_classes[key] = opt[key];
        }
      }

      return this;
    }

    transitions(arg) {
      if (arg !== undefined) {
        return arg;
      }

      if (this.options["transitions"] !== null) {
        return this.options["transitions"];
      }

      return this.phylotree.nodes.descendants().length <= 300;
    }

    /**
     * Get or set CSS classes.
     *
     * @param {Object} opt Keys are the CSS class to toggle and values are
     * the parameters for that CSS class.
     * @param {Boolean} run_update (optional) Whether or not the tree should update.
     * @returns The current ``phylotree``.
     */
    css_classes(opt, run_update) {
      if (!arguments.length) return this.css_classes;

      let do_update = false;

      for (var key in css_classes) {
        if (key in opt && opt[key] != this.css_classes[key]) {
          do_update = true;
          this.css_classes[key] = opt[key];
        }
      }

      if (run_update && do_update) {
        this.layout();
      }

      return this;
    }

    /**
     * Lay out the tree within the SVG.
     *
     * @param {Boolean} transitions Specify whether or not transitions should occur.
     * @returns The current ``phylotree``.
     */
    layout(transitions) {
      if (this.svg) {
        this.svg.selectAll(
          "." +
            this.css_classes["tree-container"] +
            ",." +
            this.css_classes["tree-scale-bar"] +
            ",." +
            this.css_classes["tree-selection-brush"]
        );

        //.remove();
        this.d3_phylotree_trigger_layout(this);
        return this.update();
      }

      this.d3_phylotree_trigger_layout(this);
      return this;
    }

    handle_node_click(node) {
      this.node_dropdown_menu(node, this.container, this, this.options);
    }

    refresh() {
      if (this.svg) {
        // for re-entrancy
        let enclosure = this.svg.selectAll(
          "." + this.css_classes["tree-container"]
        );

        let edges = enclosure
          .selectAll(edge_css_selectors(this.css_classes))
          .attr("class", this.reclass_edge.bind(this));

        if (this.edge_styler) {
          edges.each(function(d) {
            this.edge_styler(d3.select(this), d);
          });
        }

        //let nodes = this.enclosure
        //  .selectAll(inspector.node_css_selectors(this.css_classes))
        //  .attr("class", this.phylotree.reclass_node);

        //if (this.node_styler) {
        //  nodes.each(function(d) {
        //    this.node_styler(d3.select(this), d);
        //  });
        //}
      }

      return this;
    }

    count_handler(attr) {
      if (!arguments.length) return this.count_listener_handler;
      this.count_listener_handler = attr;
      return this;
    }

    /**
     * Get or set node styler. If setting, pass a function of two arguments,
     * ``element`` and ``data``. ``data`` exposes the underlying node so that
     * its attributes can be referenced. These can be used to apply styles to
     * ``element``, which will be a D3 selection corresponding to the SVG element
     * that makes up the current node.
     * ``transition`` is the third argument which indicates that there is an ongoing
     * d3 transition in progress
     *
     * @param {Function} attr - Optional; if setting, the node styler function to be set.
     * @returns The ``node_styler`` function if getting, or the current ``phylotree`` if setting.
     */
    style_nodes(attr) {
      if (!arguments.length) return this.node_styler;
      this.node_styler = attr;
      return this;
    }

    /**
     * Get or set edge styler. If setting, pass a function of two arguments,
     * ``element`` and ``data``. ``data`` exposes the underlying edge so that
     * its attributes can be referenced. These can be used to apply styles to
     * ``element``, which will be a D3 selection corresponding to the SVG element
     * that makes up the current edge.
     *
     * Note that, in accordance with the D3 hierarchy layout, edges will have
     * a ``source`` and ``target`` field, corresponding to the nodes that make up
     * up the associated branch.
     *
     * @param {Function} attr - Optional; if setting, the node styler function to be set.
     * @returns The ``edge_styler`` function if getting, or the current ``phylotree`` if setting.
     */
    style_edges(attr) {
      if (!arguments.length) return this.edge_styler;
      this.edge_styler = attr.bind(this);
      return this;
    }

    item_selected(item, tag) {
      return item[tag] || false;
    }


  }

  _.extend(TreeRender.prototype, clades);
  _.extend(TreeRender.prototype, render_nodes);
  _.extend(TreeRender.prototype, render_edges);
  _.extend(TreeRender.prototype, events);
  _.extend(TreeRender.prototype, menus);
  _.extend(TreeRender.prototype, opt);

  function resort_children(comparator, start_node, filter) {
    // ascending
    this.nodes
      .sum(function(d) {
        return d.value;
      })
      .sort(comparator);

    // if a tree is rendered in the DOM
    if (this.display) {
      this.display.update_layout(this.nodes);
      this.display.update();
    }

    return this;
  }

  /**
   * Return most recent common ancestor of a pair of nodes.
   * @returns An array of strings, comprising each tag that was read.
   */
  function mrca() {

    var mrca_nodes, mrca;

    if (arguments.length == 1) {
      mrca_nodes = arguments[0];
    } else {
      mrca_nodes = Array.from(arguments);
    }

    mrca_nodes = mrca_nodes.map(function(mrca_node) {
      return typeof mrca_node == "string" ? mrca_node : mrca_node.name;
    });

    this.traverse_and_compute(function(node) {
      if (!node.children) {
        node.mrca = _.intersection([node.name], mrca_nodes);
      } else if (!node.parent) {
        if (!mrca) {
          mrca = node;
        }
      } else {
        node.mrca = _.union(...node.descendants().map(child => child.mrca));
        if (!mrca && node.mrca.length == mrca_nodes.length) {
          mrca = node;
        }
      }
    });

    return mrca;

  }

  /**
   * An instance of a phylotree. Sets event listeners, parses tags, and creates links
   * that represent branches.
   *
   * @param {Object} nwk - A Newick string, PhyloXML string, or hierarchical JSON representation of a phylogenetic tree.
   * @param {Object} options
   * - boostrap_values
   * - type - format type
   * @returns {Phylotree} phylotree - itself, following the builder pattern.
   */
  let Phylotree = class {

    constructor(nwk, options = {}) {

      this.newick_string = "";

      this.nodes = [];
      this.links = [];
      this.parsed_tags = [];
      this.partitions = [];
      this.branch_length_accessor = def_branch_length_accessor;
      this.branch_length = def_branch_length_accessor;
      this.logger = options.logger || console;
      this.selection_attribute_name = "selected";

      // initialization
      var bootstrap_values = options.bootstrap_values || "",
        type = options.type || undefined,
        _node_data = [],
        self = this;

      // If the type is a string, check the parser_registry
      if (_.isString(type)) {
        if (type in format_registry) {
          _node_data = format_registry[type](nwk, options);
        } else {
          // Hard failure
          self.logger.error(
            "type " +
              type +
              " not in registry! Available types are " +
              _.keys(format_registry)
          );
        }
      } else if (_.isFunction(type)) {
        // If the type is a function, try executing the function
        try {
          _node_data = type(nwk, options);
        } catch (e) {
          // Hard failure
          self.logger.error("Could not parse custom format!");
        }
      } else {
        // this builds children and links;
        if (nwk.name == "root") {
          // already parsed by phylotree.js
          _node_data = { json: nwk, error: null };
        } else if (typeof nwk != "string") {
          // old default
          _node_data = nwk;
        } else if (nwk.contentType == "application/xml") {
          // xml
          _node_data = phyloxml_parser(nwk);
        } else {
          // newick string
          this.newick_string = nwk;
          _node_data = newick_parser(nwk, bootstrap_values);
        }

      }

      if (!_node_data["json"]) {

        self.nodes = [];

      } else {

        self.nodes = d3.hierarchy(_node_data.json);

        // Parse tags
        let _parsed_tags = {};

        self.nodes.each(node => {
          if (node.data.annotation) {
            _parsed_tags[node.data.annotation] = true;
          }
        });

        self.parsed_tags = Object.keys(_parsed_tags);

      }

      self.links = self.nodes.links();

      return self;

    }

    /*
      Export the nodes of the tree with all local keys to JSON
      The return will be an array of nodes in the specified traversal_type
      ('post-order' : default, 'pre-order', or 'in-order')
      with parents and children referring to indices in that array

    */
    json(traversal_type) {

      var index = 0;

      this.traverse_and_compute(function(n) {
        n.json_export_index = index++;
      }, traversal_type);

      var node_array = new Array(index);

      index = 0;

      this.traverse_and_compute(function(n) {
        let node_copy = _.clone(n);
        delete node_copy.json_export_index;

        if (n.parent) {
          node_copy.parent = n.parent.json_export_index;
        }

        if (n.children) {
          node_copy.children = _.map(n.children, function(c) {
            return c.json_export_index;
          });
        }
        node_array[index++] = node_copy;
      }, traversal_type);

      this.traverse_and_compute(function(n) {
        delete n.json_export_index;
      }, traversal_type);

      return JSON.stringify(node_array);
    }

    /*
     * Traverse the tree in a prescribed order, and compute a value at each node.
     *
     * @param {Function} callback A function to be called on each node.
     * @param {String} traversal_type Either ``"pre-order"`` or ``"post-order"`` or ``"in-order"``.
     * @param {Node} root_node start traversal here, if provided, otherwise start at root
     * @param {Function} backtrack ; if provided, then at each node n, backtrack (n) will be called,
                                     and if it returns TRUE, traversal will NOT continue past into this
                                     node and its children
     */
    traverse_and_compute(callback, traversal_type, root_node, backtrack) {
      traversal_type = traversal_type || "post-order";

      function post_order(node) {
        if (_.isUndefined(node)) {
          return;
        }

        postOrder(node, callback, backtrack);

      }

      function pre_order(node) {
        preOrder(node, callback, backtrack);
      }

      function in_order(node) {
        inOrder(node, callback, backtrack);
      }

      if (traversal_type == "pre-order") {
        traversal_type = pre_order;
      } else {
        if (traversal_type == "in-order") {
          traversal_type = in_order;
        } else {
          traversal_type = post_order;
        }
      }

      traversal_type(root_node ? root_node : this.nodes);

      return this;

    }

    get_parsed_tags() {
      return this.parsed_tags;
    }

    update(json) {
      // update with new hiearchy layout
      this.nodes = json;
    }

    // Warning : Requires DOM!
    render(container, options) {
      this.display = new TreeRender(this, container, options);
      return this.display;
    }

  };

  Phylotree.prototype.is_leafnode = is_leafnode;
  Phylotree.prototype.mrca = mrca;
  Phylotree.prototype.has_branch_lengths = has_branch_lengths;
  Phylotree.prototype.get_branch_lengths = get_branch_lengths;
  Phylotree.prototype.branch_name = branch_name;
  Phylotree.prototype.normalize_branch_lengths = normalize;
  Phylotree.prototype.scale_branch_lengths = scale;
  Phylotree.prototype.get_newick = get_newick;
  Phylotree.prototype.resort_children = resort_children;
  Phylotree.prototype.set_branch_length = set_branch_length;
  Phylotree.prototype.max_parsimony = max_parsimony;

  Phylotree.prototype.leftChildRightSibling = leftChildRightSibling;

  _.extend(Phylotree.prototype, node_operations);
  _.extend(Phylotree.prototype, rooting);
  _.extend(Phylotree.prototype, nexus);

  /*
   *  given a tree, this function will compute quantities required to work with 
   *  all v all pairwise distances (like in COT) 
   *
   *  @param   tree the tree object
   *  @returns leaf count
   *
   */
  function compute_pairwise_distances(tree) {
    /*
     *    traverse the tree and populate the following values in each node
     *        
     *        .cot_computed_length -> for each node (except the root), the current branch length 
     *                                (so as to not compute them each time via a callback) 
     *        .cot_leaf_index      -> post_order traversal order of a leaf (0 to number of leaves - 1)
     *        
     *        for each node
     *        
     *        .cot_path_to_leaves_below   
     *                             -> a dictionary that maps a leaf index to the total path length from this node
     *                                to each of the descendant leaves, EXCLUDING the length of this branch
     *
     *        .cot_path_to_leaves_above   
     *                             -> a dictionary that maps a leaf index to the total path length from this node
     *                                to each of the leaves outside the split defined by this node, EXCLUDING
     *                                the length of this branch
     */

    var bl = tree.branch_length_accessor;

    if (!bl) {
      throw "A non-null branch lengths accessor function is required for this operation";
    }

    var leaf_count = 0;

    tree.traverse_and_compute(function(n) {
      n.cot_computed_length = bl(n);

   
      if (n.parent && _.isUndefined(n.cot_computed_length)) {
        throw "Non-null branch lengths are required for this operation: missing branch length at node " + n.data.name;
      }

      if (tree.is_leafnode(n)) {
        n.cot_leaf_index = leaf_count++;
        n.cot_path_to_leaves_below = {};
        n.cot_path_to_leaves_below[n.cot_leaf_index] = 0;
        n.cot_path_to_leaves_above = {};
      } else {
        n.cot_path_to_leaves_below = {};
        n.cot_path_to_leaves_above = {};
      }
    });

    // populate all cot_path_to_leaves_below
    tree.traverse_and_compute(function(n) {
      if (n.parent) {
        _.each(n.cot_path_to_leaves_below, function(length_so_far, leaf_index) {
          n.parent.cot_path_to_leaves_below[leaf_index] =
            length_so_far + n.cot_computed_length;
        });
      }
    });

    // populate all cot_path_to_leaves_above; this is done via a 'pre-order' traversal
    // handle root node first
    var root_node = tree.get_root_node();

    function _copy_from_siblings(a_node) {
      for (var this_node = 0; this_node < a_node.children.length; this_node++) {
        for (
          var other_node = 0;
          other_node < a_node.children.length;
          other_node++
        ) {
          if (this_node != other_node) {
            _.each(a_node.children[other_node].cot_path_to_leaves_below, function(
              length,
              index
            ) {
              if (a_node.children[this_node].cot_path_to_leaves_above) {
                a_node.children[this_node].cot_path_to_leaves_above[index] =
                  length + a_node.children[other_node].cot_computed_length;
              }
            });
          }
        }
      }
    }

    _copy_from_siblings(root_node);

    // takes two passes

    tree.traverse_and_compute(function(n) {
      if (n.parent) {
        // copy parent's 'above' nodes
        _.each(n.parent.cot_path_to_leaves_above, function(
          length_so_far,
          leaf_index
        ) {
          n.cot_path_to_leaves_above[leaf_index] =
            length_so_far + n.parent.cot_computed_length;
        });

        if (!tree.is_leafnode(n)) {
          _copy_from_siblings(n);
        }
        // copy sibling's 'below' nodes
      }
    }, "pre-order");

    return leaf_count;
  }

  /*
   * The Sackin's index is computed as the sum of the number of ancestors for each
   * tips of the tree.
   *
   * The less balanced a tree is, the larger its Sackin's index.
   *
   */

  function sackin(tree) {

    // Get tips of tree
    let tips = tree.get_tips();

    // Count number of ancestors to root for each tree
    let depths = _.map(tips, d => { return d.depth });

    return _.reduce(depths, function(memo, num){ return memo + num; }, 0);

  }

  function fitch(tree) {

    postOrder(tree.nodes, d => { d.visited = true; });


  }

  function center_of_tree(tree, power) {
    power = power || 2;

    var leaf_count = compute_pairwise_distances(tree);

    var current_min = Number.MAX_VALUE,
      current_split = 0,
      current_location = null;

    if (power == 2) {
      tree.traverse_and_compute(function(n) {
        if (n.parent) {
          // can't consider the root
          var sum_below = 0,
            sum_below_squared = 0,
            sum_above = 0,
            sum_above_squared = 0;

          var count_below = 0;

          _.each(n.cot_path_to_leaves_below, function(l) {
            sum_below += l;
            sum_below_squared += l * l;
            count_below++;
          });

          _.each(n.cot_path_to_leaves_above, function(l) {
            sum_above += l;
            sum_above_squared += l * l;
          });

          var count_above = leaf_count - count_below;

          var tt =
            (sum_above - sum_below + n.cot_computed_length * count_above) /
            leaf_count;
          if (tt < 0) {
            tt = 0;
          } else if (tt > n.cot_computed_length) {
            tt = n.cot_computed_length;
          }

          var score =
            sum_above_squared +
            sum_below_squared +
            2 * (sum_above * (n.cot_computed_length - tt) + sum_below * tt) +
            count_below * tt * tt +
            (n.cot_computed_length - tt) *
              (n.cot_computed_length - tt) *
              count_above;

          if (score < current_min) {
            current_location = n;
            current_split = tt / n.cot_computed_length; //n.cot_computed_length-tt;//1 - tt / n.cot_computed_length;
            current_min = score;
          }

          delete n.cot_computed_length;
          delete n.cot_path_to_leaves_below;
          delete n.cot_path_to_leaves_above;
          delete n.cot_leaf_index;
        }
      });
    } else {
      // in the general case try a simple grid optimization
      tree.traverse_and_compute(function(n) {
        if (n.parent) {
          // can't consider the root

          var optimization_step =
              n.cot_computed_length > 0.0 ? n.cot_computed_length * 0.05 : 0.1,
            current_t = 0;

          while (current_t < n.cot_computed_length) {
            var score = 0.0;

            _.each(n.cot_path_to_leaves_below, function(l) {
              score += Math.pow(l + current_t, power);
            });

            _.each(n.cot_path_to_leaves_above, function(l) {
              score += Math.pow(l + (n.cot_computed_length - current_t), power);
            });

            if (score < current_min) {
              current_location = n;
              current_split = current_t / n.cot_computed_length; //n.cot_computed_length-tt;//1 - tt / n.cot_computed_length;
              current_min = score;
            }
            current_t += optimization_step;
          }
        }
      });
    }

    return {
      location: current_location,
      breakpoint: current_split,
      distance: current_min
    };
  }

  /**
   * Compute midpoint of a phylogenetic tree
   * 
   * @param {Object} tree -- the phylotree.js tree object 
   * @return {Object} the calculated midpoint to root on
   *  { location: root_node, breakpoint: 0 }
   *
   */
  function compute_midpoint(tree) {
    if (!tree.has_branch_lengths()) {
      throw "Center of tree calculation cannot be performed on trees that do not have fully specified branch lengths";
    }

    var bl = tree.branch_length;

    tree.traverse_and_compute(function(node) {
      if (node.parent) {
        var my_longest_path_length = bl(node);
        var my_longest_path_terminus;

        if (tree.is_leafnode(node)) {
          my_longest_path_terminus = node;
          node.max_path = 0;
          node.max_path_terminus = node;
        } else {
          my_longest_path_length += node.max_path;
          my_longest_path_terminus = node.max_path_terminus;
        }

        if (
          !node.parent.max_path ||
          node.parent.max_path < my_longest_path_length
        ) {
          node.parent.max_path = my_longest_path_length;
          node.parent.max_path_terminus = my_longest_path_terminus;
        }
      }
    });

    var root_node = tree.get_root_node();
    var longest_path_length = 0;
    var second_longest;

    root_node.children.forEach(function(root_child) {
      if (root_child.max_path_terminus !== root_node.max_path_terminus) {
        var pl = root_child.max_path + bl(root_child);
        if (pl >= longest_path_length) {
          longest_path_length = pl;
          second_longest = root_child.max_path_terminus;
        }
      }
    });

    if (root_node.max_path > longest_path_length) {
      // not already midpoint rooted
      longest_path_length = (longest_path_length + root_node.max_path) * 0.5;

      // start traversing up from the deepest leaf to the root, until we find the
      // half-way point

      var root_on = root_node.max_path_terminus;

      while (true) {
        var current_bl = bl(root_on);
        //console.log (current_bl, longest_path_length);
        if (current_bl <= longest_path_length) {
          longest_path_length -= current_bl;
          root_on = root_on.parent;
        } else {
          //console.log ("Rooting on ", root_on, longest_path_length[0], current_bl);

          return {
            location: root_on,
            breakpoint: longest_path_length / current_bl
          };

          //console.log ("Longest " + root_path (tree.get_node_by_name(root_node.max_path_terminus.name)));
          //console.log ("Second longest " + root_path (tree.get_node_by_name(longest_path_length[1].name)));
        }
      }
    }
    return { location: root_node, breakpoint: 0 };
  }

  function annotate_copy_number(tree) {
    tree.traverse_and_compute(function(node) {
      if (tree.is_leafnode(node)) {
        node.data.copy_number = 1;
      }
    });
  }

  // internal function used by best root fitting
  function compute_root_to_tip_other_root(
    tree,
    node,
    coming_from,
    shared_distance,
    distance_to_new_root
  ) {

    var my_bl = tree.branch_length(node);

    var go_up = false;

    if (!coming_from) {
      shared_distance = node.data.root_to_tip;
      distance_to_new_root = 0;
      go_up = true;
    }

    if (node.children) {
      for (var c = 0; c < node.children.length; c++) {
        if (node.children[c] != coming_from) {
          compute_root_to_tip_other_root(
            tree,
            node.children[c],
            node,
            shared_distance,
            distance_to_new_root
          );
        } else {
          go_up = true;
        }
      }
    }

    node.data.rtta = node.data.root_to_tip - shared_distance + distance_to_new_root;

    if (go_up) {
      shared_distance -= my_bl;
      distance_to_new_root += my_bl;
    }

    if (node.parent && go_up) {
      compute_root_to_tip_other_root(
        tree,
        node.parent,
        node,
        shared_distance,
        distance_to_new_root
      );
    }
  }

  function fit_root_to_tip(tree) {

    var linear_data = [],
      max_r2 = 0,
      best_node = 0;

    annotate_copy_number(tree);
    root_to_tip(tree);

    // To return if best node is the root already
    tree.traverse_and_compute(function(node) {
      if (tree.is_leafnode(node) && !_.isNull(node.data.decimal_date_value)) {
        linear_data.push([node.data.decimal_date_value, node.data.rtta, node.data.copy_number]);
      }
    });

    let best_fit = linear_fit(linear_data);

    tree.traverse_and_compute(function(node) {

      if (tree.is_leafnode(node) && !_.isNull(node.data.decimal_date_value)) {

        compute_root_to_tip_other_root(tree, node, null, 0, 0);

        linear_data = [];

        tree.traverse_and_compute(function(node) {
          if (tree.is_leafnode(node) && !_.isNull(node.data.decimal_date_value)) {
            linear_data.push([
              node.data.decimal_date_value,
              node.data.rtta,
              node.data.copy_number
            ]);
          }
        });

        var fit = linear_fit(linear_data),
          r2 = fit["r2"];

        if (r2 > max_r2) {
          max_r2 = r2;
          best_node = node;
          best_fit = fit;
        }

      }
    });

    return { root: best_node, fit: best_fit };

  }

  // linear fit of root to tip distances
  function linear_fit(data) {

    var ss = data.reduce(function(p, c) {
        return c[2] + p;
      }, 0), // sample count
      sx = data.reduce(function(p, c) {
        return c[2] * c[0] + p;
      }, 0), // sum X
      sy = data.reduce(function(p, c) {
        return c[2] * c[1] + p;
      }, 0), // sum Y
      sxoss = sx / ss,
      syoss = sy / ss;

    var fitB = 0,
      st2 = 0,
      vary = 0;

    data.forEach(function(point) {
      var t = point[0] - sxoss;
      st2 += point[2] * t * t;
      fitB += point[2] * t * point[1];
      vary += point[2] * (point[1] - syoss) * (point[1] - syoss);
    });

    fitB /= st2;

    var a = (sy - sx * fitB) / ss;

    var varres = 0;

    data.forEach(function(point) {
      var t = point[1] - a - fitB * point[0];
      varres += point[2] * t * t;
    });

    return {
      intercept: a,
      slope: fitB,
      r2: 1 - varres / vary,
      "var (intercept)": Math.sqrt((1 + sx * sx / (ss * st2)) / ss),
      "var (slope)": Math.sqrt(1 / st2)
    };
  }

  /**
   *   fast and memory efficient root to tip distance calculator
   *   for each leaf node stores the current root to tip distance in 
   *   the node.root_to_tip field
   *   
   *   @param tree
   *   @return tree with root_to_tip computed
   *
   */
  function root_to_tip(tree) {

    var bl = tree.branch_length_accessor,
      index = 0;

    tree.traverse_and_compute(n => {
      if (n.parent) {
        n.data._computed_length = bl(n);
        if (!_.isNumber(n.data._computed_length)) {
          throw "root_to_tip cannot be run on trees with missing branch lengths";
        }
      }
      if (tree.is_leafnode(n)) {
        n.data.leaf_index = index++;
      }
      if ("r2t" in n.data) {
        delete n.data.r2t;
      }
    });

    tree.traverse_and_compute(n => {
      if (n.parent) {
        if (!("r2t" in n.parent.data)) {
          n.parent.data.r2t = {};
        }
        if (tree.is_leafnode(n)) {
          n.parent.data.r2t[n.data.leaf_index] = n.data._computed_length;
        } else {
          _.each(n.data.r2t, function(v, idx) {
            n.parent.data.r2t[idx] = v + n.data._computed_length;
          });
          delete n.data.r2t;
        }
        delete n.data._computed_length;
      }
    });

    var r2t = tree.get_root_node().data.r2t;

    tree.traverse_and_compute(n => {
      if (tree.is_leafnode(n)) {
        n.data.root_to_tip = r2t[n.data.leaf_index] || 0;
        delete n.data.leaf_index;
      }
    });

    delete tree.get_root_node().data.r2t;

    return tree;
  }

  const default_date_converter = d3.timeParse("%Y%m%d");

  const default_regexp = /([0-9]{4}).?([0-9]{2}).?([0-9]{2})$/g;

  const default_date_getter = function(node) {
    if (d3.layout.phylotree.is_leafnode(node)) {
      if ("name" in node) {
        var location = default_regexp.exec(node.name);
        if (location) {
          return location[1] + location[2] + location[3];
        }
      }
    }
    return null;
  };

  /*
   *  Extracts dates from nodes using a provided callback (defaults supplied),
   *  and also converts them to decimal dates; missing dates are allowed; if desired, missing dates 
   *  can throw exceptions 
   *  
   *  @param tree             : the tree object 
   *
   *  @param date_getter      : a function that extracts date strings from nodes (e.g. by parsing the name),
   *                            default is to extract from the end of the node name, using [YYYY] optional sep [MM] optional sep [DD] format;
   *                            default is implemented in phylotree_extensions.extract_dates.date_getter ()
   *                            
   *  @param date_converter   : if provided, will be used to parse the date string; default is %Y%m%d implemented in 
   *                            phylotree_extensions.extract_dates.date_converter
   *  
   *  
   *  @return tree with date-annotated nodes, i.e. each node will have
   *  
   *      n.date_value (date object, e.g. 2018-08-17); null for missing
   *      n.decimal_date_value (decimal object, e.g. 2018.72)
   *  
   */
  const extract_dates = function(tree, date_getter, date_converter=default_date_converter) {

    date_getter = date_getter || default_date_getter;
    
    tree.traverse_and_compute(function(n) {
      var d_string = date_getter(n);
      if (d_string) {
        try {
          n.data.date_value = date_converter(d_string);
          var full_year = n.data.date_value.getFullYear();
          var year_start = new Date(full_year, 0, 1),
            year_start_p1 = new Date(full_year + 1, 0, 1);

          n.data.decimal_date_value =
            full_year +
            (n.data.date_value - year_start) / (year_start_p1 - year_start);
          return;
        } catch (e) {
          // for conversion failures
        }
      }
      n.data.date_value = null;
      n.data.decimal_date_value = null;
    });

    return tree;
  };

  /**
   * Implements a linear time / space version of the Cluster picker algorithm
   * 
   * @param tree -- the tree object 
   * @param bootstrap_thresold -- value in [0,1] that sets the stringency of bootstrap support
   * @param diameter_threshold -- value >=0 that defines the maximum allowable pairwise distance in a cluster
   * @param root_node -- if specified, traverse the tree starting here (useful for only looking at parts of the tree),
   * tree root by default
   * @param missing_bootstrap_value -- if a branch is missing bootstrap support value, use this value instead
   *                   (1.0 by default)
   *                                 
   * @return an array of clusters, where cluster = 
   * {
   *    'root'   : [root node of cluster],
   *    'members' : [list of leaf. nodes],
   *    'diameter' : max distance in the cluster,
   *    'bootstrap' : bootstrap support at the root node
   * }                        
   */
  function cluster_picker(
    tree,
    bootstrap_threshold,
    diameter_threshold,
    root_node,
    missing_bootstrap_value
  ) {
    root_node = root_node || tree.get_root_node();
    missing_bootstrap_value = _.isNumber(missing_bootstrap_value)
      ? missing_bootstrap_value
      : 1;

    // perform a bottom-up pass of the tree
    // where each internal node will receive a floating point value
    // that stores the longest path from the internal node to any of its descendants,
    // the diameter of the cluster,  is then the sum of longest paths of all of its children
    let bl = tree.branch_length;

    // initialize member variables
    tree.traverse_and_compute(function(n) {
      if (n.parent) {
        n._computed_length = bl(n);
        if (!_.isNumber(n._computed_length)) {
          throw "cluster_picker cannot be run on trees with missing branch lengths";
        }
        n.max_path_length = 0;
      }
    });

    tree.traverse_and_compute(function(n) {
      if (n.parent) {
        n.parent.max_path_length = Math.max(
          n.parent.max_path_length,
          n.max_path_length + n._computed_length
        );
      }
    });

    var clusters = [];

    tree.traverse_and_compute(_.noop, "pre-order", root_node, function(n) {
      if (!tree.is_leafnode(n)) {
        var bs = _.isString(n.data.bootstrap_values)
          ? +n.data.bootstrap_values
          : missing_bootstrap_value;

        if (bs >= bootstrap_threshold) {
          var my_diameter = _.reduce(
            n.children,
            function(c, n) {
              return n.max_path_length + n._computed_length + c;
            },
            0
          );

          if (my_diameter <= diameter_threshold) {
            clusters.push({ root: n, diameter: my_diameter, bootstrap: bs });
            return true;
          }
        }
      }

      return false;
    });

    // clean up member variables
    tree.traverse_and_compute(
      function(n) {
        if (n.parent) {
          delete n._computed_length;
          delete n.max_path_length;
        }
      },
      "post-order",
      root_node
    );

    _.each(clusters, function(cluster) {
      cluster["members"] = [];
      tree.traverse_and_compute(
        function(n) {
          if (tree.is_leafnode(n)) {
            cluster["members"].push(n);
          }
        },
        "post-order",
        cluster["root"]
      );
    });

    return clusters;
  }

  function phylopart(
    tree,
    bootstrap_threshold,
    percentile_threshold,
    missing_bootstrap_value,
    resolution
  ) {
    /** TODO SLKP 20180817 : this implementation does not compute pairwise distances correctly at the moment;
     instead it computes root-to-tip distances */
    missing_bootstrap_value = _.isNumber(missing_bootstrap_value)
      ? missing_bootstrap_value
      : 1;

    var leaf_count = compute_pairwise_distances(tree);

    /** first, decide on the domain of branch lengths **/

    var core_node = tree.get_root_node().children[0];

    var min_bl = Number.MAX_VALUE,
      min_bl2 = Number.MAX_VALUE;

    if (!(percentile_threshold > 0 && percentile_threshold < 1)) {
      throw "Invalid percentile threshold in perform_phylopart";
    }

    tree.traverse_and_compute(function(n) {
      if (tree.is_leafnode(n)) {
        if (n.cot_computed_length < min_bl) {
          if (min_bl < min_bl2) {
            min_bl2 = min_bl;
          }
          min_bl = n.cot_computed_length;
        } else {
          if (n.cot_computed_length < min_bl2) {
            min_bl2 = n.cot_computed_length;
          }
        }
      }
    });

    min_bl += min_bl2;

    // pairwise distances are bounded below by the sum of two shortest terminal branches

    // compute the upper bound
    var max_path_length =
      _.reduce(
        core_node.cot_path_to_leaves_below,
        function(c, n) {
          return n > c ? n : c;
        },
        0
      ) +
      _.reduce(
        core_node.cot_path_to_leaves_above,
        function(c, n) {
          return n > c ? n : c;
        },
        0
      ) +
      core_node.cot_computed_length;

    var domain = max_path_length - min_bl;

    if (_.isUndefined(resolution)) {
      resolution = Math.min(1e-3, domain / 100);
    }

    var number_of_bins = ((domain / resolution) >> 0) + 1;
    if (number_of_bins > 500) {
      number_of_bins = 500;
      resolution = domain / number_of_bins;
    }

    var root_node = tree.get_root_node();

    root_node.paths_to_leaves = new Array(leaf_count);

    _.each(root_node.children, function(cn) {
      _.each(root_node.cot_path_to_leaves_below, function(v, i) {
        root_node.paths_to_leaves[i] = v + cn.cot_computed_length;
      });
    });

    tree.traverse_and_compute(function(n) {
      if (!tree.is_leafnode(n)) {
        n.histogram = new Array(number_of_bins);
        for (var i = 0; i < number_of_bins; i++) {
          n.histogram[i] = 0;
        }
        if (n.parent) {
          var index = 0;
          n.paths_to_leaves = [];
          _.each(n.cot_path_to_leaves_below, function(v, i) {
            n.paths_to_leaves[index++] = v;
          });
        }
      }
      delete n.cot_path_to_leaves_above;
      delete n.cot_path_to_leaves_below;
    });

    /**
          for each internal node, produce a histogram of pairwise distances on sequences that are defined 
          by the subtree at that node
          
          this could be approximated (I think), by merging histograms of children
      */

    tree.traverse_and_compute(function(n) {
      if (!tree.is_leafnode(n)) {
        for (var n1 = 0; n1 < n.paths_to_leaves.length; n1++) {
          for (var n2 = n1 + 1; n2 < n.paths_to_leaves.length; n2++) {
            var sum = n.paths_to_leaves[n1] + n.paths_to_leaves[n2];
            n.histogram[((sum - min_bl) / resolution) >> 0]++;
          }
        }
        n.leaf_count = n.paths_to_leaves.length;

        delete n.paths_to_leaves;
      }
    });

    // compute the percentile distance cutoff

    var total_comparisons =
      (leaf_count - 1) * leaf_count / 2 * percentile_threshold;
    var bin_i = 0;
    for (
      ;
      bin_i < number_of_bins - 1 &&
      total_comparisons > root_node.histogram[bin_i];
      bin_i++
    ) {
      total_comparisons -= root_node.histogram[bin_i];
    }

    var median_threshold =
      min_bl +
      (bin_i +
        (root_node.histogram[bin_i] - total_comparisons) /
          root_node.histogram[bin_i]) *
        resolution;

    var clusters = [];

    tree.traverse_and_compute(_.noop, "pre-order", null, function(n) {
      if (!tree.is_leafnode(n)) {
        var bs = _.isString(n.data.bootstrap_values)
          ? +n.data.bootstrap_values
          : missing_bootstrap_value;
        if (bs >= bootstrap_threshold) {
          var total_comparisons = n.leaf_count * (n.leaf_count - 1) * 0.25;

          var bin_i = 0;
          for (
            ;
            bin_i < number_of_bins - 1 && total_comparisons > n.histogram[bin_i];
            bin_i++
          ) {
            total_comparisons -= n.histogram[bin_i];
          }

          var my_median =
            min_bl +
            (bin_i +
              (n.histogram[bin_i] - total_comparisons) / n.histogram[bin_i]) *
              resolution;

          if (my_median <= median_threshold) {
            clusters.push({ root: n, median: my_median, bootstrap: bs });
            return true;
          }
        }
      }
      return false;
    });

    tree.traverse_and_compute(function(n) {
      if (!tree.is_leafnode(n)) {
        if ("histogram" in n) {
          delete n.histogram;
          delete n.leaf_count;
        }
      }
    });

    _.each(clusters, function(cluster) {
      cluster["members"] = [];
      tree.traverse_and_compute(
        function(n) {
          if (tree.is_leafnode(n)) {
            cluster["members"].push(n);
          }
        },
        "post-order",
        cluster["root"]
      );
    });

    return clusters;
  }

  exports.center_of_tree = center_of_tree;
  exports.cluster_picker = cluster_picker;
  exports.compute_midpoint = compute_midpoint;
  exports.extract_dates = extract_dates;
  exports.fit_root_to_tip = fit_root_to_tip;
  exports.fitch = fitch;
  exports.inOrder = inOrder;
  exports.leftChildRightSibling = leftChildRightSibling;
  exports.load_annotations = load_annotations;
  exports.pairwise_distances = compute_pairwise_distances;
  exports.parse_annotations = parse_annotations;
  exports.phylopart = phylopart;
  exports.phylotree = Phylotree;
  exports.postOrder = postOrder;
  exports.preOrder = preOrder;
  exports.root_to_tip = root_to_tip;
  exports.sackin = sackin;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=phylotree.js.map
