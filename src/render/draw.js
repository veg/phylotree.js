import * as d3 from "d3";
import * as _ from "underscore";

import { draw_arc, cartesian_to_polar, arc_segment_placer } from "./radial";
import { default as draw_line, line_segment_placer } from "./cartesian";
import { is_leafnode } from "../nodes";
import { x_coord, y_coord } from "./coordinates";
import * as clades from "./clades";
import * as render_nodes from "./nodes";
import * as render_edges from "./edges";
import * as events from "./events";
import { css_classes } from "./options";
import * as opt from "./options";
import * as menus from "./menus";

// replacement for d3.functor
function constant(x) {
  return function() {
    return x;
  };
}

class TreeRender {
  constructor(phylotree, options = {}) {
    this.css_classes = css_classes;
    this.phylotree = phylotree;
    this.container = options.container;
    this.separation = function(_node, _previous) {
      return 0;
    };

    this._node_label = this.def_node_label;
    this.svg = null;
    this.selection_callback = null;
    this.scales = [1, 1];
    this.size = [1, 1];
    this.fixed_width = [14, 30];
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
      "show-labels": true,
      "node-styler": null,
      "edge-styler": null,
      "node-span": null
    };

    this.ensure_size_is_in_px = function(value) {
      return typeof value === "number" ? value + "px" : value;
    };

    this.options = _.defaults(options, default_options);

    this.width = this.options.width || 800;
    this.height = this.options.height || 600;

    this.node_styler = this.options['node-styler'];
    this.edge_styler = this.options['edge-styler'];

    this.node_span = this.options['node-span'];

