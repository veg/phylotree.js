import * as _ from "underscore";

export function draw_edge(container, edge, transition) {

  container = d3.select(container);

  container = container
    .attr("class", this.phylotree.reclass_edge)
    .on("click", function(d) {

      this.modify_selection([d.target], selection_attribute_name);

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
