import * as d3 from "d3";
import * as _ from "underscore";

import { item_tagged, item_selected } from "./helpers";
import { is_leafnode } from "../nodes";
import { css_classes } from "./options";

export function shift_tip(d) {

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

export function clear_internal_nodes(respect) {
  if (!respect) {
    self.nodes.each(function(d) {
      if (!is_leafnode(d)) {
        d[selection_attribute_name] = false;
      }
    });
  }
}

export function draw_node(container, node, transitions) {

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
        return this.options["show-labels"] ? this.node_label(d) : "";
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
      var shift = this.phylotree.node_bubble_size(node);

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

export function update_has_hidden_nodes() {
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

export function show_internal_name(node) {
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
export function node_span(attr) {
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

export function reclass_node(node) {
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

export function node_visible(node) {
  return !(node.hidden || node.notshown || false);
}

export function node_notshown(node) {
  return node.notshown;
}

export function has_hidden_nodes(node) {
  return node.has_hidden_nodes || false;
}

export function is_node_collapsed(node) {
  return node.collapsed || false;
}

export function node_css_selectors(css_classes) {
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

export function internal_label(callback, respect_existing) {
  clear_internal_nodes(respect_existing);

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

export function def_node_label(_node) {
  _node = _node.data;

  if (is_leafnode(_node)) {
    return _node.name || "";
  }

  if (this.show_internal_name(_node)) {
    return _node.name;
  }

  return "";
}
