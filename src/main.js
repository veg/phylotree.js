import "d3";

import { default as parser_registry } from "./formats/registry";
import { default as nexml_parser } from "./formats/nexml";
import { default as d3_phylotree_newick_parser } from "./formats/newick";
import { default as d3_phylotree_phyloxml_parser } from "./formats/phyloxml";

import { x_coord, y_coord } from "./coordinates";
import { draw_arc, cartesian_to_polar, arc_segment_placer } from "./radial";
import { draw_line, line_segment_placer } from "./cartesian";
import * as inspector from "./inspectors";
import * as menus from "./menus";
import "./options";

// replacement for d3.functor
function constant(x) {
  return function() {
    return x;
  };
}

/**
 * Instantiate a phylotree.
 *
 * @param {d3-selection} container - Specify a container, for things like menu
 * and tooltip placement. Defaults to body (optional).
 * @returns {Function} phylotree - an instance of a Phylotree.
 */
phylotree = function(container) {
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
    branch_length_accessor = def_branch_length_accessor,
    options = options;
  (node_label = def_node_label), (svg = null), (selection_callback = null), (css_classes = {
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
  }), (nodes = []), (links = []), (parsed_tags = []), (partitions = []), (scales = [
    1,
    1
  ]), (fixed_width = [
    15,
    20
  ]), (font_size = 12), (scale_bar_font_size = 12), (offsets = [
    0,
    font_size / 2
  ]), (ensure_size_is_in_px = function(value) {
    return typeof value === "number" ? value + "px" : value;
  });

  self.container = container || "body";
  self.logger = options.logger;

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
  const newick_parser = function(nwk_str, bootstrap_values) {
    return d3_phylotree_newick_parser(nwk_str, {
      bootstrap_values: bootstrap_values
    });
  };

  /*--------------------------------------------------------------------------------------*/

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
      var _parsed_tags = {};
      self.nodes.each(node => {
        if (node.name) {
          var left_bracket_index = node.name.indexOf("{");
          if (left_bracket_index > -1) {
            var tag = node.name.slice(
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

  phylotree.separation = function(attr) {
    if (!arguments.length) return separation;
    separation = attr;
    return phylotree;
  };

  /**
   * Getter/setter for the selection label. Useful when allowing
   * users to make multiple selections.
   *
   * @param {String} attr (Optional) If setting, the new selection label.
   * @returns The current selection label if getting, or the current ``phylotree`` if setting.
   */
  phylotree.selection_label = function(attr) {
    if (!arguments.length) return selection_attribute_name;
    selection_attribute_name = attr;
    phylotree.sync_edge_labels();
    return phylotree;
  };

  phylotree.handle_node_click = function(node) {
    menus.node_dropdown_menu(node, self.container, phylotree, options);
  };

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
  phylotree.style_nodes = function(attr) {
    if (!arguments.length) return node_styler;
    node_styler = attr;
    return phylotree;
  };

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
  phylotree.style_edges = function(attr) {
    if (!arguments.length) return edge_styler;
    edge_styler = attr.bind(this);
    return phylotree;
  };

  /**
   * Return Newick string representation of a phylotree.
   *
   * @param {Function} annotator - Function to apply to each node, determining
   * what label is written (optional).
   * @returns {String} newick - Phylogenetic tree serialized as a Newick string.
   */
  phylotree.get_newick = function(annotator) {
    if (!annotator) annotator = d => d.name;
    function escape_string(nn) {
      var need_escape = /[\s\[\]\,\)\(\:\'\"]/;
      var enquote = need_escape.test(nn);
      return enquote ? "'" + nn.replace("'", "''") + "'" : nn;
    }

    function node_display(n) {
      if (!inspector.is_leafnode(n)) {
        element_array.push("(");
        n.children.forEach(function(d, i) {
          if (i) {
            element_array.push(",");
          }
          node_display(d);
        });
        element_array.push(")");
      }

      element_array.push(escape_string(node_label(n)));
      element_array.push(annotator(n));

      var bl = branch_length_accessor(n);

      if (bl !== undefined) {
        element_array.push(":" + bl);
      }
    }

    var element_array = [];
    annotator = annotator || "";
    node_display(self.nodes);
    return element_array.join("");
  };

  phylotree.sync_edge_labels = function() {
    links.forEach(function(d) {
      d[selection_attribute_name] = d.target[selection_attribute_name] || false;
      d.tag = d.target.tag || false;
    });

    d3_phylotree_trigger_refresh(phylotree);

    if (phylotree.count_handler()) {
      let counts = {};

      counts[selection_attribute_name] = links.reduce(function(p, c) {
        return p + (c[selection_attribute_name] ? 1 : 0);
      }, 0);

      counts["tagged"] = links.reduce(function(p, c) {
        return p + (inspector.item_tagged(c) ? 1 : 0);
      }, 0);

      d3_phylotree_trigger_count_update(
        phylotree,
        counts,
        phylotree.count_handler()
      );
    }
  };

  /**
    Export the nodes of the tree with all local keys to JSON
    The return will be an array of nodes in the specified traversal_type
    ('post-order' : default, 'pre-order', or 'in-order')
    with parents and children referring to indices in that array

  */

  phylotree.json = function(traversal_type) {
    var index = 0;

    phylotree.traverse_and_compute(function(n) {
      n.json_export_index = index++;
    }, traversal_type);

    var node_array = new Array(index);
    index = 0;
    phylotree.traverse_and_compute(function(n) {
      var node_copy = _.clone(n);
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

    phylotree.traverse_and_compute(function(n) {
      delete n.json_export_index;
    }, traversal_type);

    return JSON.stringify(node_array);
  };

  phylotree.trigger_refresh = function() {
    trigger_refresh(phylotree);
  };

  /**
   * Determine whether a given node is a leaf node.
   *
   * @param {Node} node A node in the phylotree.
   * @returns {Boolean} Whether or not the argument is a leaf node.
   */
  phylotree.is_leafnode = inspector.is_leafnode;

  phylotree.radial = function(attr) {
    if (!arguments.length) return options["is-radial"];
    options["is-radial"] = attr;
    return phylotree;
  };

  phylotree.internal_names = function(attr) {
    if (!arguments.length) return options["internal-names"];
    options["internal-names"] = attr;
    return phylotree;
  };

  phylotree.show_internal_name = function(node) {
    var i_names = phylotree.internal_names();
    if (i_names) {
      if (typeof i_names === "function") {
        return i_names(node);
      }
      return i_names;
    }
    return false;
  };

  phylotree.align_tips = function(attr) {
    if (!arguments.length) return options["align-tips"];
    options["align-tips"] = attr;
    return phylotree;
  };

  /**
   * Return the bubble size of the current node.
   *
   * @param {Node} A node in the phylotree.
   * @returns {Float} The size of the bubble associated to this node.
   */
  phylotree.node_bubble_size = function(node) {
    return options["draw-size-bubbles"]
      ? relative_node_span(node) * scales[0] * 0.5
      : 0;
  };

  phylotree.shift_tip = function(d) {
    if (options["is-radial"]) {
      return [
        (d.text_align == "end" ? -1 : 1) * (radius_pad_for_bubbles - d.radius),
        0
      ];
    }
    if (options["right-to-left"]) {
      return [right_most_leaf - d.screen_x, 0];
    }
    return [right_most_leaf - d.screen_x, 0];
  };

  /**
   * Get nodes which are currently selected.
   *
   * @returns {Array} An array of nodes that match the current selection.
   */
  phylotree.get_selection = function() {
    return self.nodes.filter(function(d) {
      return d[selection_attribute_name];
    });
  };

  phylotree.count_handler = function(attr) {
    if (!arguments.length) return count_listener_handler;
    count_listener_handler = attr;
    return phylotree;
  };

  phylotree.layout_handler = function(attr) {
    if (!arguments.length) return layout_listener_handler;
    layout_listener_handler = attr;
    return phylotree;
  };

  phylotree.internal_label = function(callback, respect_existing) {
    phylotree.clear_internal_nodes(respect_existing);

    for (var i = self.nodes.length - 1; i >= 0; i--) {
      var d = self.nodes[i];
      if (
        !(
          inspector.is_leafnode(d) ||
          inspector.item_selected(d, selection_attribute_name)
        )
      ) {
        d[selection_attribute_name] = callback(d.children);
      }
    }

    phylotree.modify_selection(function(d, callback) {
      if (inspector.is_leafnode(d.target)) {
        return d.target[selection_attribute_name];
      }
      return d.target[selection_attribute_name];
    });
  };

  phylotree.max_parsimony = function(respect_existing) {
    phylotree.clear_internal_nodes(respect_existing);

    function populate_mp_matrix(d) {
      d.mp = [
        [0, 0], // score for parent selected / not selected
        [false, false]
      ]; // selected or not

      if (inspector.is_leafnode(d)) {
        d.mp[1][0] = d.mp[1][1] = d[selection_attribute_name] || false;
        d.mp[0][0] = d.mp[1][0] ? 1 : 0;
        d.mp[0][1] = 1 - d.mp[0][0];
      } else {
        d.children.forEach(populate_mp_matrix);

        var s0 = d.children.reduce(function(p, n) {
          return n.mp[0][0] + p;
        }, 0);
        // cumulative children score if this node is 0
        var s1 = d.children.reduce(function(p, n) {
          return n.mp[0][1] + p;
        }, 0);
        // cumulative children score if this node is 1

        // parent = 0

        if (d[selection_attribute_name]) {
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

    populate_mp_matrix(self.nodes[0]);
    self.nodes.each(function(d) {
      if (d.parent) {
        d.mp = d.mp[1][d.parent.mp ? 1 : 0];
      } else {
        d.mp = d.mp[1][d.mp[0][0] < d.mp[0][1] ? 0 : 1];
      }
    });

    phylotree.modify_selection(function(d, callback) {
      if (inspector.is_leafnode(d.target)) {
        return d.target[selection_attribute_name];
      }
      return d.target.mp;
    });
  };

  /**
   * Get or set the current node span. If setting, the argument should
   * be a function of a node which returns a number, so that node spans
   * can be determined dynamically. Alternatively, the argument can be the
   * string ``"equal"``, to give all nodes an equal span.
   *
   * @param {Function} attr Optional; if setting, the node_span function.
   * @returns The ``node_span`` if getting, or the current ``phylotree`` if setting.
   */
  phylotree.node_span = function(attr) {
    if (!arguments.length) return node_span;
    if (typeof attr == "string" && attr == "equal") {
      node_span = function(d) {
        return 1;
      };
    } else {
      node_span = attr;
    }
    return phylotree;
  };

  phylotree.resort_children = function(comparator, start_node, filter) {
    // ascending
    self.nodes
      .sum(function(d) {
        return d.value;
      })
      .sort(comparator);

    phylotree.update_layout(self.nodes);
    phylotree.update();

    return phylotree;
  };

  phylotree.graft_a_node = function(graft_at, new_child, new_parent, lengths) {
    if (graft_at.parent) {
      var node_index = self.nodes.indexOf(graft_at);
      if (node_index >= 0) {
        var parent_index = graft_at.parent.children.indexOf(graft_at);

        var new_split = {
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

        //phylotree.update_layout(self.nodes, true);
      }
    }
    return phylotree;
  };

  /**
   * Delete a given node.
   *
   * @param {Node} The node to be deleted, or the index of such a node.
   * @returns The current ``phylotree``.
   */
  phylotree.delete_a_node = function(index) {
    if (typeof index != "number") {
      return phylotree.delete_a_node(self.nodes.indexOf(index));
    }

    if (index > 0 && index < self.nodes.length) {
      var node = nodes[index];
      if (node.parent) {
        // can only delete nodes that are not the root
        var delete_me_idx = node.parent.children.indexOf(node);

        if (delete_me_idx >= 0) {
          self.nodes.splice(index, 1);
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
              node.parent.children[1 - delete_me_idx].parent =
                node.parent.parent;
              self.nodes.splice(nodes.indexOf(node.parent), 1);
            } else {
              self.nodes.splice(0, 1);
              self.nodes.parent = null;
              delete self.nodes.data["attribute"];
              delete self.nodes.data["annotation"];
              delete self.nodes.data["original_child_order"];
              self.nodes.name = "root";
              self.nodes.data.name = "root";
            }
          }
          //phylotree.update_layout(self.nodes, true);
        }
      }
    }
    return phylotree;
  };

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
  phylotree.traverse_and_compute = function(
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
          for (var k = 0; k < node.children.length; k++) {
            pre_order(node.children[k]);
          }
        }
      }
    }

    function in_order(node) {
      if (!(backtrack && backtrack(node))) {
        if (node.children) {
          var upto = Min(node.children.length, 1);
          for (var k = 0; k < upto; k++) {
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
 * Reroot the tree on the given node.
 *
 * @param {Node} node Node to reroot on.
 * @param {fraction} if specified, partition the branch not into 0.5 : 0.5, but according to 
                     the specified fraction
                     
 * @returns {Phylotree} The current ``phylotree``.
 */
  phylotree.reroot = function(node, fraction) {
    /** TODO add the option to root in the middle of a branch */

    fraction = fraction !== undefined ? fraction : 0.5;

    if (node.parent) {
      new_json = {
        name: "new_root",
        __mapped_bl: undefined,
        children: [node]
      };

      self.nodes.each(function(n) {
        n.__mapped_bl = branch_length_accessor(n);
      });

      phylotree.branch_length(function(n) {
        return n.__mapped_bl;
      });

      var remove_me = node,
        current_node = node.parent,
        stashed_bl = _.noop();

      var apportioned_bl =
        node.__mapped_bl === undefined
          ? undefined
          : node.__mapped_bl * fraction;
      stashed_bl = current_node.__mapped_bl;
      current_node.__mapped_bl =
        node.__mapped_bl === undefined
          ? undefined
          : node.__mapped_bl - apportioned_bl;
      node.__mapped_bl = apportioned_bl;

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

          var t = current_node.parent.__mapped_bl;
          if (t !== undefined) {
            current_node.parent.__mapped_bl = stashed_bl;
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
        stashed_bl = current_node.__mapped_bl;
        remove_me = new_json;
      }

      // current_node is now old root, and remove_me is the root child we came up
      // the tree through

      if (current_node.children.length == 1) {
        if (stashed_bl) {
          current_node.children[0].__mapped_bl += stashed_bl;
        }
        remove_me.children = remove_me.children.concat(current_node.children);
      } else {
        var new_node = {
          name: "__reroot_top_clade"
        };
        new_node.__mapped_bl = stashed_bl;
        new_node.children = current_node.children.map(function(n) {
          return n;
        });

        remove_me.children.push(new_node);
      }

      phylotree.update_layout(new_json, true);
    }
    return phylotree;
  };

  /**
   * Update a given key name in each node.
   *
   * @param {String} old_key The old key name.
   * @param {String} new_key The new key name.
   * @returns The current ``phylotree``.
   */
  phylotree.update_key_name = function(old_key, new_key) {
    self.nodes.each(function(n) {
      if (old_key in n) {
        if (new_key) {
          n[new_key] = n[old_key];
        }
        delete n[old_key];
      }
    });
    phylotree.sync_edge_labels();
    return phylotree;
  };

  phylotree.update_has_hidden_nodes = function() {
    for (let k = self.nodes.length - 1; k >= 0; k -= 1) {
      if (inspector.is_leafnode(self.nodes[k])) {
        self.nodes[k].has_hidden_nodes = self.nodes[k].notshown;
      } else {
        self.nodes[k].has_hidden_nodes = self.nodes[k].children.reduce(function(
          p,
          c
        ) {
          return c.notshown || p;
        }, false);
      }
    }

    return phylotree;
  };

  /**
   * Get or set branch length accessor.
   *
   * @param {Function} attr Empty if getting, or new branch length accessor if setting.
   * @returns {Object} The branch length accessor if getting, or the current phylotree if setting.
   */
  phylotree.branch_length = function(attr) {
    if (!arguments.length) return branch_length_accessor;
    branch_length_accessor = attr ? attr : def_branch_length_accessor;
    return phylotree;
  };

  /**
   * Returns T/F whether every branch in the tree has a branch length
   *
   * @returns {Object} true if  every branch in the tree has a branch length
   */
  phylotree.has_branch_lengths = function() {
    var bl = phylotree.branch_length();
    if (bl) {
      return _.every(phylotree.get_nodes(), function(node) {
        return !node.parent || !_.isUndefined(bl(node));
      });
    }
    return false;
  };

  /**
   * Get or set branch name accessor.
   *
   * @param {Function} attr (Optional) If setting, a function that accesses a branch name
   * from a node.
   * @returns The ``node_label`` accessor if getting, or the current ``phylotree`` if setting.
   */
  phylotree.branch_name = function(attr) {
    if (!arguments.length) return node_label;
    node_label = attr ? attr : def_node_label;
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
  phylotree.options = function(opt, run_update) {
    if (!arguments.length) return options;

    var do_update = false;

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

  phylotree.reclass_edge = function(edge) {
    var class_var = css_classes["branch"];
    if (inspector.item_tagged(edge)) {
      class_var += " " + css_classes["tagged-branch"];
    }
    if (inspector.item_selected(edge, selection_attribute_name)) {
      class_var += " " + css_classes["selected-branch"];
    }
    return class_var;
  };

  phylotree.reclass_node = function(node) {
    var class_var =
      css_classes[inspector.is_leafnode(node) ? "node" : "internal-node"];

    if (inspector.item_tagged(node)) {
      class_var += " " + css_classes["tagged-node"];
    }

    if (inspector.item_selected(node, selection_attribute_name)) {
      class_var += " " + css_classes["selected-node"];
    }

    if (!node["parent"]) {
      class_var += " " + css_classes["root-node"];
    }

    if (inspector.is_node_collapsed(node) || inspector.has_hidden_nodes(node)) {
      class_var += " " + css_classes["collapsed-node"];
    }
    return class_var;
  };

  /**
   * Get an array of all nodes.
   * @returns {Array} Nodes in the current ``phylotree``.
   */
  phylotree.get_nodes = function() {
    return self.nodes;
  };

  /**
   * Get the tips of the tree
   * @returns {Array} Nodes in the current ``phylotree``.
   */
  phylotree.get_tips = function() {
    // get all nodes that have no nodes
    return _.filter(self.nodes, n => {
      return !_.has(n, "children");
    });
  };

  /**
   * Get the root node.
   *
   * @returns the current root node of the ``phylotree``.
   */
  phylotree.get_root_node = function() {
    // TODO
    return self.nodes[0];
  };

  /**
   * Get a node by name.
   *
   * @param {String} name Name of the desired node.
   * @returns {Node} Desired node.
   */
  phylotree.get_node_by_name = function(name) {
    // TODO
    return _.findWhere(self.nodes, { name: name });
  };

  /**
   * Add attributes to nodes. New attributes will be placed in the
   * ``annotations`` key of any nodes that are matched.
   *
   * @param {Object} attributes An object whose keys are the names of nodes
   * to modify, and whose values are the new attributes to add.
   */
  phylotree.assign_attributes = function(attributes) {
    //return nodes;
    // add annotations to each matching node
    _.each(self.nodes, function(d) {
      if (_.indexOf(_.keys(attributes), d.name) >= 0) {
        d["annotations"] = attributes[d.name];
      }
    });
  };

  phylotree.set_partitions = function(partitions) {
    this.partitions = partitions;
  };

  phylotree.get_partitions = function(attributes) {
    return this.partitions;
  };

  /**
   * Return tags that were read when parsing the original Newick string.
   *
   * @returns An array of strings, comprising each tag that was read.
   */
  phylotree.get_parsed_tags = function() {
    return parsed_tags;
  };

  /**
   * Return most recent common ancestor of a pair of nodes.
   *
   * @returns An array of strings, comprising each tag that was read.
   */
  phylotree.mrca = function() {

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
  };

  //d3.rebind(phylotree, d3_hierarchy, "sort", "children", "value");

  // Add an alias for nodes and links, for convenience.
  phylotree.nodes = phylotree;
  phylotree.links = phylotree;

  return phylotree;
};

phylotree.is_leafnode = inspector.is_leafnode;
phylotree.add_custom_menu = menus.add_custom_menu;
phylotree.trigger_refresh = d3_phylotree_trigger_refresh;
phylotree.newick_parser = d3_phylotree_newick_parser;

/**
 * A parser for NexML. This is a separate function, since NeXML objects
 * can contain multiple trees. Results should be passed into a phylotree
 * object, as shown in the examples.
 *
 * @param {Object} nexml - A NeXML string.
 * @returns {Object} trees - An array of trees contained in the NeXML object.
 */
phylotree.nexml_parser = nexml_parser;

export default phylotree;
