import * as inspector from "../inspectors";
import {css_classes} from "../accessors";

let d3_layout_phylotree_event_id = "phylotree.event";

/**
 * Toggle collapsed view of a given node. Either collapses a clade into
 * a smaller blob for viewing large trees, or expands a node that was
 * previously collapsed.
 *
 * @param {Node} node The node to toggle.
 * @returns {Phylotree} The current ``phylotree``.
 */
export function toggle_collapse(node) {

  if (node.collapsed) {

    node.collapsed = false;

    let unhide = function(n) {

      if (!inspector.is_leafnode(n)) {
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

  this.placenodes();
  return this;

}

export function resize_svg(tree, svg, tr) {

  var sizes = this.size;

  if (this.phylotree.radial()) {

    let pad_radius = this.pad_width(),
      vertical_offset =
        this.options["top-bottom-spacing"] != "fit-to-size"
          ? this.pad_height()
          : 0;

    sizes = [
      sizes[1] + 2 * pad_radius,
      sizes[0] + 2 * pad_radius + vertical_offset
    ];

    if (svg) {
      svg
        .selectAll("." + css_classes["tree-container"])
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
        (this.options["left-right-spacing"] != "fit-to-size"
          ? this.pad_width()
          : 0),
      sizes[0] +
        (this.options["top-bottom-spacing"] != "fit-to-size"
          ? this.pad_height()
          : 0)
    ];
  }

  return sizes;

}

export function rescale(scale, attr_name) {
  attr_name = attr_name || "y_scaled";
  if (attr_name in this) {
    this[attr_name] *= scale;
  }
}

export function trigger_refresh(tree) {
  var event = new CustomEvent(d3_layout_phylotree_event_id, {
    detail: ["refresh", tree]
  });
  document.dispatchEvent(event);
}

export function count_update(tree, counts) {
  var event = new CustomEvent(d3_layout_phylotree_event_id, {
    detail: ["count_update", counts, tree.count_handler()]
  });
  document.dispatchEvent(event);
}

export function d3_phylotree_trigger_layout(tree) {
  var event = new CustomEvent(d3_layout_phylotree_event_id, {
    detail: ["layout", tree, tree.layout_handler()]
  });
  document.dispatchEvent(event);
}

export function d3_phylotree_event_listener(event) {
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

export function d3_phylotree_add_event_listener() {
  document.addEventListener(
    d3_layout_phylotree_event_id,
    d3_phylotree_event_listener,
    false
  );
}

export function d3_phylotree_svg_translate(x) {
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

export function d3_phylotree_svg_rotate(a) {
  if (a !== null) {
    return "rotate (" + a + ") ";
  }
  return "";
}


