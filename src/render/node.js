
export function clear_internal_nodes(respect) {
  if (!respect) {
    self.nodes.each(function(d) {
      if (!inspector.is_leafnode(d)) {
        d[selection_attribute_name] = false;
      }
    });
  }
};

export function draw_node = function(container, node, transitions) {
  container = d3.select(container);

  var is_leaf = inspector.is_leafnode(node);

  if (is_leaf) {
    container = container.attr("data-node-name", node.name);
  }

  if (
    is_leaf ||
    (phylotree.show_internal_name(node) && !inspector.is_node_collapsed(node))
  ) {
    let labels = container.selectAll("text").data([node]),
      tracers = container.selectAll("line");

    labels = labels
      .enter()
      .append("text")
      .classed(css_classes["node_text"], true)
      .merge(labels)
      .on("click", phylotree.handle_node_click)
      .attr("dy", function(d) {
        return shown_font_size * 0.33;
      })
      .text(function(d) {
        return options["show-labels"] ? node_label(d) : "";
      })
      .style("font-size", function(d) {
        return ensure_size_is_in_px(shown_font_size);
      });

    if (phylotree.radial()) {
      labels = labels
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
      labels = labels
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
        tracers = tracers
          .enter()
          .append("line")
          .classed(css_classes["branch-tracer"], true)
          .merge(tracers)
          .attr("x1", function(d) {
            return (
              (d.text_align == "end" ? -1 : 1) *
              phylotree.node_bubble_size(node)
            );
          })
          .attr("x2", 0)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("x2", function(d) {
            if (options["layout"] == "right-to-left") {
              return d.screen_x;
            }
            return phylotree.shift_tip(d)[0];
          })
          .attr("transform", function(d) {
            return d3_phylotree_svg_rotate(d.text_angle);
          })
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
        tracers = tracers
          .enter()
          .append("line")
          .classed(css_classes["branch-tracer"], true)
          .merge(tracers)
          .attr("x1", function(d) {
            return (
              (d.text_align == "end" ? -1 : 1) *
              phylotree.node_bubble_size(node)
            );
          })
          .attr("y2", 0)
          .attr("y1", 0)
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

      let circles = container
        .selectAll("circle")
        .data([shift])
        .enter()
        .append("circle");

      circles.attr("r", function(d) {
        return d;
      });

      if (shown_font_size >= 5) {
        labels = labels.attr("dx", function(d) {
          return (
            (d.text_align == "end" ? -1 : 1) *
            ((phylotree.align_tips() ? 0 : shift) + shown_font_size * 0.33)
          );
        });
      }
    } else {
      if (shown_font_size >= 5) {
        labels = labels.attr("dx", function(d) {
          return (d.text_align == "end" ? -1 : 1) * shown_font_size * 0.33;
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

