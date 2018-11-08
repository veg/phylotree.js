import * as inspector from "./inspectors";
import { draw_arc, cartesian_to_polar, arc_segment_placer } from "./radial";
import { draw_line, line_segment_placer } from "./cartesian";
import {def_node_label} from './nodes';

// replacement for d3.functor
function constant(x) {
  return function() {
    return x;
  };
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
}

class TreeRender {

  constructor(container) {

    // TODO: inherit `this` from Phylotree

    let draw_branch = draw_line,
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
      radius_pad_for_bubbles = 0;

      let options = {
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
        "show-menu": true,
        "show-labels": true
      }

      this.node_label = def_node_label;
      this.svg = null;
      this.selection_callback = null;

      this.scales = [
        1,
        1
      ];

      this.fixed_width = [
        15,
        20
      ];

      this.font_size = 12;
      this.scale_bar_font_size = 12;

      this.offsets = [
        0,
        this.font_size / 2
      ];

      const ensure_size_is_in_px = function(value) {
        return typeof value === "number" ? value + "px" : value;
      }



  }

  pad_height() {
    if (this.draw_scale_bar) {
      return this.scale_bar_font_size + 25;
    }

    return 0;
  }

  pad_width() {
    const _label_width = options["show-labels"] ? label_width : 0;
    return offsets[1] + options["left-offset"] + _label_width;
  }

