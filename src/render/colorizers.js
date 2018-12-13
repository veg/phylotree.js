// TODO: Describe what this does
export function default_node_colorizer(element, data) {
  try {
    var count_class = 0;

    selection_set.forEach(function(d, i) {
      if (data[d]) {
        count_class++;
        element.style(
          "fill",
          color_scheme(i),
          i == current_selection_id ? "important" : null
        );
      }
    });

    if (count_class > 1) {
    } else {
      if (count_class === 0) {
        element.style("fill", null);
      }
    }
  } catch (e) {}
}

// TODO: Describe what this does
export function default_edge_colorizer(element, data) {

  try {
    var count_class = 0;

    selection_set.forEach(function(d, i) {
      if (data[d]) {
        count_class++;
        element.style(
          "stroke",
          color_scheme(i),
          i == current_selection_id ? "important" : null
        );
      }
    });

    if (count_class > 1) {
      element.classed("branch-multiple", true);
    } else if (count_class === 0) {
      element.style("stroke", null).classed("branch-multiple", false);
    }
  } catch (e) {}

}
