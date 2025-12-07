import * as d3 from "d3";

import { itemTagged, itemSelected } from "./helpers";
import { isLeafNode } from "../nodes";
import { css_classes } from "./options";

export function shiftTip(d) {

  if (this.radial()) {
    return [
      (d.text_align == "end" ? -1 : 1) *
        (this.radius_pad_for_bubbles - d.radius),
      0
    ];
  }

  if (this.options["right-to-left"]) {
    return [d.screen_x - this.left_most_leaf, 0];
  }

  return [this.right_most_leaf - d.screen_x, 0];

}

export function drawNode(container, node, transitions) {

  container = d3.select(container);
  var is_leaf = isLeafNode(node);

  if (is_leaf) {
    container = container.attr("data-node-name", node.data.name);
  }

  var labels = container.selectAll("text").data([node]),
    tracers = container.selectAll("line");

  if (is_leaf || (this.showInternalName(node) && !isNodeCollapsed(node))) {

    labels = labels
      .enter()
      .append("text")
      .classed(this.css_classes["node_text"], true)
      .merge(labels)
      .on("click", (event, d) => {
        this.emit('nodeClick', node, event);
        this.handle_node_click(node, event);
      })
      .on("mouseenter", (event) => {
        this.emit('nodeHover', node, event);
      })
      .attr("dy", d => {
        return this.shown_font_size * 0.33;
      })
      .text(d => {
        return this.options["show-labels"] ? this._nodeLabel(d) : "";
      })
      .style("font-size", d => {
        return this.ensure_size_is_in_px(this.shown_font_size);
      });

    if (this.radial()) {
      labels = labels
        .attr("transform", d => {
          return (
            this.d3PhylotreeSvgRotate(d.text_angle) +
            this.d3PhylotreeSvgTranslate(
              this.alignTips() ? this.shiftTip(d) : null
            )
          );
        })
        .attr("text-anchor", d => {
          return d.text_align;
        });
    } else {
      labels = labels
      .attr("text-anchor", d => {
        // For right-to-left labels to the right of nodes -> alignment "end"
        return this.options["layout"] == "right-to-left" ? "end" : "start";
      })
      .attr("transform", d => {
        if (this.options["layout"] == "right-to-left") {
          if (this.alignTips()) {
            const shift = this.max_label_shift || (d.screen_x - this.left_most_leaf);
            return this.d3PhylotreeSvgTranslate([-shift - 20, 0]);
          }
          return this.d3PhylotreeSvgTranslate([-20, 0]);
        }
        return this.d3PhylotreeSvgTranslate(
          this.alignTips() ? this.shiftTip(d) : null
        );
      });
    }

    if (this.alignTips()) {
      tracers = tracers.data([node]);

      if (transitions) {
        tracers = tracers
          .enter()
          .append("line")
          .classed(this.css_classes["branch-tracer"], true)
          .merge(tracers)
          .attr("x1", d => {
            if (this.options["layout"] == "right-to-left" && !this.radial()) {
              // line begins at label - use max_label_shift
              const shift = this.max_label_shift || (d.screen_x - this.left_most_leaf);
              return -shift;
            }
            return (
              (d.text_align == "end" ? -1 : 1) * this.nodeBubbleSize(node)
            );
          })
          .attr("x2", 0)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("x2", d => {
            if (this.options["layout"] == "right-to-left") {
              return d.screen_x;
            }

            return this.shiftTip(d)[0];
          })
          .attr("transform", d => {
            return this.d3PhylotreeSvgRotate(d.text_angle);
          })
          .attr("x2", d => {
            if (this.options["layout"] == "right-to-left") {
              return 0;
            }
            return this.shiftTip(d)[0];
          })
          .attr("transform", d => {
            return this.d3PhylotreeSvgRotate(d.text_angle);
          });
      } else {
        tracers = tracers
          .enter()
          .append("line")
          .classed(this.css_classes["branch-tracer"], true)
          .merge(tracers)
          .attr("x1", d => {
            if (this.options["layout"] == "right-to-left" && !this.radial()) {
              // line begins at label - use max_label_shift
              const shift = this.max_label_shift || (d.screen_x - this.left_most_leaf);
              return -shift;
            }
            return (
              (d.text_align == "end" ? -1 : 1) * this.nodeBubbleSize(node)
            );
          })
          .attr("y2", 0)
          .attr("y1", 0)
          .attr("x2", d => {
            if (this.options["layout"] == "right-to-left") {
              // node's line end (x2 = 0)
              return 0;
            }
            return this.shiftTip(d)[0];
          });
        tracers.attr("transform", d => {
          return this.d3PhylotreeSvgRotate(d.text_angle);
        });
      }
    } else {
      tracers.remove();
    }

    if (this.options["draw-size-bubbles"]) {

      var shift = this.nodeBubbleSize(node);

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
            ((this.alignTips() ? 0 : shift) + this.shown_font_size * 0.33)
          );
        });
      }
    } else {
      if (this.shown_font_size >= 5) {
        labels = labels.attr("dx", d => { // eslint-disable-line
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
        .on("click", (event, d) => {
          this.emit('nodeClick', node, event);
          this.handle_node_click(node, event);
        })
        .on("mouseenter", (event) => {
          this.emit('nodeHover', node, event);
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

export function updateHasHiddenNodes() {
  let nodes = this.phylotree.nodes.descendants();

  for (let k = nodes.length - 1; k >= 0; k -= 1) {
    if (isLeafNode(nodes[k])) {
      nodes[k].hasHiddenNodes = nodes[k].notshown;
    } else {
      nodes[k].hasHiddenNodes = nodes[k].children.reduce(function(p, c) {
        return c.notshown || p;
      }, false);
    }
  }

  return this;
}

export function showInternalName(node) {

  const i_names = this.internalNames();

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
 * @param {Function} attr Optional; if setting, the nodeSpan function.
 * @returns The ``nodeSpan`` if getting, or the current ``phylotree`` if setting.
 */
export function nodeSpan(attr) {
  if (!arguments.length) return this.nodeSpan;
  if (typeof attr == "string" && attr == "equal") {
    this.nodeSpan = function(d) {
      return 1;
    };
  } else {
    this.nodeSpan = attr;
  }
  return this;
}

export function reclassNode(node) {

  let class_var = css_classes[isLeafNode(node) ? "node" : "internal-node"];

  if (itemTagged(node)) {
    class_var += " " + css_classes["tagged-node"];
  }

  if (itemSelected(node, this.selection_attribute_name)) {
    class_var += " " + css_classes["selected-node"];
  }

  if (!node["parent"]) {
    class_var += " " + css_classes["root-node"];
  }

  if (isNodeCollapsed(node) || hasHiddenNodes(node)) {
    class_var += " " + css_classes["collapsed-node"];
  }

  return class_var;
}

export function nodeVisible(node) {
  return !(node.hidden || node.notshown || false);
}

export function nodeNotshown(node) {
  return node.notshown;
}

export function hasHiddenNodes(node) {
  return node.hasHiddenNodes || false;
}

export function isNodeCollapsed(node) {
  return node.collapsed || false;
}

export function nodeCssSelectors(css_classes) {
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

export function internalLabel(callback, respect_existing) {

  this.phylotree.clearInternalNodes(respect_existing);

  for (var i = this.phylotree.nodes.descendants().length - 1; i >= 0; i--) {

    var d = this.phylotree.nodes.descendants()[i];

    if (!(isLeafNode(d) || itemSelected(d, this.selection_attribute_name))) {
      d[this.selection_attribute_name] = callback(d.children);
    }

  }

  this.modifySelection((d, callback) => {
    if (isLeafNode(d.target)) {
      return d.target[this.selection_attribute_name];
    }
    return d.target[this.selection_attribute_name];
  });
}

export function defNodeLabel(_node) {

  _node = _node.data;

  if (isLeafNode(_node)) {
    return _node.name || "";
  }

  if (this.showInternalName(_node)) {
    return _node.name;
  }

  return "";

}

/**
 * Get or set nodeLabel accessor.
 *
 * @param {Function} attr (Optional) If setting, a function that accesses a branch name
 * from a node.
 * @returns The ``nodeLabel`` accessor if getting, or the current ``this`` if setting.
 */
export function nodeLabel(attr) {
  if (!arguments.length) return this._nodeLabel;
  this._nodeLabel = attr ? attr : defNodeLabel;
	this.update();
  return this;
}