  /**
   * Collapses a given node.
   *
   * @param {Node} node A node to be collapsed.
   */
  collapse_node(n) {
    if (!inspector.is_node_collapsed(n)) {
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
  size(attr) {
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
  }

  /**
   * Getter/setter for the SVG element for the Phylotree to be rendered in.
   *
   * @param {d3-selection} svg_element (Optional) SVG element to render within, selected by D3.
   * @returns The selected SVG element if getting, or the current ``phylotree`` if setting.`
   */
  svg(svg_element) {
    if (!arguments.length) return svg;
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
  }

  update_layout(new_json, do_hierarchy) {
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
  }

  /**
   * Update the current phylotree, i.e., alter the svg
   * elements.
   *
   * @param {Boolean} transitions (Optional) Toggle whether transitions should be shown.
   * @returns The current ``phylotree``.
   */
  update(transitions) {
    if (!phylotree.svg) return phylotree;

    transitions = phylotree.transitions(transitions);

    let node_id = 0;

    let enclosure = svg
      .selectAll("." + css_classes["tree-container"])
      .data([0]);

    enclosure = enclosure
      .enter()
      .append("g")
      .attr("class", css_classes["tree-container"])
      .merge(enclosure)
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

      scale_bar
        .enter()
        .append("g")
        .attr("class", css_classes["tree-scale-bar"])
        .style("font-size", this.ensure_size_is_in_px(scale_bar_font_size))
        .merge(scale_bar)
        .attr("transform", function(d) {
          return d3_phylotree_svg_translate([
            offsets[1] + options["left-offset"],
            phylotree.pad_height() - 10
          ]);
        })
        .call(draw_scale_bar);

      scale_bar.selectAll("text").style("text-anchor", "end");
    } else {
      svg.selectAll("." + css_classes["tree-scale-bar"]).remove();
    }

    enclosure = svg.selectAll("." + css_classes["tree-container"]).data([0]);

    update_collapsed_clades(transitions);

    let drawn_links = enclosure
      .selectAll(inspector.edge_css_selectors(css_classes))
      .data(links.filter(inspector.edge_visible), function(d) {
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
        phylotree.draw_edge(this, d, transitions);
      });

    let drawn_nodes = enclosure
      .selectAll(inspector.node_css_selectors(css_classes))
      .data(self.nodes.descendants().filter(inspector.node_visible), function(
        d
      ) {
        return d.id || (d.id = ++node_id);
      });

    if (transitions) {
      drawn_nodes.exit().remove();
    } else {
      drawn_nodes.exit().remove();
    }

    drawn_nodes = drawn_nodes
      .enter()
      .append("g")
      .attr("class", phylotree.reclass_node)
      .merge(drawn_nodes)
      .attr("transform", function(d) {
        const should_shift =
          options["layout"] == "right-to-left" && inspector.is_leafnode(d);

        d.screen_x = x_coord(d);
        d.screen_y = y_coord(d);

        return d3_phylotree_svg_translate([
          should_shift ? 0 : d.screen_x,
          d.screen_y
        ]);
      })
      .each(function(d) {
        phylotree.draw_node(this, d, transitions);
      })
      .attr("transform", function(d) {
        if (!_.isUndefined(d.screen_x) && !_.isUndefined(d.screen_y)) {
          return "translate(" + d.screen_x + "," + d.screen_y + ")";
        }
      });

    if (options["label-nodes-with-name"]) {
      drawn_nodes = drawn_nodes.attr("id", function(d) {
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

      var brush_object = d3
        .brush()
        .on("brush", function() {
          var extent = d3.event.target.extent(),
            shown_links = links.filter(inspector.edge_visible),
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
          //brush.call(d3.event.target.clear());
        });

      brush.call(brush_object);
    }

    phylotree.sync_edge_labels();

    if (options["zoom"]) {
      let zoom = d3.behavior
        .zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", function() {
          let translate = d3.event.translate;
          translate[0] += offsets[1] + options["left-offset"];
          translate[1] += phylotree.pad_height();
          d3
            .select("." + css_classes["tree-container"])
            .attr(
              "transform",
              "translate(" + translate + ")scale(" + d3.event.scale + ")"
            );
        });

      svg.call(zoom);
    }

    return phylotree;
  }

  /**
   * Place the current nodes, i.e., determine their coordinates based
   * on current settings.
   *
   * @returns The current ``phylotree``.
   */
  placenodes() {
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
            decide if the node will be shown, and compute its top-to-bottom (breadthwise)
            placement 
        */

      let count_undefined = 0;

      if (phylotree.show_internal_name(a_node)) {
        // do in-order traversal to allow for proper internal node spacing
        // (x/2) >> 0 is integer division
        let half_way = (a_node.children.length / 2) >> 0;
        let displayed_children = 0;
        let managed_to_display = false;

        for (let child_id = 0; child_id < a_node.children.length; child_id++) {
          let child_x = tree_layout(a_node.children[child_id]);
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
      if (inspector.node_notshown(a_node)) {
        return undefined;
      }

      var is_leaf = inspector.is_leafnode(a_node);

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
        if (inspector.is_node_collapsed(a_node) && !is_under_collapsed_parent) {
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

              if (inspector.is_leafnode(n)) {
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
      self.nodes.children
        .map(function(d) {
          if (inspector.is_leafnode(d) || phylotree.show_internal_name(d))
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

        let available_width = size[1] - offsets[1] - options["left-offset"];

        if (available_width * 0.5 < label_width) {
          shown_font_size *= available_width * 0.5 / label_width;
          label_width = available_width * 0.5;
        }

        const _label_width = options["show-labels"] ? label_width : 0;
        scales[1] =
          (size[1] - offsets[1] - options["left-offset"] - _label_width) /
          _extents[1][1];
      }
    }

    if (phylotree.radial()) {
      // map the nodes to polar coordinates
      draw_branch = _.partial(draw_arc, _, radial_center);
      edge_placer = arc_segment_placer;

      let last_child_angle = null,
        last_circ_position = null,
        last_child_radius = null,
        min_radius = 0,
        effective_span = _extents[0][1] * scales[0];

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

      var max_r = 0;

      self.nodes.each(function(d) {
        let my_circ_position = d.x * scales[0];
        d.angle = 2 * Math.PI * my_circ_position / effective_span;
        d.text_angle = d.angle - Math.PI / 2;
        d.text_angle = d.text_angle > 0 && d.text_angle < Math.PI;
        d.text_align = d.text_angle ? "end" : "start";
        d.text_angle = (d.text_angle ? 180 : 0) + d.angle * 180 / Math.PI;
      });

      do_lr();

      self.nodes.each(function(d) {
        d.radius = d.y * scales[1] / size[1];
        max_r = Math.max(d.radius, max_r);
      });

      let annular_shift = 0;

      self.nodes.each(function(d) {
        if (!d.children) {
          let my_circ_position = d.x * scales[0];
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
                : 10 * options["max-radius"];

            if (local_mr > options["max-radius"]) {
              // adjust the annular shift
              let dd = required_spacing / options["max-radius"],
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
      draw_branch = _.partial(draw_arc, _, radial_center);

      let scaler = 1;

      if (annular_shift) {
        scaler = max_r / (max_r + annular_shift);
        radius *= scaler;
      }

      self.nodes.each(function(d) {
        cartesian_to_polar(
          d,
          radius,
          annular_shift,
          radial_center,
          scales,
          size
        );

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
            let z = {};
            z.x = p[0];
            z.y = p[1];
            z = cartesian_to_polar(
              z,
              radius,
              annular_shift,
              radial_center,
              scales,
              size
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

        if (inspector.is_leafnode(d)) {
          right_most_leaf = Math.max(
            right_most_leaf,
            d.y + phylotree.node_bubble_size(d)
          );
        }

        if (d.collapsed) {
          d.collapsed.map(function(p) {
            return [(p[0] *= scales[0]), (p[1] *= scales[1])];
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

    if (draw_scale_bar) {
      let domain_limit, range_limit;

      if (phylotree.radial()) {
        range_limit = Math.min(radius / 5, 50);
        domain_limit = Math.pow(
          10,
          Math.ceil(
            Math.log(_extents[1][1] * range_limit / radius) / Math.log(10)
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

      let scale = d3
          .scaleLinear()
          .domain([0, domain_limit])
          .range([shown_font_size, shown_font_size + range_limit]),
        scaleTickFormatter = d3.format(".2g");

      draw_scale_bar = d3.axisTop().scale(scale).tickFormat(function(d) {
        if (d === 0) {
          return "";
        }

        return scaleTickFormatter(d);
      });

      if (phylotree.radial()) {
        draw_scale_bar.tickValues([domain_limit]);
      } else {
        let round = function(x, n) {
          return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
        };

        let my_ticks = scale.ticks();
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
  }

  /**
   * Get or set spacing in the x-direction.
   *
   * @param {Number} attr (Optional), the new spacing value if setting.
   * @param {Boolean} skip_render (Optional), whether or not a refresh should be performed.
   * @returns The current ``spacing_x`` value if getting, or the current ``phylotree`` if setting.
   */
  spacing_x(attr, skip_render) {
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
  }

  /**
   * Get or set spacing in the y-direction.
   *
   * @param {Number} attr (Optional), the new spacing value if setting.
   * @param {Boolean} skip_render (Optional), whether or not a refresh should be performed.
   * @returns The current ``spacing_y`` value if getting, or the current ``phylotree`` if setting.
   */
  spacing_y(attr, skip_render) {
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
    return this;
  }

  _label_width (_font_size) {

    _font_size = _font_size || this.shown_font_size;

    var width = 0;

    self.nodes
      .descendants()
      .filter(inspector.node_visible)
      .forEach(function(node) {
        let node_width = 12 + this.node_label(node).length * _font_size * 0.8;
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
  font_size (attr) {
    if (!arguments.length) return this.font_size;
    this.font_size = attr === undefined ? 12 : attr;
    return this;
  }

  scale_bar_font_size (attr) {
    if (!arguments.length) return this.scale_bar_font_size;
    this.scale_bar_font_size = attr === undefined ? 12 : attr;
    return this;
  }

  node_circle_size (attr, attr2) {
    if (!arguments.length) return this.options["node_circle_size"];
    options["node_circle_size"] = constant(attr === undefined ? 3 : attr);
    return phylotree;
  }

  css (opt) {
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

    return this.nodes.descendants().length <= 300;

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

    var do_update = false;

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
  layout (transitions) {
    if (this.svg) {
      this.svg.selectAll(
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
  }

  refresh () {

    if (svg) {
      // for re-entrancy
      let enclosure = svg.selectAll("." + css_classes["tree-container"]);

      let edges = enclosure
        .selectAll(inspector.edge_css_selectors(css_classes))
        .attr("class", phylotree.reclass_edge);

      if (edge_styler) {
        edges.each(function(d) {
          edge_styler(d3.select(this), d);
        });
      }

      let nodes = enclosure
        .selectAll(inspector.node_css_selectors(css_classes))
        .attr("class", phylotree.reclass_node);

      if (node_styler) {
        nodes.each(function(d) {
          node_styler(d3.select(this), d);
        });
      }
    }

  };


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
export function style_nodes(attr) {
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
export function style_edges(attr) {
  if (!arguments.length) return edge_styler;
  edge_styler = attr.bind(this);
  return phylotree;
};

