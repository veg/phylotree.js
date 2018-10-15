import { x_coord, y_coord } from "./coordinates";

export var draw_line = d3
  .line()
  .x(function(d) {
    return x_coord(d);
  })
  .y(function(d) {
    return y_coord(d);
  })
  .curve(d3.curveStepBefore);

export function line_segment_placer(edge, where) {
  return {
    x:
      x_coord(edge.target) +
      (x_coord(edge.source) - x_coord(edge.target)) * where,
    y: y_coord(edge.target)
  };
}
