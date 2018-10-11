import "d3";

// SW20180814 TODO: Condense all parser requires to just the parser_registry
import {default as parser_registry} from "./formats/registry";
import {default as nexml_parser} from "./formats/nexml";
import {default as d3_phylotree_newick_parser} from "./formats/newick";
import {default as d3_phylotree_phyloxml_parser} from "./formats/phyloxml";

// replacement for d3.functor
function constant(x) {
  return function() {
    return x;
  };
}

var d3_layout_phylotree_event_id = "phylotree.event",
  d3_layout_phylotree_context_menu_id = "d3_layout_phylotree_context_menu";

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
    newick_string = null,
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
        var bl = parseFloat(_node_data["attribute"]);
        if (!isNaN(bl)) {
          return Math.max(0, bl);
        }
      }
      return undefined;
    },

    branch_length_accessor = def_branch_length_accessor,

    def_node_label = function(_node) {

      _node = _node.data;

      if (d3_phylotree_is_leafnode(_node)) {
        return _node.name || "";
      }

      if (phylotree.show_internal_name(_node)) {
        return _node.name;
      }

      return "";

    },

    node_label = def_node_label,
    needs_redraw = true,
    svg = null,
    selection_callback = null,
    options = {
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
      node_circle_size: constant(3),
      transitions: null,
      brush: true,
      reroot: true,
      hide: true,
      "label-nodes-with-name": false,
      zoom: false,
      "show-menu": true
    },
    css_classes = {
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
    },
    nodes = [],
    links = [],
    parsed_tags = [],
    partitions = [],
    x_coord = function(d) {
      //console.log(d.y);
      return d.y;
    },
    y_coord = function(d) {
      //console.log(d.x);
      return d.x;
    },
    scales = [1, 1],
    fixed_width = [15, 20],
    font_size = 12,
    scale_bar_font_size = 12,
    offsets = [0, font_size / 2],

    draw_line = d3.line()
      .x(function(d) {
        return x_coord(d);
      })
      .y(function(d) {
        return y_coord(d);
      })
      .curve(d3.curveStepBefore),
    
    line_segment_placer = function (edge, where) {
       return { 'x' : x_coord(edge.target) + (x_coord(edge.source)-x_coord(edge.target))*where, 
                'y' : y_coord(edge.target) };
    },
    
    ensure_size_is_in_px = function(value) {
      return typeof value === "number" ? value + "px" : value;
    },

    draw_arc = function(points) {
      var start = radial_mapper(points[0].radius, points[0].angle),
          end   = radial_mapper(points[0].radius, points[1].angle);

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
    },
    
    arc_segment_placer = function (edge, where) {
        var r = radial_mapper (edge.target.radius + (edge.source.radius - edge.target.radius) * where , edge.target.angle);
        return {"x": x_coord(r), "y" : y_coord (r)};
    };
    
    var draw_branch = draw_line,
    draw_scale_bar = null,
    edge_placer = line_segment_placer,
    count_listener_handler = function() {},
    layout_listener_handler = function() {},
    node_styler = undefined,
    edge_styler = undefined,
    shown_font_size = font_size,
    selection_attribute_name = "selected",
    right_most_leaf = 0,
    label_width = 0,
    radial_center = 0,
    radius = 1,
    radius_pad_for_bubbles = 0,
    radial_mapper = function(r, a) {
      return {
        x: radial_center + r * Math.sin(a),
        y: radial_center + r * Math.cos(a)
      };
    },
    cartesian_mapper = function(x, y) {
      return polar_to_cartesian(x - radial_center, y - radial_center);
    },
    cartesian_to_polar = function(node, radius, radial_root_offset) {
      node.radius = radius * (node.radius + radial_root_offset);

      if (!node.angle) {
        node.angle = (2 * Math.PI * node.x * scales[0]) / size[0];
      }

      var radial = radial_mapper(node.radius, node.angle);

      node.x = radial.x;
      node.y = radial.y;

      return node;
    },
    polar_to_cartesian = function(x, y) {
      r = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
      a = Math.atan2(y, x);
      return [r, a];
    };

  self.container = container || "body";
  self.logger = options.logger;

  // SW20180814 TODO: Remove; Registry functions should be private

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
   * Place the current nodes, i.e., determine their coordinates based
   * on current settings.
   *
   * @returns The current ``phylotree``.
   */
  phylotree.placenodes = function() {

    let x = 0.0,
      _extents = [[0, 0], [0, 0]],
      last_node = null,
      last_span = 0,
      save_x = x,
      save_span = last_span * 0.5;

    let do_scaling = options["scaling"],
      undef_BL = false,
      is_under_collapsed_parent = false,
      max_depth = 1;

    function process_internal_node(a_node) {
      /** 
            decide if the node will be shown, and compute it's top-to-bottom (breadthwise)
            placement 
        */

      var count_undefined = 0;

      if (phylotree.show_internal_name(a_node)) {

        // do in-oder traversal to allow for proper internal node spacing
        // (x/2) >> 0 is integer division
        var half_way = (a_node.children.length / 2) >> 0;
        var displayed_children = 0;
        var managed_to_display = false;

        for (var child_id = 0; child_id < a_node.children.length; child_id++) {
          var child_x = tree_layout(a_node.children[child_id]);
          if (typeof child_x == "number") {
            displayed_children++;
          }
          if (displayed_children >= half_way && !managed_to_display) {
            _handle_single_node_layout(a_node);
            managed_to_display = true;
          }
        }

        if (displayed_children == 0) {
          a_node.notshown = true;
          a_node.x = undefined;
        } else {
          if (!managed_to_display) {
            _handle_single_node_layout(a_node);
          }
        }
      } else {
        // postorder layout
        a_node.x = a_node.children.map(tree_layout).reduce(function(a, b) {
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

    function _handle_single_node_layout(a_node) {
      var _node_span = node_span(a_node) / rescale_node_span;
      // compute the relative size of nodes (0,1)
      // sum over all nodes is 1

      x = a_node.x =
        x + separation(last_node, a_node) + (last_span + _node_span) * 0.5;

      // separation is a user-settable callback to add additional spacing on nodes

      _extents[1][1] = Math.max(_extents[1][1], a_node.y);
      _extents[1][0] = Math.min(_extents[1][0], a_node.y - _node_span * 0.5);

      if (is_under_collapsed_parent) {

        _extents[0][1] = Math.max(
          _extents[0][1],
          save_x +
            (a_node.x - save_x) * options["compression"] +
            save_span +
            (_node_span * 0.5 + separation(last_node, a_node)) *
              options["compression"]
        );

      } else {
        _extents[0][1] = Math.max(
          _extents[0][1],
          x + _node_span * 0.5 + separation(last_node, a_node)
        );
      }

      last_node = a_node;
      last_span = _node_span;

    }

    function tree_layout(a_node) {
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
      if (d3_phylotree_node_notshown(a_node)) {
        return undefined;
      }

      var is_leaf = d3_phylotree_is_leafnode(a_node);

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

      if (a_node["parent"]) {
        if (do_scaling) {
          if (undef_BL) {
            return 0;
          }

          a_node.y = branch_length_accessor(a_node);

          if (typeof a_node.y === "undefined") {
            console.log("Missing BL for ", a_node);
            undef_BL = true;
            return 0;
          }
          a_node.y += a_node.parent.y;
        } else {
          a_node.y = is_leaf ? max_depth : a_node.depth;
        }
      } else {
        x = 0.0;
        _extents = [[0, 0], [0, 0]];

        /** _extents computes a bounding box for the tree (initially NOT in screen 
              coordinates)
              
              all account for node sizes
              
              _extents [1][0] -- the minimum x coordinate (breadth)
              _extents [1][1] -- the maximum y coordinate (breadth)
              _extents [1][0] -- the minimum y coordinate (root-to-tip, or depthwise)
              _extents [1][1] -- the maximum y coordinate (root-to-tip, or depthwise)
              
              
          
          */

        last_node = null;
        // last node laid out in the top bottom hierarchy
        last_span = 0;
        // the span of the last node laid out in the top to bottom hierarchy
        a_node.y = 0.0;
      }

      /** the next block has to do with top-to-bottom spacing of nodes **/

      if (is_leaf) {
        // displayed internal nodes are handled in `process_internal_node`
        _handle_single_node_layout(a_node);
      }

      if (!is_leaf) {
        // for internal nodes
        if (
          d3_phylotree_is_node_collapsed(a_node) &&
          !is_under_collapsed_parent
        ) {
          // collapsed node
          save_x = x;
          save_span = last_span * 0.5;
          is_under_collapsed_parent = true;
          process_internal_node(a_node);
          is_under_collapsed_parent = false;
          if (typeof a_node.x === "number") {
            a_node.x =
              save_x + (a_node.x - save_x) * options["compression"] + save_span;
            a_node.collapsed = [[a_node.x, a_node.y]];

            var map_me = function(n) {
              n.hidden = true;
              if (d3_phylotree_is_leafnode(n)) {
                x = n.x =
                  save_x + (n.x - save_x) * options["compression"] + save_span;
                a_node.collapsed.push([n.x, n.y]);
              } else {
                n.children.map(map_me);
              }
            };

            x = save_x;
            map_me(a_node);

            a_node.collapsed.splice(1, 0, [save_x, a_node.y]);
            a_node.collapsed.push([x, a_node.y]);
            a_node.collapsed.push([a_node.x, a_node.y]);
            a_node.hidden = false;
          }
        } else {
          // normal node, or under a collapsed parent
          process_internal_node(a_node);
        }
      }
      return a_node.x;
    }

    rescale_node_span =
      self.nodes.children.map(function(d) {
          if (d3_phylotree_is_leafnode(d) || phylotree.show_internal_name(d))
            return node_span(d);
        })
        .reduce(function(p, c) {
            return Math.min(c, p || 1e200);
          }, null) || 1;

    // Set initial x
    self.nodes.x = tree_layout(self.nodes, do_scaling);

    max_depth = d3.max(self.nodes.descendants(), function(n) {
      return n.depth;
    });

    if (do_scaling && undef_BL) {
      // requested scaling, but some branches had no branch lengths
      // redo layout without branch lengths
      do_scaling = false;
      self.nodes.x = tree_layout(self.nodes);
    }

    var at_least_one_dimension_fixed = false;

    draw_scale_bar = options["show-scale"] && do_scaling;
    // this is a hack so that phylotree.pad_height would return ruler spacing

    if (options["top-bottom-spacing"] == "fixed-step") {
      offsets[1] = Math.max(font_size, -_extents[1][0] * fixed_width[0]);
      size[0] = _extents[0][1] * fixed_width[0];
      scales[0] = fixed_width[0];
    } else {
      scales[0] = (size[0] - phylotree.pad_height()) / _extents[0][1];
      at_least_one_dimension_fixed = true;
    }

    shown_font_size = Math.min(font_size, scales[0]);

    function do_lr() {
      if (phylotree.radial() && at_least_one_dimension_fixed) {
        offsets[1] = 0;
      }

      if (options["left-right-spacing"] == "fixed-step") {
        size[1] = max_depth * fixed_width[1];
        scales[1] =
          (size[1] - offsets[1] - options["left-offset"]) / _extents[1][1];
        label_width = phylotree._label_width(shown_font_size);
        if (phylotree.radial()) {
          //label_width *= 2;
        }
      } else {
        label_width = phylotree._label_width(shown_font_size);
        at_least_one_dimension_fixed = true;

        var available_width = size[1] - offsets[1] - options["left-offset"];
        if (available_width * 0.5 < label_width) {
          shown_font_size *= (available_width * 0.5) / label_width;
          label_width = available_width * 0.5;
        }

        scales[1] =
          (size[1] - offsets[1] - options["left-offset"] - label_width) /
          _extents[1][1];
      }
    }

    if (phylotree.radial()) {
      // map the nodes to polar coordinates

      draw_branch = draw_arc;
      edge_placer = arc_segment_placer;

      var last_child_angle = null,
        last_circ_position = null,
        last_child_radius = null,
        min_radius = 0,
        zero_length = null,
        effective_span = _extents[0][1] * scales[0];

      var compute_distance = function(r1, r2, a1, a2, annular_shift) {
        annular_shift = annular_shift || 0;
        return Math.sqrt(
          (r2 - r1) * (r2 - r1) +
            2 *
              (r1 + annular_shift) *
              (r2 + annular_shift) *
              (1 - Math.cos(a1 - a2))
        );
      };

      var max_r = 0;

      self.nodes.each(function(d) {
        var my_circ_position = d.x * scales[0];
        d.angle = (2 * Math.PI * my_circ_position) / effective_span;
        d.text_angle = d.angle - Math.PI / 2;
        d.text_angle = d.text_angle > 0 && d.text_angle < Math.PI;
        d.text_align = d.text_angle ? "end" : "start";
        d.text_angle = (d.text_angle ? 180 : 0) + (d.angle * 180) / Math.PI;
      });

      do_lr();

      self.nodes.each(function(d) {
        d.radius = (d.y * scales[1]) / size[1];
        max_r = Math.max(d.radius, max_r);
      });

      var annular_shift = 0,
        do_tip_offset = phylotree.align_tips() && !options["draw-size-bubbles"];

      self.nodes.each(function(d) {
        if (!d.children) {
          var my_circ_position = d.x * scales[0];
          if (last_child_angle !== null) {
            var required_spacing = my_circ_position - last_circ_position,
              radial_dist = compute_distance(
                d.radius,
                last_child_radius,
                d.angle,
                last_child_angle,
                annular_shift
              );

            var local_mr =
              radial_dist > 0
                ? required_spacing / radial_dist
                : 10 * options["max-radius"];

            if (local_mr > options["max-radius"]) {
              // adjust the annular shift
              var dd = required_spacing / options["max-radius"],
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
                options["annular-limit"] * max_r,
                (-b + st) / 2
              );
              min_radius = options["max-radius"];
            } else {
              min_radius = Math.max(min_radius, local_mr);
            }
          }

          last_child_angle = d.angle;
          last_circ_position = my_circ_position;
          last_child_radius = d.radius;
        }
      });

      radius = Math.min(
        options["max-radius"],
        Math.max(effective_span / 2 / Math.PI, min_radius)
      );

      if (at_least_one_dimension_fixed) {
        radius = Math.min(
          radius,
          (Math.min(effective_span, _extents[1][1] * scales[1]) - label_width) *
            0.5 -
            radius * annular_shift
        );
      }

      radial_center = radius_pad_for_bubbles = radius;
      var scaler = 1;

      if (annular_shift) {
        scaler = max_r / (max_r + annular_shift);
        radius *= scaler;
      }

      nodes.forEach(function(d) {
        cartesian_to_polar(d, radius, annular_shift);

        max_r = Math.max(max_r, d.radius);

        if (options["draw-size-bubbles"]) {
          radius_pad_for_bubbles = Math.max(
            radius_pad_for_bubbles,
            d.radius + phylotree.node_bubble_size(d)
          );
        } else {
          radius_pad_for_bubbles = Math.max(radius_pad_for_bubbles, d.radius);
        }

        if (d.collapsed) {
          d.collapsed = d.collapsed.map(function(p) {
            var z = {};
            z.x = p[0];
            z.y = p[1];
            z = cartesian_to_polar(z, radius, annular_shift);
            return [z.x, z.y];
          });

          var last_point = d.collapsed[1];
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

      size[0] = radial_center + radius / scaler;
      size[1] = radial_center + radius / scaler;
    } else {

      do_lr();

      draw_branch = draw_line;
      edge_placer = line_segment_placer;
      right_most_leaf = 0;

      self.nodes.each(function(d) {

        d.x *= scales[0];
        d.y *= scales[1];

        if (options["layout"] == "right-to-left") {
          d.y = _extents[1][1] * scales[1] - d.y;
        }

        if (d3_phylotree_is_leafnode(d)) {
          right_most_leaf = Math.max(
            right_most_leaf,
            d.y + phylotree.node_bubble_size(d)
          );
        }

        if (d.collapsed) {
          d.collapsed.map(function(p) {
            return [(p[0] *= scales[0]), (p[1] *= scales[1])];
          });
          var last_x = d.collapsed[1][0];
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

    if (draw_scale_bar) {

      var domain_limit, range_limit;

      if (phylotree.radial()) {
        range_limit = Math.min(radius / 5, 50);
        domain_limit = Math.pow(
          10,
          Math.ceil(
            Math.log((_extents[1][1] * range_limit) / radius) / Math.log(10)
          )
        );
        range_limit = domain_limit * (radius / _extents[1][1]);
        if (range_limit < 30) {
          var stretch = Math.ceil(30 / range_limit);
          range_limit *= stretch;
          domain_limit *= stretch;
        }
      } else {
        domain_limit = _extents[1][1];
        range_limit = size[1] - offsets[1] - options["left-offset"];
      }

      let scale = d3.scaleLinear()
          .domain([0, domain_limit])
          .range([shown_font_size, shown_font_size + range_limit]),
        scaleTickFormatter = d3.format(".2g");

      draw_scale_bar = d3.axisTop()
        .scale(scale)
        .tickFormat(function(d) {

          if (d === 0) {
            return "";
          }

          return scaleTickFormatter(d);

        });

      if (phylotree.radial()) {
        draw_scale_bar.tickValues([domain_limit]);
      } else {

        let round = function(x, n) { return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x) }

        var my_ticks = scale.ticks();
        my_ticks = my_ticks.length > 1 ? my_ticks[1] : my_ticks[0];
        draw_scale_bar.ticks(
          Math.min(
            10,
            round(
              range_limit /
                (shown_font_size * scaleTickFormatter(my_ticks).length * 0.8),
              0
            )
          )
        );

      }

      //_extentsconsole.log (scale.domain(), scale.range());
    } else {
      draw_scale_bar = null;
    }

    return phylotree;

  };

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

    // SW20180814 : Allowing for explicit type declaration of tree provided

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

    phylotree.placenodes();
    links = self.nodes.links();
    return phylotree;
  }

  /**
   * Get or set the size of tree in pixels.
   *
   * @param {Array} attr (optional) An array of the form ``[height, width]``.
   * @returns {Phylotree} The current ``size`` array if getting, or the current ``phylotree``
   * if setting.
   */
  phylotree.size = function(attr) {
    if (arguments.length) {
      phylo_attr = attr;
    }

    if (options["top-bottom-spacing"] != "fixed-step") {
      size[0] = phylo_attr[0];
    }
    if (options["left-right-spacing"] != "fixed-step") {
      size[1] = phylo_attr[1];
    }

    if (!arguments.length) {
      return size;
    }

    return phylotree;
  };

  phylotree.pad_height = function() {
    if (draw_scale_bar) {
      return scale_bar_font_size + 25;
    }
    return 0;
  };

  phylotree.pad_width = function() {
    return offsets[1] + options["left-offset"] + label_width;
  };

  /**
   * Get all descendants of a given node.
   *
   * @param {Node} node A node in the current phylotree.
   * @returns {Array} An array of descendant nodes.
   */
  phylotree.descendants = function(n) {
    var desc = [];

    function recurse_d(nd) {
      if (d3_phylotree_is_leafnode(nd)) {
        desc.push(nd);
      } else {
        nd.children.forEach(recurse_d);
      }
    }
    recurse_d(n);
    return desc;
  };

  /**
   * Collapses a given node.
   *
   * @param {Node} node A node to be collapsed.
   */
  phylotree.collapse_node = function(n) {
    if (!d3_phylotree_is_node_collapsed(n)) {
      n.collapsed = true;
    }
  };

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
    var menu_object = d3
      .select(self.container)
      .select("#" + d3_layout_phylotree_context_menu_id);

    if (menu_object.empty()) {
      menu_object = d3
        .select(self.container)
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
      if (!d3_phylotree_is_leafnode(node)) {
        if (options["collapsible"]) {
          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text(
              d3_phylotree_is_node_collapsed(node)
                ? "Expand Subtree"
                : "Collapse Subtree"
            )
            .on("click", function(d) {
              menu_object.style("display", "none");
              phylotree.toggle_collapse(node).update();
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
            .on("click", function(d) {
              menu_object.style("display", "none");
              phylotree.modify_selection(phylotree.path_to_root(node));
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
            .on("click", function(d) {
              menu_object.style("display", "none");
              phylotree.reroot(node).update();
            });
        }

        if (options["hide"]) {
          menu_object
            .append("a")
            .attr("class", "dropdown-item")
            .attr("tabindex", "-1")
            .text(
              "Hide this " +
                (d3_phylotree_is_leafnode(node) ? "node" : "subtree")
            )
            .on("click", function(d) {
              menu_object.style("display", "none");
              phylotree
                .modify_selection([node], "notshown", true, true)
                .update_has_hidden_nodes()
                .update();
            });
        }
      }

      if (d3_phylotree_has_hidden_nodes(node)) {
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

      var tree_container = $(self.container);
      var coordinates = d3.mouse(tree_container[0]);
      menu_object
        .style("position", "absolute")
        .style("left", "" + coordinates[0] + "px")
        .style("top", "" + coordinates[1] + "px")
        .style("display", "block");
    } else {
      menu_object.style("display", "none");
    }
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


  /** compute x, y coordinates (in terms of the enclosing tree-wide <g> 
      where one could place something along an edge at a given fraction of its length (0 - end, 1-start); 
   */

  phylotree.place_along_an_edge = function(e, where) {
    return edge_placer (e, where);
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
      if (!d3_phylotree_is_leafnode(n)) {
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

  phylotree.update_layout = function(new_json, do_hierarchy) {

    if (do_hierarchy) {

      self.nodes = d3.hierarchy(new_json);

      self.nodes.each(function(d) {
        d.id = null;
      });

    }

    phylotree.placenodes();
    links = self.nodes.links();
    phylotree.sync_edge_labels();
    d3_phylotree_trigger_layout(phylotree);

  };

  phylotree.sync_edge_labels = function() {
    links.forEach(function(d) {
      d[selection_attribute_name] = d.target[selection_attribute_name] || false;
      d.tag = d.target.tag || false;
    });

    d3_phylotree_trigger_refresh(phylotree);

    if (phylotree.count_handler()) {
      var counts = {};
      counts[selection_attribute_name] = links.reduce(function(p, c) {
        return p + (c[selection_attribute_name] ? 1 : 0);
      }, 0);
      counts["tagged"] = links.reduce(function(p, c) {
        return p + (d3_phylotree_item_tagged(c) ? 1 : 0);
      }, 0);

      d3_phylotree_trigger_count_update(
        phylotree,
        counts,
        phylotree.count_handler()
      );
    }
  };

  // List of all selecters that can be used with the restricted-selectable option
  phylotree.predefined_selecters = {
    all: d => {
      return true;
    },
    none: d => {
      return false;
    },
    "all-leaf-nodes": d => {
      return d3_phylotree_is_leafnode(d.target);
    },
    "all-internal-nodes": d => {
      return !d3_phylotree_is_leafnode(d.target);
    }
  };

  // SW 20171113 : TODO: Arguments violate clean-coding standards.
  // https://github.com/ryanmcdermott/clean-code-javascript#functions
  /**
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
   * @returns The current ``phylotree``.
   */
  phylotree.modify_selection = function(
    node_selecter,
    attr,
    place,
    skip_refresh,
    mode
  ) {
    attr = attr || selection_attribute_name;
    mode = mode || "toggle";

    // check if node_selecter is a value of pre-defined selecters

    if (options["restricted-selectable"].length) {
      // the selection must be from a list of pre-determined selections
      if (_.contains(_.keys(this.predefined_selecters), node_selecter)) {
        node_selecter = this.predefined_selecters[node_selecter];
      } else {
        return;
      }
    }

    if (
      (options["restricted-selectable"] || options["selectable"]) &&
      !options["binary-selectable"]
    ) {
      var do_refresh = false;

      if (typeof node_selecter === "function") {
        links.forEach(function(d) {
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

        links.forEach(function(d) {
          d[attr] = d.target[attr];
        });
      }

      var counts;

      if (do_refresh) {
        if (!skip_refresh) {
          d3_phylotree_trigger_refresh(phylotree);
        }
        if (phylotree.count_handler()) {
          counts = {};
          counts[attr] = links.reduce(function(p, c) {
            return p + (c[attr] ? 1 : 0);
          }, 0);
          d3_phylotree_trigger_count_update(
            phylotree,
            counts,
            phylotree.count_handler()
          );
        }

        if (place) {
          phylotree.placenodes();
        }
      }
    } else if (options["binary-selectable"]) {
      if (typeof node_selecter === "function") {
        links.forEach(function(d) {
          var select_me = node_selecter(d);
          d[attr] = d[attr] || false;

          if (d[attr] != select_me) {
            d[attr] = select_me;
            do_refresh = true;
            d.target[attr] = select_me;
          }

          options["attribute-list"].forEach(function(type) {
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

        links.forEach(function(d) {
          d[attr] = d.target[attr];
          options["attribute-list"].forEach(function(type) {
            if (type != attr && d[attr] !== true) {
              d[type] = false;
              d.target[type] = false;
            }
          });
        });
      }

      if (do_refresh) {
        if (!skip_refresh) {
          d3_phylotree_trigger_refresh(phylotree);
        }
        if (phylotree.count_handler()) {
          counts = {};
          counts[attr] = links.reduce(function(p, c) {
            return p + (c[attr] ? 1 : 0);
          }, 0);
          d3_phylotree_trigger_count_update(
            phylotree,
            counts,
            phylotree.count_handler()
          );
        }

        if (place) {
          phylotree.placenodes();
        }
      }
    }
    if (selection_callback && attr != "tag") {
      selection_callback(phylotree.get_selection());
    }
    return phylotree;
  };
  
  /**
    Export the nodes of the tree with all local keys to JSON
    The return will be an array of nodes in the specified traversal_type
    ('post-order' : default, 'pre-order', or 'in-order')
    with parents and children referring to indices in that array

  */
  
  phylotree.json = function (traversal_type) {

    var index = 0;

    phylotree.traverse_and_compute (function (n) {
        n.json_export_index = index++;
    }, traversal_type);
    
    var node_array = new Array (index);
    index = 0;
    phylotree.traverse_and_compute (function (n) {
        var node_copy = _.clone (n);
        delete node_copy.json_export_index;
        if (n.parent) {
            node_copy.parent = n.parent.json_export_index;  
        } 
        if (n.children) {
            node_copy.children = _.map (n.children, function (c) {return c.json_export_index});
        }
        node_array [index++] = node_copy;

    }, traversal_type);
      
     phylotree.traverse_and_compute (function (n) {
        delete n.json_export_index;
    }, traversal_type);
   
    return JSON.stringify (node_array);
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
  phylotree.is_leafnode = d3_phylotree_is_leafnode;

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
      //return [d.screen_x, 0];
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
          d3_phylotree_is_leafnode(d) ||
          d3_phylotree_item_selected(d, selection_attribute_name)
        )
      ) {
        d[selection_attribute_name] = callback(d.children);
      }
    }

    phylotree.modify_selection(function(d, callback) {
      if (d3_phylotree_is_leafnode(d.target)) {
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

      if (d3_phylotree_is_leafnode(d)) {
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
      if (d3_phylotree_is_leafnode(d.target)) {
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

  /*phylotree.reroot = function (node) {

      }*/

  phylotree.resort_children = function(comparator, start_node, filter) {

    // ascending
    self.nodes
    .sum(function(d) { return d.value; })
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

        phylotree.update_layout(self.nodes, true);
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
              ] = node.parent.children[1 - delete_me_idx];
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
          phylotree.update_layout(self.nodes, true);
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
  phylotree.traverse_and_compute = function(callback, traversal_type, root_node, backtrack) {
    traversal_type = traversal_type || "post-order";

    function post_order(node) {

      if(_.isUndefined(node)) {
        return;
      }

      let descendants = node.children;

      if (! (backtrack && backtrack (node))) {
          if (!_.isUndefined(descendants)) {
            for (let k = 0; k < descendants.length; k++) {
              post_order(descendants[k]);
            }
            callback(descendants[0]);
          }
      }
    }

    function pre_order(node) {
      if (! (backtrack && backtrack (node))) {
          callback(node);
          if (node.children) {
            for (var k = 0; k < node.children.length; k++) {
              pre_order(node.children[k]);
            }
          }
      } 
    }


    function in_order(node) {
      if (! (backtrack && backtrack (node))) {
          if (node.children) {
            var upto = Min (node.children.length, 1);
            for (var k = 0; k < upto; k++) {
              in_order(node.children[k]);
            }
            callback(node);
            for (var k = upto; k < node.children; k++) { // eslint-disable-line no-redeclare
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

  /**
   * Get or set spacing in the x-direction.
   *
   * @param {Number} attr (Optional), the new spacing value if setting.
   * @param {Boolean} skip_render (Optional), whether or not a refresh should be performed.
   * @returns The current ``spacing_x`` value if getting, or the current ``phylotree`` if setting.
   */
  phylotree.spacing_x = function(attr, skip_render) {

    if (!arguments.length) return fixed_width[0];
    if (
      fixed_width[0] != attr &&
      attr >= options["minimum-per-node-spacing"] &&
      attr <= options["maximum-per-node-spacing"]
    ) {
      fixed_width[0] = attr;
      if (!skip_render) {
        phylotree.placenodes();
      }
    }
    return phylotree;
  };

  /**
   * Get or set spacing in the y-direction.
   *
   * @param {Number} attr (Optional), the new spacing value if setting.
   * @param {Boolean} skip_render (Optional), whether or not a refresh should be performed.
   * @returns The current ``spacing_y`` value if getting, or the current ``phylotree`` if setting.
   */
  phylotree.spacing_y = function(attr, skip_render) {
    if (!arguments.length) return fixed_width[1];
    if (
      fixed_width[1] != attr &&
      attr >= options["minimum-per-level-spacing"] &&
      attr <= options["maximum-per-level-spacing"]
    ) {
      fixed_width[1] = attr;
      if (!skip_render) {
        phylotree.placenodes();
      }
    }
    return phylotree;
  };

  /**
   * Toggle collapsed view of a given node. Either collapses a clade into
   * a smaller blob for viewing large trees, or expands a node that was
   * previously collapsed.
   *
   * @param {Node} node The node to toggle.
   * @returns {Phylotree} The current ``phylotree``.
   */
  phylotree.toggle_collapse = function(node) {
    if (node.collapsed) {
      node.collapsed = false;

      var unhide = function(n) {
        if (!d3_phylotree_is_leafnode(n)) {
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

    phylotree.placenodes();
    return phylotree;
  };

  phylotree.update_has_hidden_nodes = function() {
    for (let k = self.nodes.length - 1; k >= 0; k -= 1) {
      if (d3_phylotree_is_leafnode(self.nodes[k])) {
        self.nodes[k].has_hidden_nodes = self.nodes[k].notshown;
      } else {
        self.nodes[k].has_hidden_nodes = self.nodes[k].children.reduce(function(p, c) {
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
    var bl = phylotree.branch_length ();
    if (bl) {
        return _.every (phylotree.get_nodes(), function (node) {
            return !node.parent || !_.isUndefined (bl(node));
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

  phylotree.len = function(attr) {
    if (!arguments.length) return default_length_attribute;
    if (default_length_attribute != attr) {
      default_length_attribute = attr;
      needs_redraw = true;
    }
    return phylotree;
  };

  phylotree._label_width = function(_font_size) {
    _font_size = _font_size || shown_font_size;

    var width = 0;

    self.nodes.descendants().filter(d3_phylotree_node_visible).forEach(function(node) {
      var node_width = 12 + node_label(node).length * _font_size * 0.8;
      if (node.angle !== null) {
        node_width *= Math.max(
          Math.abs(Math.cos(node.angle)),
          Math.abs(Math.sin(node.angle))
        );
      }
      width = Math.max(node_width, width);
    });

    return width;
  };

  /**
   * Get or set font size.
   *
   * @param {Function} attr Empty if getting, or new font size if setting.
   * @returns The current ``font_size`` accessor if getting, or the current ``phylotree`` if setting.
   */
  phylotree.font_size = function(attr) {
    if (!arguments.length) return font_size;
    font_size = attr === undefined ? 12 : attr;
    return phylotree;
  };

  phylotree.scale_bar_font_size = function(attr) {
    if (!arguments.length) return scale_bar_font_size;
    scale_bar_font_size = attr === undefined ? 12 : attr;
    return phylotree;
  };

  phylotree.node_circle_size = function(attr, attr2) {
    if (!arguments.length) return options["node_circle_size"];
    options["node_circle_size"] = constant(attr === undefined ? 3 : attr);
    return phylotree;
  };

  phylotree.needs_redraw = function() {
    return needs_redraw;
  };

  /**
   * Getter/setter for the SVG element for the Phylotree to be rendered in.
   *
   * @param {d3-selection} svg_element (Optional) SVG element to render within, selected by D3.
   * @returns The selected SVG element if getting, or the current ``phylotree`` if setting.`
   */
  phylotree.svg = function(svg_element) {

    if (!arguments.length) return svg_element;
    if (svg !== svg_element) {

      svg = svg_element;
      if (css_classes["tree-container"] == "phylotree-container") {
        svg.selectAll("*").remove();
        svg.append("defs");
      }

      d3.select(self.container).on(
        "click",
        function(d) {
          phylotree.handle_node_click(null);
        },
        true
      );
    }
    return phylotree;
  };

  phylotree.css = function(opt) {
    if (arguments.length === 0) return css_classes;
    if (arguments.length > 2) {
      var arg = {};
      arg[opt[0]] = opt[1];
      return phylotree.css(arg);
    }

    for (var key in css_classes) {
      if (key in opt && opt[key] != css_classes[key]) {
        css_classes[key] = opt[key];
      }
    }
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

  phylotree.transitions = function(arg) {

    if (arg !== undefined) {
      return arg;
    }
    if (options["transitions"] !== null) {
      return options["transitions"];
    }

    return self.nodes.descendants().length <= 300;

  };

  /**
   * Update the current phylotree, i.e., alter the svg
   * elements.
   *
   * @param {Boolean} transitions (Optional) Toggle whether transitions should be shown.
   * @returns The current ``phylotree``.
   */
  phylotree.update = function(transitions) {

    if (!phylotree.svg) return phylotree;

    transitions = phylotree.transitions(transitions);

    var node_id = 0;

    var enclosure = svg
      .selectAll("." + css_classes["tree-container"])
      .data([0])
      .enter()
      .append("g")
      .merge(svg)
      .attr("class", css_classes["tree-container"])
      .attr("transform", function(d) {
      return d3_phylotree_svg_translate([
        offsets[1] + options["left-offset"],
        phylotree.pad_height()
      ]);
    });

    if (draw_scale_bar) {

      let scale_bar = svg
        .selectAll("." + css_classes["tree-scale-bar"])
        .data([0]);
      
      
      scale_bar.enter().append("g")
        .attr("class", css_classes["tree-scale-bar"])
        .style("font-size", ensure_size_is_in_px(scale_bar_font_size))
        .merge(scale_bar)
        .attr("transform", function(d) {
          return d3_phylotree_svg_translate([
            offsets[1] + options["left-offset"],
            phylotree.pad_height() - 10
          ]);
        }).call(draw_scale_bar);

      scale_bar.selectAll("text").style("text-anchor", "end");

    } else {
      svg.selectAll("." + css_classes["tree-scale-bar"]).remove();
    }

    let drawn_links = enclosure
      .selectAll(d3_phylotree_edge_css_selectors(css_classes))
      .data(links.filter(d3_phylotree_edge_visible), function(d) {
        return d.target.id || (d.target.id = ++node_id);
      })

    if (transitions) {
      drawn_links
        .transition()
        .remove();
    } else {
      drawn_links.remove();
    }
      
    drawn_links
      .enter()
      .insert("path", ":first-child")
      .merge(drawn_links)
      .each(function(d) {
        phylotree.draw_edge(this, d, transitions);
      });

    var collapsed_clades = enclosure
      .selectAll(d3_phylotree_clade_css_selectors(css_classes))
      .data(self.nodes.descendants().filter(d3_phylotree_is_node_collapsed), function(d) {
        return d.id || (d.id = ++node_id);
      }).enter().insert("path", ":first-child");

    var spline = function() {};
    var spline_f = _.noop();

    // Collapse radial differently
    if (phylotree.radial()) {
      // create interpolator
      var interpolator = function(points) {
        points.pop();

        var center_node = points.shift();
        var path_string = points.join("L");

        var polar_coords = cartesian_mapper(center_node[0], center_node[1]);

        var first_angle = cartesian_mapper(points[0][0], points[0][1])[1];
        var last_angle = cartesian_mapper(
          points[points.length - 1][0],
          points[points.length - 1][1]
        )[1];

        var connecting_arc =
          "A " +
          polar_coords[0] +
          " " +
          polar_coords[0] +
          " " +
          (first_angle > last_angle ? 1 : 0) +
          " 0 0 " +
          points[0].join(",");

        return path_string + connecting_arc;
      };

      spline = d3.line()
        .curve(interpolator)
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
        .attr("class", css_classes["clade"])
        .attr("d", function(d) {
          if (d.collapsed_clade) {
            return d.collapsed_clade;
          }
          var init_0 = d.collapsed[0][0];
          var init_1 = d.collapsed[0][1];
          //#1 return spline(d.collapsed.map(spline_f, d, init_0, init_1));
          return spline(
            d.collapsed.map(function(coord, i) {
              return spline_f(coord, i, d, init_0, init_1);
            })
          );
        })
        .transition()
        .attr("d", function(d) {
          return (d.collapsed_clade = spline(d.collapsed));
        });
    } else {
      collapsed_clades
        .attr("class", css_classes["clade"])
        .attr("d", function(d) {
          return (d.collapsed_clade = spline(d.collapsed));
        });
    }

    let drawn_nodes = enclosure
      .selectAll(d3_phylotree_node_css_selectors(css_classes))
      .data(self.nodes.descendants().filter(d3_phylotree_node_visible), function(d) {
        return d.id || (d.id = ++node_id);
      });

    //if (transitions) {
    //  drawn_nodes
    //    .exit()
    //    .transition()
    //    .remove();

    //  drawn_nodes.merge(drawn_nodes)
    //    .transition()
    //    .attr("transform", function(d) {
    //      if (!_.isUndefined(d.screen_x) && !_.isUndefined(d.screen_y)) {
    //        return "translate(" + d.screen_x + "," + d.screen_y + ")";
    //      }
    //    });

    //} else {
    //  drawn_nodes.exit().remove();
    //}

    drawn_nodes 
      .enter().append("g")
      .attr("class", phylotree.reclass_node)
      .merge(drawn_nodes)
      .attr("transform", function(d) {

        const should_shift =
          options["layout"] == "right-to-left" && d3_phylotree_is_leafnode(d);

        d.screen_x = x_coord(d);
        d.screen_y = y_coord(d);

        return d3_phylotree_svg_translate([
          should_shift ? 0 : d.screen_x,
          d.screen_y
        ]);
      })
      .each(function(d) {
        phylotree.draw_node(this, d, transitions);
      });

    if (options["label-nodes-with-name"]) {
      drawn_nodes.attr("id", function(d) {
        return "node-" + d.name;
      });
    }

    d3_phylotree_resize_svg(phylotree, svg, transitions);

    if (options["brush"]) {
      var brush = enclosure
        .selectAll("." + css_classes["tree-selection-brush"])
        .data([0])
        .enter()
        .insert("g", ":first-child")
        .attr("class", css_classes["tree-selection-brush"]);

      var brush_object = d3.brush()
        .on("brush", function() {
          var extent = d3.event.target.extent(),
            shown_links = links.filter(d3_phylotree_edge_visible),
            selected_links = shown_links
              .filter(function(d, i) {
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
              .map(function(d) {
                return d.target;
              });

          phylotree.modify_selection(
            links.map(function(d) {
              return d.target;
            }),
            "tag",
            false,
            selected_links.length > 0,
            "false"
          );
          phylotree.modify_selection(
            selected_links,
            "tag",
            false,
            false,
            "true"
          );
        })
        .on("end", function() {
          brush.call(d3.event.target.clear());
        });

      brush.call(brush_object);
    }

    phylotree.sync_edge_labels();

    if (options["zoom"]) {
      var zoom = d3.behavior
        .zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", function() {
          let translate = d3.event.translate;
          translate[0] += offsets[1] + options["left-offset"];
          translate[1] += phylotree.pad_height();
          d3.select("." + css_classes["tree-container"]).attr(
            "transform",
            "translate(" + translate + ")scale(" + d3.event.scale + ")"
          );
        });
      svg.call(zoom);
    }

    return phylotree;

  };

  /**
   * Get or set CSS classes.
   *
   * @param {Object} opt Keys are the CSS class to toggle and values are
   * the parameters for that CSS class.
   * @param {Boolean} run_update (optional) Whether or not the tree should update.
   * @returns The current ``phylotree``.
   */
  phylotree.css_classes = function(opt, run_update) {
    if (!arguments.length) return css_classes;

    var do_update = false;

    for (var key in css_classes) {
      if (key in opt && opt[key] != css_classes[key]) {
        do_update = true;
        css_classes[key] = opt[key];
      }
    }

    if (run_update && do_update) {
      phylotree.layout();
    }

    return phylotree;
  };

  /**
   * Lay out the tree within the SVG.
   *
   * @param {Boolean} transitions Specify whether or not transitions should occur.
   * @returns The current ``phylotree``.
   */
  phylotree.layout = function(transitions) {

    if (svg) {
      svg.selectAll(
        "." +
          css_classes["tree-container"] +
          ",." +
          css_classes["tree-scale-bar"] +
          ",." +
          css_classes["tree-selection-brush"]
      );

      //.remove();
      d3_phylotree_trigger_layout(phylotree);
      return phylotree.update();
    }

    d3_phylotree_trigger_layout(phylotree);
    return phylotree;

  };

  phylotree.refresh = function() {

    if (svg) {
      // for re-entrancy
      let enclosure = svg.selectAll("." + css_classes["tree-container"]);

      let edges = enclosure.selectAll(
        d3_phylotree_edge_css_selectors(css_classes)
      ).attr("class", phylotree.reclass_edge);

      if (edge_styler) {
        edges.each(function(d) {
          edge_styler(d3.select(this), d);
        });
      }

      let nodes = enclosure.selectAll(
        d3_phylotree_node_css_selectors(css_classes)
      ).attr("class", phylotree.reclass_node);

      if (node_styler) {
        nodes.each(function(d) {
          node_styler(d3.select(this), d);
        });
      }
    }
  };

  phylotree.reclass_edge = function(edge) {
    var class_var = css_classes["branch"];
    if (d3_phylotree_item_tagged(edge)) {
      class_var += " " + css_classes["tagged-branch"];
    }
    if (d3_phylotree_item_selected(edge, selection_attribute_name)) {
      class_var += " " + css_classes["selected-branch"];
    }
    return class_var;
  };

  phylotree.reclass_node = function(node) {
    var class_var =
      css_classes[d3_phylotree_is_leafnode(node) ? "node" : "internal-node"];

    if (d3_phylotree_item_tagged(node)) {
      class_var += " " + css_classes["tagged-node"];
    }

    if (d3_phylotree_item_selected(node, selection_attribute_name)) {
      class_var += " " + css_classes["selected-node"];
    }

    if (!node["parent"]) {
      class_var += " " + css_classes["root-node"];
    }

    if (
      d3_phylotree_is_node_collapsed(node) ||
      d3_phylotree_has_hidden_nodes(node)
    ) {
      class_var += " " + css_classes["collapsed-node"];
    }
    return class_var;
  };

  /**
   * Select all descendents of a given node, with options for selecting
   * terminal/internal nodes.
   *
   * @param {Node} node The node whose descendents should be selected.
   * @param {Boolean} terminal Whether to include terminal nodes.
   * @param {Boolean} internal Whther to include internal nodes.
   * @returns {Array} An array of selected nodes.
   */
  phylotree.select_all_descendants = function(node, terminal, internal) {
    var selection = [];

    function sel(d) {
      if (d3_phylotree_is_leafnode(d)) {
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
  };

  phylotree.path_to_root = function(node) {
    var selection = [];
    while (node) {
      selection.push(node);
      node = node.parent;
    }
    return selection;
  };

  phylotree.draw_edge = function(container, edge, transition) {

    container = d3.select(container);

    container.attr("class", phylotree.reclass_edge).on("click", function(d) {
      phylotree.modify_selection([d.target], selection_attribute_name);
    });

    var new_branch_path = draw_branch([edge.source, edge.target]);

    if (transition) {
      if (container.datum().existing_path) {
        container.attr("d", function(d) {
          return d.existing_path;
        });
      }
      container.transition().attr("d", new_branch_path);
    } else {
      container.attr("d", new_branch_path);
    }
    edge.existing_path = new_branch_path;

    var bl = branch_length_accessor(edge.target);

    if (bl !== undefined) {
      var haz_title = container.selectAll("title");
      if (haz_title.empty()) {
        haz_title = container.append("title");
      }
      haz_title.text("Length = " + bl);
    } else {
      container.selectAll("title").remove();
    }

    if (edge_styler) {
      edge_styler(container, edge, transition);
    }

    return phylotree;

  };

  phylotree.clear_internal_nodes = function(respect) {
    if (!respect) {
      nodes.forEach(function(d) {
        if (!d3_phylotree_is_leafnode(d)) {
          d[selection_attribute_name] = false;
        }
      });
    }
  };

  phylotree.draw_node = function(container, node, transitions) {

    container = d3.select(container);

    var is_leaf = d3_phylotree_is_leafnode(node);

    if (is_leaf) {
      container.attr("data-node-name", node.name);
    }

    if (
      is_leaf ||
      (phylotree.show_internal_name(node) &&
        !d3_phylotree_is_node_collapsed(node))
    ) {

      var labels = container.selectAll("text").data([node]),
        tracers = container.selectAll("line");

      if (transitions) {
        labels
          .style("opacity", 0)
          .transition()
          .style("opacity", 1);
      }

      labels
        .enter()
        .append("text")
        .merge(labels)
        .on("click", phylotree.handle_node_click)
        .classed(css_classes["node_text"], true)
        .attr("dy", function(d) {
          return shown_font_size * 0.33;
        })
        .text(function(d) {
          return node_label(d);
        })
        .style("font-size", function(d) {
          return ensure_size_is_in_px(shown_font_size);
        });

      if (phylotree.radial()) {
        labels
          .attr("transform", function(d) {
            return (
              d3_phylotree_svg_rotate(d.text_angle) +
              d3_phylotree_svg_translate(
                phylotree.align_tips() ? phylotree.shift_tip(d) : null
              )
            );
          })
          .attr("text-anchor", function(d) {
            return d.text_align;
          });
      } else {
        labels
          .attr("text-anchor", "start")
          .attr("transform", function(d) {
            if (options["layout"] == "right-to-left") {
              return d3_phylotree_svg_translate([-20, 0]);
            }
            return d3_phylotree_svg_translate(
              phylotree.align_tips() ? phylotree.shift_tip(d) : null
            );
          });
      }

      if (phylotree.align_tips()) {

        tracers = tracers.data([node]);

        if (transitions) {
          tracers
            .enter()
            .append("line")
            .classed(css_classes["branch-tracer"], true)
            .attr("x1", function(d) {
              return (
                (d.text_align == "end" ? -1 : 1) *
                phylotree.node_bubble_size(node)
              );
            })
            .attr("x2", 0)
            .attr("y1", 0)
            .attr("y2", 0)
            .style("opacity", 0)
            .transition()
            .style("opacity", 1)
            .attr("x2", function(d) {
              if (options["layout"] == "right-to-left") {
                return d.screen_x;
              }
              return phylotree.shift_tip(d)[0];
            })
            .attr("transform", function(d) {
              return d3_phylotree_svg_rotate(d.text_angle);
            });

          tracers
            .merge(tracers)
            .attr("x2", function(d) {
              if (options["layout"] == "right-to-left") {
                return d.screen_x;
              }
              return phylotree.shift_tip(d)[0];
            })
            .attr("transform", function(d) {
              return d3_phylotree_svg_rotate(d.text_angle);
            });

        } else {
          tracers
          .enter()
          .append("line")
          .classed(css_classes["branch-tracer"], true)
          tracers
            .attr("x1", function(d) {
              return (
                (d.text_align == "end" ? -1 : 1) *
                phylotree.node_bubble_size(node)
              );
            })
            .attr("y2", 0)
            .attr("y1", 0)
            .transition()
            .attr("x2", function(d) {
              return phylotree.shift_tip(d)[0];
            });
          tracers.attr("transform", function(d) {
            return d3_phylotree_svg_rotate(d.text_angle);
          });
        }
      } else {
        tracers.remove();
      }

      if (options["draw-size-bubbles"]) {

        var shift = phylotree.node_bubble_size(node);
        let circles = container.selectAll("circle").data([shift])
                      .enter().append("circle");
        if (transitions) {
          circles = circles.transition();
        }
        circles.attr("r", function(d) {
          return d;
        });

        if (shown_font_size >= 5) {
          labels.attr("dx", function(d) {
            return (
              (d.text_align == "end" ? -1 : 1) *
              ((phylotree.align_tips() ? 0 : shift) + shown_font_size * 0.33)
            );
          });
        }
      } else {
        if (shown_font_size >= 5) {
          labels.attr("dx", function(d) {
            return (d.text_align == "end" ? -1 : 1) * shown_font_size * 0.33;
          });
        }
      }
    }

    if (!is_leaf) {
      let circles = container.selectAll("circle").data([node]).enter().append("circle"),
        radius = phylotree.node_circle_size()(node);

      if (radius > 0) {
        circles
          .attr("r", function(d) {
            return Math.min(shown_font_size * 0.75, radius);
          })
          .on("click", function(d) {
            phylotree.handle_node_click(d);
          });
      } else {
        circles.remove();
      }
    }

    if (node_styler) {
      node_styler(container, node);
    }

    return node;
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
    return _.filter(nodes, (n) => { return !_.has(n, "children")});
  };

  /**
   * Get the root node.
   *
   * @returns the current root node of the ``phylotree``.
   */
  phylotree.get_root_node = function() {
    return nodes[0];
  };

  /**
   * Get a node by name.
   *
   * @param {String} name Name of the desired node.
   * @returns {Node} Desired node.
   */
  phylotree.get_node_by_name = function(name) {
    return _.findWhere(nodes, { name: name });
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
    _.each(nodes, function(d) {
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
   * Getter/setter for the selection callback. This function is called
   * every time the current selection is modified, and its argument is
   * an array of nodes that make up the current selection.
   *
   * @param {Function} callback (Optional) The selection callback function.
   * @returns The current ``selection_callback`` if getting, or the current ``phylotree`` if setting.
   */
  phylotree.selection_callback = function(callback) {
    if (!callback) return selection_callback;
    selection_callback = callback;
    return phylotree;
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
    if(arguments.length == 1) {
      mrca_nodes = arguments[0];
    }
    else {
      mrca_nodes = Array.from(arguments);
    }
    mrca_nodes = mrca_nodes.map(function(mrca_node) {
      return typeof mrca_node == "string" ? mrca_node : mrca_node.name;
    });
    this.traverse_and_compute(function(node) {
      if(!node.children) {
        node.mrca = _.intersection([node.name], mrca_nodes);
      } else if(!node.parent) {
        if(!mrca) {
          mrca = node;
        }
      } else {
        node.mrca = _.union(...node.descendants().map(child=>child.mrca));
        if(!mrca && node.mrca.length == mrca_nodes.length) {
          mrca = node;
        }
      }
    });
    return mrca;
  }

  //d3.rebind(phylotree, d3_hierarchy, "sort", "children", "value");

  // Add an alias for nodes and links, for convenience.
  phylotree.nodes = phylotree;
  phylotree.links = phylotree;

  return phylotree;
};

//------------------------------------------------------------------------------

function d3_phylotree_item_selected(item, tag) {
  return item[tag] || false;
}

function d3_phylotree_node_visible(node) {
  return !(node.hidden || node.notshown || false);
}

function d3_phylotree_node_notshown(node) {
  return node.notshown;
}

function d3_phylotree_edge_visible(edge) {
  return !(edge.target.hidden || edge.target.notshown || false);
}

function d3_phylotree_item_tagged(item) {
  return item.tag || false;
}

function d3_phylotree_resize_svg(tree, svg, tr) {

  var sizes = tree.size();

  if (tree.radial()) {
    var pad_radius = tree.pad_width(),
      vertical_offset =
        tree.options()["top-bottom-spacing"] != "fit-to-size"
          ? tree.pad_height()
          : 0;

    sizes = [
      sizes[1] + 2 * pad_radius,
      sizes[0] + 2 * pad_radius + vertical_offset
    ];

    if (svg) {
      svg
        .selectAll("." + tree.css_classes()["tree-container"])
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
      sizes[1] +
        (tree.options()["left-right-spacing"] != "fit-to-size"
          ? tree.pad_width()
          : 0),
      sizes[0] +
        (tree.options()["top-bottom-spacing"] != "fit-to-size"
          ? tree.pad_height()
          : 0)
    ];
  }

  if (svg) {
    if (tr) {
      svg = svg.transition(100);
    }

    svg.attr("height", sizes[1]).attr("width", sizes[0]);
  }

  return sizes;
}

/**
 * Determine if a given node is a leaf node.
 *
 * @param {Node} A node in a tree.
 * @returns {Bool} Whether or not the node is a leaf node.
 */
function d3_phylotree_is_leafnode(node) {
  return !(node.children && node.children.length);
}

function d3_phylotree_has_hidden_nodes(node) {
  return node.has_hidden_nodes || false;
}

function d3_phylotree_is_node_collapsed(node) {
  return node.collapsed || false;
}

function d3_phylotree_node_css_selectors(css_classes) {
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

function d3_phylotree_edge_css_selectors(css_classes) {
  return [
    css_classes["branch"],
    css_classes["selected-branch"],
    css_classes["tagged-branch"]
  ].reduce(function(p, c, i, a) {
    return (p += "path." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

function d3_phylotree_clade_css_selectors(css_classes) {
  return [css_classes["clade"]].reduce(function(p, c, i, a) {
    return (p += "path." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

function d3_add_custom_menu(node, name, callback, condition) {
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

function d3_phylotree_rootpath(attr_name, store_name) {
  attr_name = attr_name || "attribute";
  store_name = store_name || "y_scaled";

  if ("parent" in this) {
    var my_value = parseFloat(this[attr_name]);
    this[store_name] =
      this.parent[store_name] + (isNaN(my_value) ? 0.1 : my_value);
  } else {
    this[store_name] = 0.0;
  }

  return this[store_name];
}

function d3_phylotree_rescale(scale, attr_name) {
  attr_name = attr_name || "y_scaled";
  if (attr_name in this) {
    this[attr_name] *= scale;
  }
}

function d3_phylotree_trigger_refresh(tree) {
  var event = new CustomEvent(d3_layout_phylotree_event_id, {
    detail: ["refresh", tree]
  });
  document.dispatchEvent(event);
}

function d3_phylotree_trigger_count_update(tree, counts) {
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

phylotree.is_leafnode = d3_phylotree_is_leafnode;
phylotree.add_custom_menu = d3_add_custom_menu;
phylotree.trigger_refresh = d3_phylotree_trigger_refresh;
phylotree.newick_parser = d3_phylotree_newick_parser;

// SW20180814 TODO: Remove. Registry functions should be private.
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
