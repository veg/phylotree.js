import "d3";

import { default as parser_registry } from "./formats/registry";
import { default as nexml_parser } from "./formats/nexml";
import { default as newick_parser } from "./formats/newick";
import { default as d3_phylotree_phyloxml_parser } from "./formats/phyloxml";

import { x_coord, y_coord } from "./coordinates";
import { draw_arc, cartesian_to_polar, arc_segment_placer } from "./radial";
import { draw_line, line_segment_placer } from "./cartesian";
import * as inspector from "./inspectors";
import * as menus from "./menus";
import "./options";

/**
 * Traverse the tree in a prescribed order, and compute a value at each node.
 *
 * @param {Function} callback A function to be called on each node.
 * @param {String} traversal_type Either ``"pre-order"`` or ``"post-order"`` or ``"in-order"``.
 * @param {Node} root_node start traversal here, if provided, otherwise start at root
 * @param {Function} backtrack ; if provided, then at each node n, backtrack (n) will be called,
																 and if it returns TRUE, traversal will NOT continue past into this
																 node and its children
 */
function traverse_and_compute (
	callback,
	traversal_type,
	root_node,
	backtrack
) {

	traversal_type = traversal_type || "post-order";

	function post_order(node) {
		if (_.isUndefined(node)) {
			return;
		}

		let descendants = node.children;

		if (!(backtrack && backtrack(node))) {
			if (!_.isUndefined(descendants)) {
				for (let k = 0; k < descendants.length; k++) {
					post_order(descendants[k]);
				}
				callback(descendants[0]);
			}
		}
	}

	function pre_order(node) {
		if (!(backtrack && backtrack(node))) {
			callback(node);
			if (node.children) {
				for (let k = 0; k < node.children.length; k++) {
					pre_order(node.children[k]);
				}
			}
		}
	}

	function in_order(node) {
		if (!(backtrack && backtrack(node))) {
			if (node.children) {
				let upto = Min(node.children.length, 1);
				for (let k = 0; k < upto; k++) {
					in_order(node.children[k]);
				}
				callback(node);
				for (var k = upto; k < node.children; k++) {
					// eslint-disable-line no-redeclare
					in_order(node.children[k]);
				}
			} else {
				callback(node);
			}
		}
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

	traversal_type(root_node ? root_node : self.nodes);
	return phylotree;

};

/**
 * Change option settings.
 *
 * @param {Object} opt Keys are the option to toggle and values are
 * the parameters for that option.
 * @param {Boolean} run_update (optional) Whether or not the tree should update.
 * @returns The current ``phylotree``.
 */
function options(opt, run_update) {

	if (!arguments.length) return options;

	let do_update = false;

	for (var key in options) {
		if (key in opt && opt[key] != options[key]) {
			do_update = true;
			options[key] = opt[key];
			switch (key) {
				case "branches":
					{
						switch (opt[key]) {
							case "straight": {
								draw_branch.curve(d3.curveLinear);
								break;
							}
							default: {
								draw_branch.curve(d3.curveStepBefore);
								break;
							}
						}
					}
					break;
			}
		}
	}

	if (run_update && do_update) {
		phylotree.layout();
	}

	return phylotree;
};

// replacement for d3.functor
function constant(x) {
  return function() {
    return x;
  };
}

function resort_children (comparator, start_node, filter) {

	// ascending
	this.nodes
		.sum(function(d) {
			return d.value;
		})
		.sort(comparator);

	phylotree.update_layout(this.nodes);
	phylotree.update();

	return phylotree;

};

/**
 * Return most recent common ancestor of a pair of nodes.
 *
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

function defaults() {

  var self = {},
    size = [1, 1],
    phylo_attr = [1, 1],
    newick_string = "",
    rescale_node_span = 1,
    separation = function(_node, _previos) {
      return 0;
    },
    node_span = function(_node) {
      return 1;
    },
    relative_node_span = function(_node) {
      return node_span(_node) / rescale_node_span;
    },
    def_branch_length_accessor = function(_node) {
      let _node_data = _node.data;

      if (
        "attribute" in _node_data &&
        _node_data["attribute"] &&
        _node_data["attribute"].length
      ) {
        let bl = parseFloat(_node_data["attribute"]);
        if (!isNaN(bl)) {
          return Math.max(0, bl);
        }
      }
      return undefined;
    },
    nodes = [],
    links = [],
    parsed_tags = [],
    partitions = [],
    branch_length_accessor = def_branch_length_accessor,
    options = options;

  self.container = container || "body";
  self.logger = options.logger;

}

/**
 * An instance of a phylotree. Sets event listeners, parses tags, and creates links
 * that represent branches.
 *
 * @param {Object} nwk - A Newick string, PhyloXML string, or hierarchical JSON representation of a phylogenetic tree.
 * @param {Object} options
 * - boostrap_values
 * - type -
 * @returns {Phylotree} phylotree - itself, following the builder pattern.
 */
function phylotree(nwk, options = {}) {

	d3_phylotree_add_event_listener();

	var bootstrap_values = options.bootstrap_values || "";
	var type = options.type || undefined;
	var _node_data;
	var nodes = [];

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
		} else if (nwk[0] == "<") {
			// xml
			_node_data = d3_phylotree_phyloxml_parser(nwk);
		} else {
			// newick string
			_node_data = d3_phylotree_newick_parser(nwk, bootstrap_values);
		}
	}

	if (!_node_data["json"]) {
		self.nodes = [];
	} else {

		newick_string = nwk;
		self.nodes = d3.hierarchy(_node_data.json);

		// Parse tags
		let _parsed_tags = {};
		self.nodes.each(node => {
			if (node.name) {
				let left_bracket_index = node.name.indexOf("{");
				if (left_bracket_index > -1) {
					let tag = node.name.slice(
						left_bracket_index + 1,
						node.name.length - 1
					);

					node[tag] = true;
					_parsed_tags[tag] = true;
					node.name = node.name.slice(0, left_bracket_index);
				}
			}
		});

		parsed_tags = Object.keys(_parsed_tags);

	}

	links = self.nodes.links();
	return phylotree;
}

/**
	Export the nodes of the tree with all local keys to JSON
	The return will be an array of nodes in the specified traversal_type
	('post-order' : default, 'pre-order', or 'in-order')
	with parents and children referring to indices in that array

*/
function json (traversal_type) {

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

};

function handle_node_click (node) {
	menus.node_dropdown_menu(node, self.container, phylotree, options);
};

Phylotree.prototype = {
  constructor: phylotree,
	handle_node_click : handle_node_click,
	is_leafnode : inspector.is_leafnode,
	menus : menus,
	mrca : mrca,
	newick_parser : newick_parser,
	nexml_parser : nexml_parser,
	traverse_and_compute : traverse_and_compute
};

export default Phylotree;

