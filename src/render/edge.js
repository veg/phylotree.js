export function draw_edge(container, edge, transition) {
  container = d3.select(container);

  container = container
    .attr("class", phylotree.reclass_edge)
    .on("click", function(d) {
      phylotree.modify_selection([d.target], selection_attribute_name);
    });

  var new_branch_path = draw_branch([edge.source, edge.target]);

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

  var bl = branch_length_accessor(edge.target);

  if (bl !== undefined) {
    var haz_title = container.selectAll("title");
    if (haz_title.empty()) {
      haz_title = container.append("title");
    }
    haz_title.text("Length = " + bl);
  } else {
    container.selectAll("title").remove();
  }

  if (edge_styler) {
    edge_styler(container, edge, transition);
  }

  return phylotree;
}
