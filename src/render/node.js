import * as inspector from "../inspectors";

export function shift_tip (d) {


  if (this.phylotree.radial()) {

    return [
      (d.text_align == "end" ? -1 : 1) * (this.radius_pad_for_bubbles - d.radius),
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
      if (!inspector.is_leafnode(d)) {
        d[selection_attribute_name] = false;
      }
    });
  }

}

export function draw_node(container, node, transitions) {

  container = d3.select(container);

  var is_leaf = inspector.is_leafnode(node);

  if (is_leaf) {
    container = container.attr("data-node-name", node.data.name);
  }

  let labels = container.selectAll("text").data([node]),
    tracers = container.selectAll("line");

  if (
    is_leaf ||
    (this.phylotree.show_internal_name(node) && !inspector.is_node_collapsed(node))
  ) {

    labels = labels
      .enter()
      .append("text")
      .classed(this.css_classes["node_text"], true)
      .merge(labels)
      .on("click", this.phylotree.handle_node_click)
      .attr("dy", (d) => {
        return this.shown_font_size * 0.33;
      })
      .text((d) => {
        return this.options["show-labels"] ? this.node_label(d) : "";
      })
      .style("font-size", (d) => {
        return this.ensure_size_is_in_px(this.shown_font_size);
      });

    if (this.phylotree.radial()) {

      labels = labels
        .attr("transform", (d) => {
          return (
            this.d3_phylotree_svg_rotate(d.text_angle) +
            this.d3_phylotree_svg_translate(
              this.phylotree.align_tips() ? this.shift_tip(d) : null
            )
          );
        })
        .attr("text-anchor", (d) => {
          return d.text_align;
        });

    } else {

      labels = labels
        .attr("text-anchor", "start")
        .attr("transform", (d) => {

          if (this.options["layout"] == "right-to-left") {
            return this.d3_phylotree_svg_translate([-20, 0]);
          }
          return this.d3_phylotree_svg_translate(
            this.phylotree.align_tips() ? this.shift_tip(d) : null
          );

        });

    }

    if (this.phylotree.align_tips()) {

      tracers = tracers.data([node]);

      if (transitions) {

        tracers = tracers
          .enter()
          .append("line")
          .classed(this.css_classes["branch-tracer"], true)
          .merge(tracers)
          .attr("x1", (d) => {
            return (
              (d.text_align == "end" ? -1 : 1) *
              this.phylotree.node_bubble_size(node)
            );
          })
          .attr("x2", 0)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("x2", (d) => {

            if (this.options["layout"] == "right-to-left") {
              return d.screen_x;
            }

            return this.shift_tip(d)[0];

          })
          .attr("transform", (d) => {
            return this.d3_phylotree_svg_rotate(d.text_angle);
          })
          .attr("x2", (d) => {
            if (this.options["layout"] == "right-to-left") {
              return d.screen_x;
            }
            return this.shift_tip(d)[0];
          })
          .attr("transform", (d) => {
            return this.d3_phylotree_svg_rotate(d.text_angle);
          });

      } else {

        tracers = tracers
          .enter()
          .append("line")
          .classed(this.css_classes["branch-tracer"], true)
          .merge(tracers)
          .attr("x1", (d) => {
            return (
              (d.text_align == "end" ? -1 : 1) *
              this.phylotree.node_bubble_size(node)
            );
          })
          .attr("y2", 0)
          .attr("y1", 0)
          .attr("x2", (d) => {
            return this.shift_tip(d)[0];
          });
        tracers.attr("transform", (d) => {
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

        labels = labels.attr("dx", (d) => {
          return (
            (d.text_align == "end" ? -1 : 1) *
            ((this.phylotree.align_tips() ? 0 : shift) + this.shown_font_size * 0.33)
          );
        });

      }

    } else {

      if (this.shown_font_size >= 5) {

        labels = labels.attr("dx", (d) => {
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
        .attr("r", (d) => {
          return Math.min(this.shown_font_size * 0.75, radius);
        })
        .on("click", (d) => {
          this.phylotree.handle_node_click(d);
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

