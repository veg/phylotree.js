import * as d3 from "d3";
import * as _ from "underscore";
import { is_node_collapsed } from "./nodes";

export function clade_css_selectors(css_classes) {
  return [css_classes["clade"]].reduce(function(p, c, i, a) {
    return (p += "path." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

export function update_collapsed_clades(transitions) {

  let enclosure = this.svg.selectAll("." + this.css_classes["tree-container"]);
  var node_id = 0;

  let collapsed_clades = enclosure
    .selectAll(clade_css_selectors(this.css_classes))
    .data(
      this.phylotree.nodes.descendants().filter(is_node_collapsed),
      function(d) {
        return d.id || (d.id = ++node_id);
      }
    );

  let spline = function() {};
  let spline_f = _.noop();

  // Collapse radial differently
  if (this.radial()) {
    spline = d3
      .line()
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
    spline = d3
      .line()
      .y(function(d) {
        return d[0];
      })
      .x(function(d) {
        return d[1];
      }).curve(d3.curveBasis);

    spline_f = function(coord, i, d, init_0, init_1) {
      if (i) {
         return [
          d.screen_y + (coord[0] - init_0) / 50 ,
          d.screen_x + (coord[1] - init_1) / 50,
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
      .enter()
      .insert("path", ":first-child")
      .attr("class", this.css_classes["clade"])
      .merge(collapsed_clades)
      .attr("d", function(d) {
        if (d.collapsed_clade) {
          return d.collapsed_clade;
        }

        //console.log (d.collapsed);
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
      .enter()
      .insert("path", ":first-child")
      .attr("class", this.css_classes["clade"])
      .merge(collapsed_clades)
      .attr("d", function(d) {
        return (d.collapsed_clade ? d.collapsed_clade : d.collapsed_clade = spline(d.collapsed));
      });
  }
}
