import * as _ from "underscore";
import { x_coord, y_coord } from "./coordinates";

function radial_mapper(r, a, radial_center) {
  return {
    x: radial_center + r * Math.sin(a),
    y: radial_center + r * Math.cos(a)
  };
}

function cartesian_mapper(x, y, radial_center) {
  return polar_to_cartesian(x - radial_center, y - radial_center);
}

function polar_to_cartesian(x, y) {
  let r = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  let a = Math.atan2(y, x);
  return [r, a];
}

export function cartesian_to_polar(
  node,
  radius,
  radial_root_offset,
  radial_center,
  scales,
  size
) {

  node.radius = radius * (node.radius + radial_root_offset);

  //if (!node.angle) {
  node.angle = 2 * Math.PI * node.x * scales[0] / size[0];
  //}

  let radial = radial_mapper(node.radius, node.angle, radial_center);

  node.x = radial.x;
  node.y = radial.y;

  return node;

}

export function draw_arc(radial_center, points) {


  var start = radial_mapper(points[0].radius, points[0].angle, radial_center),
    end = radial_mapper(points[0].radius, points[1].angle, radial_center);

  return (
    "M " +
    x_coord(start) +
    "," +
    y_coord(start) +
    " A " +
    points[0].radius +
    "," +
    points[0].radius +
    " 0,0, " +
    (points[1].angle > points[0].angle ? 1 : 0) +
    " " +
    x_coord(end) +
    "," +
    y_coord(end) +
    " L " +
    x_coord(points[1]) +
    "," +
    y_coord(points[1])
  );
}

export function arc_segment_placer(edge, where, radial_center) {
  var r = radial_mapper(
    edge.target.radius + (edge.source.radius - edge.target.radius) * where,
    edge.target.angle,
    radial_center
  );
  return { x: x_coord(r), y: y_coord(r) };
}
