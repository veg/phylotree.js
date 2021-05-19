import * as d3 from "d3";
import { item_tagged, item_selected } from "./helpers";
import { css_classes } from "./options";

export function draw_edge(container, edge, transition) {

  container = d3.select(container);

  container = container
    .attr("class", d => {
      return this.reclass_edge(d);
    })
    .on("click", d => {
      this.modify_selection([d.target], this.selection_attribute_name);
      this.update();
    });

  let new_branch_path = this.draw_branch([edge.source, edge.target]);

  if (transition) {

    if (container.datum().existing_path) {
      container = container.attr("d", function(d) {
        return d.existing_path;
      });
    }

    container = container.attr("d", new_branch_path);

  } else {
    container = container.attr("d", new_branch_path);
  }

  edge.existing_path = new_branch_path;

  var bl = this.phylotree.branch_length_accessor(edge.target);

  if (bl !== undefined) {
    var haz_title = container.selectAll("title");

    if (haz_title.empty()) {
      haz_title = container.append("title");
    }
    haz_title.text("Length = " + bl);
  } else {
    container.selectAll("title").remove();
  }

  if (this.edge_styler) {
    this.edge_styler(container, edge, transition);
  }

  return this.phylotree;

}

export function reclass_edge(edge) {
  let class_var = css_classes["branch"];

  if (item_tagged(edge)) {
    class_var += " " + css_classes["tagged-branch"];
  }

  if (item_selected(edge, this.selection_attribute_name)) {
    class_var += " " + css_classes["selected-branch"];
  }

  return class_var;

}

export function sync_edge_labels() {
  this.links.forEach(d => {
    d[this.selection_attribute_name] =
      d.target[this.selection_attribute_name] || false;
    d.tag = d.target.tag || false;
  });

  if (this.count_handler()) {

    let counts = {};

    counts[
      this.selection_attribute_name
    ] = this.links.reduce((p, c) => {
      return p + (c[this.selection_attribute_name] ? 1 : 0);
    }, 0);

    counts["tagged"] = this.links.reduce(function(p, c) {
      return p + (item_tagged(c) ? 1 : 0);
    }, 0);

    this.count_update(this, counts, this.count_handler());

  }

}

export function edge_visible(edge) {
  return !(edge.target.hidden || edge.target.notshown || false);
}

export function edge_css_selectors(css_classes) {
  return [
    css_classes["branch"],
    css_classes["selected-branch"],
    css_classes["tagged-branch"]
  ].reduce(function(p, c, i, a) {
    return (p += "path." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

export function place_along_an_edge (e, where) {
    return this.edge_placer (e, where);
}
