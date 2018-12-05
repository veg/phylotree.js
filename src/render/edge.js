import * as _ from "underscore";
import * as inspector from "../inspectors";
import {css_classes} from "../accessors";

export function draw_edge(container, edge, transition) {

  container = d3.select(container);

  container = container
    .attr("class", d => { return this.reclass_edge(d) })
    .on("click", d => {
      this.modify_selection([d.target], this.selection_attribute_name);
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

  if (inspector.item_tagged(edge)) {
    class_var += " " + css_classes["tagged-branch"];
  }

  if (inspector.item_selected(edge, this.selection_attribute_name)) {
    class_var += " " + css_classes["selected-branch"];
  }

  console.log(class_var);

  return class_var;

}

