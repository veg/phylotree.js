export function update_collapsed_clades (transitions) {

  let enclosure = svg.selectAll("." + css_classes["tree-container"]);

  let collapsed_clades = enclosure
    .selectAll(inspector.clade_css_selectors(css_classes))
    .data(self.nodes.descendants().filter(inspector.is_node_collapsed), function(d) {
      return d.id || (d.id = ++node_id);
    });

  let spline = function() {};
  let spline_f = _.noop();

  // Collapse radial differently
  if (phylotree.radial()) {

    spline = d3.line()
      .curve(d3.curveBasis)
      .y(function(d) {
        return d[0];
      })
      .x(function(d) {
        return d[1];
      });

    spline_f = function(coord, i, d, init_0, init_1) {
      if (i) {
        return [
          d.screen_y + (coord[0] - init_0) / 50,
          d.screen_x + (coord[1] - init_1) / 50
        ];
      } else {
        return [d.screen_y, d.screen_x];
      }
    };

  } else {
    spline = d3.line()
      .curve(d3.curveBasis)
      .y(function(d) {
        return d[0];
      })
      .x(function(d) {
        return d[1];
      });

    spline_f = function(coord, i, d, init_0, init_1) {
      if (i) {
        return [
          d.screen_y + (coord[0] - init_0) / 50,
          d.screen_x + (coord[1] - init_1) / 50
        ];
      } else {
        return [d.screen_y, d.screen_x];
      }
    };
  }

  collapsed_clades
    .exit()
    .each(function(d) {
      d.collapsed_clade = null;
    })
    .remove();

  if (transitions) {

    collapsed_clades
      .enter().insert("path", ":first-child")
      .attr("class", css_classes["clade"])
      .merge(collapsed_clades)
      .attr("d", function(d) {

        if (d.collapsed_clade) {
          return d.collapsed_clade;
        }

        let init_0 = d.collapsed[0][0];
        let init_1 = d.collapsed[0][1];

        // #1 return spline(d.collapsed.map(spline_f, d, init_0, init_1));
        return spline(
          d.collapsed.map(function(coord, i) {
            return spline_f(coord, i, d, init_0, init_1);
          })
        );

      })
      .attr("d", function(d) {
        return (d.collapsed_clade = spline(d.collapsed));
      });

  } else {

    collapsed_clades
      .enter().insert("path", ":first-child")
      .attr("class", css_classes["clade"])
      .merge(collapsed_clades)
      .attr("d", function(d) {
        return (d.collapsed_clade = spline(d.collapsed));
      });

  }

}