    if(!this.node_span) {
      this.node_span = function(_node) {
        return 1;
      };
    }

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
    events.d3_phylotree_add_event_listener();
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
    return this.offsets[1] + this.options["left-offset"] + _label_width;
  }

  /**
   * Collapses a given node.
   *
   * @param {Node} node A node to be collapsed.
   */
  collapse_node(n) {
    if (!render_nodes.is_node_collapsed(n)) {
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
    //if (!arguments.length) return this.svg;

    if (this.svg !== svg_element) {
      d3.select(svg_element)
        .select("svg")
        .remove();

      this.svg = d3
        .create("svg")
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
          this.offsets[1] + this.options["left-offset"],
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
      .selectAll(render_edges.edge_css_selectors(css_classes))
      .data(this.links.filter(render_edges.edge_visible), d => {
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
      .selectAll(render_nodes.node_css_selectors(css_classes))
      .data(
        this.phylotree.nodes.descendants().filter(render_nodes.node_visible),
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

      var brush_object = d3
        .brush()
        .on("brush", () => {
          var extent = d3.event.target.extent(),
            shown_links = this.links.filter(render_edges.edge_visible),
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
      let zoom = d3.behavior
        .zoom()
        .scaleExtent([0.1, 10])
        .on("zoom", () => {
          let translate = d3.event.translate;
          translate[0] += this.offsets[1] + this.options["left-offset"];
          translate[1] += this.pad_height();

          d3.select("." + css_classes["tree-container"]).attr(
            "transform",
            "translate(" + translate + ")scale(" + d3.event.scale + ")"
          );
        });

      this.svg.call(zoom);
    }

    return this;
  }

  _handle_single_node_layout(
    a_node
  ) {
    let _node_span = this.node_span(a_node) / this.rescale_node_span;
    // compute the relative size of nodes (0,1)
    // sum over all nodes is 1
    
    this.x = a_node.x =
      this.x +
      this.separation(this.last_node, a_node) +
      (this.last_span + _node_span) * 0.5;
      
 
    // separation is a user-settable callback to add additional spacing on nodes
    this._extents[1][1] = Math.max(this._extents[1][1], a_node.y);
    this._extents[1][0] = Math.min(
      this._extents[1][0],
      a_node.y - _node_span * 0.5
    );
    

    if (this.is_under_collapsed_parent) {
       this._extents[0][1] = Math.max(
        this._extents[0][1],
        this.save_x +
          (a_node.x - this.save_x) * this.options["compression"] +
          this.save_span +
          (_node_span * 0.5 + this.separation(this.last_node, a_node)) *
            this.options["compression"]
      );      
    } else {
      this._extents[0][1] = Math.max(
        this._extents[0][1],
        this.x + _node_span * 0.5 + this.separation(this.last_node, a_node)
      );
    }


    this.last_node = a_node;
    this.last_span = _node_span;
    
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
    if (render_nodes.node_notshown(a_node)) {
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


    // last node laid out in the top bottom hierarchy

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
      this.last_node = null;
      this.last_span = 0.0;
      this._extents = [[0, 0], [0, 0]];
    }

    /** the next block has to do with top-to-bottom spacing of nodes **/

    if (is_leaf) {
      // displayed internal nodes are handled in `process_internal_node`
      this._handle_single_node_layout(
        a_node
      );
    }

    if (!is_leaf) {
      // for internal nodes
      if (
        render_nodes.is_node_collapsed(a_node) &&
        !this.is_under_collapsed_parent
      ) {
        // collapsed node
        this.save_x = this.x;
        this.save_span = this.last_span * 0.5;
        this.is_under_collapsed_parent = true;
        this.process_internal_node(a_node);
        this.is_under_collapsed_parent = false;
 
        if (typeof a_node.x === "number") {
          a_node.x =
            this.save_x +
            (a_node.x -this.save_x) * this.options["compression"] +
            this.save_span;

          a_node.collapsed = [[a_node.x, a_node.y]];

          var map_me = n => {
            n.hidden = true;

            if (is_leafnode(n)) {            
              this.x = n.x =
                this.save_x +
                (n.x - this.save_x) * this.options["compression"] +
                this.save_span;

              a_node.collapsed.push([n.x, n.y]);             
            } else {
              n.children.map(map_me);
            }
          };

          this.x = this.save_x;
          map_me(a_node);
         

          a_node.collapsed.splice(1, 0, [this.save_x, a_node.y]);
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
        (this.size[1] - this.offsets[1] - this.options["left-offset"]) /
        this._extents[1][1];

      this.label_width = this._label_width(this.shown_font_size);

      if (this.radial()) {
        this.label_width *= 2;
      }
    } else {
      this.label_width = this._label_width(this.shown_font_size);

      at_least_one_dimension_fixed = true;

      let available_width =
        this.size[1] - this.offsets[1] - this.options["left-offset"];

      if (available_width * 0.5 < this.label_width) {
        this.shown_font_size *= (available_width * 0.5) / this.label_width;
        this.label_width = available_width * 0.5;
      }

      this.scales[1] =
        (this.size[1] -
          this.offsets[1] -
          this.options["left-offset"] -
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
    this._extents = [
      [0, 0],
      [0, 0]
    ];

    this.x = 0.0;
    this.last_span = 0.0;
    //let x = 0.0,
    //  last_span = 0;
    
    this.last_node = null;
    this.last_span = 0.0;

    (this.save_x = this.x), (this.save_span = this.last_span * 0.5);

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
      this.draw_branch = _.partial(draw_arc, this.radial_center);
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
        d.angle = (2 * Math.PI * my_circ_position) / effective_span;
        d.text_angle = d.angle - Math.PI / 2;
        d.text_angle = d.text_angle > 0 && d.text_angle < Math.PI;
        d.text_align = d.text_angle ? "end" : "start";
        d.text_angle = (d.text_angle ? 180 : 0) + (d.angle * 180) / Math.PI;
      });

      this.do_lr(at_least_one_dimension_fixed);

      this.phylotree.nodes.each(d => {
        d.radius = (d.y * this.scales[1]) / this.size[1];
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
      this.draw_branch = _.partial(draw_arc, this.radial_center);

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
          d.collapsed.forEach(p => {
            p[0] *= this.scales[0];
            p[1] *= this.scales[1]*.8;
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
            Math.log((this._extents[1][1] * range_limit) / this.radius) /
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
          this.size[1] - this.offsets[1] - this.options["left-offset"] - this.shown_font_size;
     }

      let scale = d3
          .scaleLinear()
          .domain([0, domain_limit])
          .range([0, range_limit]),
         
          scaleTickFormatter = d3.format(".2f");

      this.draw_scale_bar = d3
        .axisTop()
        .scale(scale)
        .tickFormat(function(d) {
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
                  2),
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
      .filter(render_nodes.node_visible)
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
    this.options["node_circle_size"] = constant(attr === undefined ? 3 : attr);
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
        .selectAll(render_edges.edge_css_selectors(this.css_classes))
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

  show() {
    return this.svg.node()
  }

}

_.extend(TreeRender.prototype, clades);
_.extend(TreeRender.prototype, render_nodes);
_.extend(TreeRender.prototype, render_edges);
_.extend(TreeRender.prototype, events);
_.extend(TreeRender.prototype, menus);
_.extend(TreeRender.prototype, opt);

export default TreeRender;
