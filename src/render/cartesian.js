import * as d3 from "d3";
import { xCoord, yCoord } from "./coordinates";

export var draw_line = d3
  .line()
  .x(function(d) {
    return xCoord(d);
  })
  .y(function(d) {
    return yCoord(d);
  })
  .curve(d3.curveStepBefore);

export function lineSegmentPlacer(edge, where) {
  return {
    x:
      xCoord(edge.target) +
      (xCoord(edge.source) - xCoord(edge.target)) * where,
    y: yCoord(edge.target)
  };
}

export default draw_line;
