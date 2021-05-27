import * as d3 from "d3";
import * as _ from "underscore";

import { default as parser_registry } from "./formats/registry";
import { default as newickParser, getNewick } from "./formats/newick";
import { default as getTipLengths } from "./export";
import * as nexus from "./formats/nexus";
import { default as phyloxml_parser } from "./formats/phyloxml";
import { default as maxParsimony } from "./max-parsimony";
import { leftChildRightSibling, postOrder, preOrder, default as inOrder } from "./traversal";

import {
  default as hasBranchLengths,
  getBranchLengths,
  defBranchLengthAccessor,
  setBranchLength,
  branchName,
  normalize,
  scale
} from "./branches";

import * as node_operations from "./nodes";
import * as rooting from "./rooting";
import { default as TreeRender } from "./render/draw";

function resortChildren(comparator, start_node, filter) {
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
    this.branch_length_accessor = defBranchLengthAccessor;
    this.branch_length = defBranchLengthAccessor;
    this.logger = options.logger || console;
    this.selection_attribute_name = "selected";

    // initialization
    var type = options.type || undefined,
      _node_data = [],
      self = this;

    // If the type is a string, check the parser_registry
    if (_.isString(type)) {
      if (type in parser_registry) {
        _node_data = parser_registry[type](nwk, options);
      } else {
        // Hard failure
        self.logger.error(
          "type " +
            type +
            " not in registry! Available types are " +
            _.keys(parser_registry)
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
        _node_data = newickParser(nwk, options);
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

    // If no branch lengths are supplied, set all to 1
    if(!this.hasBranchLengths()) {
      console.warn("Phylotree User Warning : NO BRANCH LENGTHS DETECTED, SETTING ALL LENGTHS TO 1");
      this.setBranchLength(x => 1)
    }

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
  render(options) {
    this.display = new TreeRender(this, options);
    return this.display;
  }

};

Phylotree.prototype.isLeafNode = node_operations.isLeafNode;
Phylotree.prototype.mrca = mrca;
Phylotree.prototype.hasBranchLengths = hasBranchLengths;
Phylotree.prototype.getBranchLengths = getBranchLengths;
Phylotree.prototype.branchName = branchName;
Phylotree.prototype.normalizeBranchLengths = normalize;
Phylotree.prototype.scaleBranchLengths = scale;
Phylotree.prototype.getNewick = getNewick;
Phylotree.prototype.resortChildren = resortChildren;
Phylotree.prototype.setBranchLength = setBranchLength;
Phylotree.prototype.maxParsimony = maxParsimony;

Phylotree.prototype.getTipLengths = getTipLengths;
Phylotree.prototype.leftChildRightSibling = leftChildRightSibling;

_.extend(Phylotree.prototype, node_operations);
_.extend(Phylotree.prototype, rooting);
_.extend(Phylotree.prototype, nexus);

export function itemTagged(item) {
  return item.tag || false;
}

export default Phylotree;
