import { xCoord, yCoord } from "./coordinates";
import {
  isNodeCollapsed,
  nodeNotshown,
  nodeOrAncestorNotshown
} from "./nodes";

/**
 * Count the number of leaf nodes in a subtree. A hidden (notshown) subtree
 * has no leaves and a collapsed clade counts as one.
 * @param {Object} node - A D3 hierarchy node
 * @returns {Number} The number of leaves
 */
function countLeaves(node) {
  if (nodeNotshown(node)) {
    return 0;
  }
  if (!node.children || node.children.length === 0 || isNodeCollapsed(node)) {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

/**
 * Compute unrooted (equal-angle) layout coordinates for all nodes.
 *
 * The algorithm allocates 2π of angular space at the root, then recursively
 * assigns each child subtree angular space proportional to its leaf count.
 * Each node is placed at parent_position + branch_length * (cos(angle), sin(angle)).
 *
 * After computing raw positions, coordinates are normalized to fit within
 * the given width × height.
 *
 * @param {Object} root - The root node of the D3 hierarchy
 * @param {Array} scales - [scale_x, scale_y] from placenodes
 * @param {Number} width - Available width in pixels
 * @param {Number} height - Available height in pixels
 * @param {Number} labelPad - Pixel padding to reserve for labels on all sides
 */
export function computeUnrootedLayout(root, scales, width, height, labelPad) {
  labelPad = labelPad || 0;

  // Assign raw (x, y) using equal-angle algorithm
  // Root is at the origin
  root._unrooted_x = 0;
  root._unrooted_y = 0;

  root._unrooted_collapsed = null;
  equalAngle(root, 0, 2 * Math.PI);

  // Hidden nodes and clades are not laid out: they must not take up space
  let isSkipped = d => nodeOrAncestorNotshown(d) || d.hidden;

  // Find bounding box of all raw positions (and collapsed clade outlines)
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  let extend = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  root.each(d => {
    if (isSkipped(d)) return;
    extend(d._unrooted_x, d._unrooted_y);
    if (d._unrooted_collapsed) {
      d._unrooted_collapsed.forEach(p => extend(p[0], p[1]));
    }
  });

  if (minX === Infinity) {
    minX = maxX = minY = maxY = 0;
  }

  let rawWidth = maxX - minX || 1;
  let rawHeight = maxY - minY || 1;

  // Reserve pixel-based padding for labels on all sides
  let drawWidth = width - 2 * labelPad;
  let drawHeight = height - 2 * labelPad;
  if (drawWidth < 100) drawWidth = 100;
  if (drawHeight < 100) drawHeight = 100;

  let scaleX = drawWidth / rawWidth;
  let scaleY = drawHeight / rawHeight;
  let scale = Math.min(scaleX, scaleY);

  let offsetX = labelPad + drawWidth / 2 - (minX + maxX) / 2 * scale;
  let offsetY = labelPad + drawHeight / 2 - (minY + maxY) / 2 * scale;

  // Map to screen coordinates
  // Note: the coordinate system uses d.y for screen-x and d.x for screen-y
  // (xCoord returns d.y, yCoord returns d.x)
  root.each(d => {
    if (isSkipped(d)) return;

    d.y = d._unrooted_x * scale + offsetX;
    d.x = d._unrooted_y * scale + offsetY;

    // Collapsed clade outline, as [vertical, horizontal] = [d.x, d.y] points
    // starting at the node (draw.js stores layout-space points otherwise)
    if (d._unrooted_collapsed) {
      d.collapsed = d._unrooted_collapsed.map(p => [
        p[1] * scale + offsetY,
        p[0] * scale + offsetX
      ]);
    } else if (Array.isArray(d.collapsed)) {
      // no outline to draw (the root): drop the layout-space points
      d.collapsed = [];
    }

    // Compute text angle for labels (angle from parent to this node in degrees)
    if (d.parent) {
      let dx = d._unrooted_x - d.parent._unrooted_x;
      let dy = d._unrooted_y - d.parent._unrooted_y;
      let angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

      // Flip text on the left hemisphere so it reads left-to-right
      let isLeftHalf = angleDeg > 90 || angleDeg < -90;
      d.text_angle = isLeftHalf ? angleDeg + 180 : angleDeg;
      d.text_align = isLeftHalf ? "end" : "start";
    } else {
      d.text_angle = 0;
      d.text_align = "start";
    }

    // Store the angle (in radians) for compatibility with radial code paths
    d.angle = d.parent
      ? Math.atan2(d._unrooted_y - d.parent._unrooted_y,
                    d._unrooted_x - d.parent._unrooted_x)
      : 0;
    d.radius = null;
  });
}

/**
 * Largest distance from a node to any of its shown descendants.
 *
 * @param {Object} node - The clade root
 * @param {Number} baseY - Cumulative branch length at the clade root
 * @returns {Number} The distance, never negative
 */
function maxDescendantDistance(node, baseY) {
  let dist = 0;
  (node.children || []).forEach(child => {
    if (nodeNotshown(child)) return;
    let len = child.y - baseY;
    if (isFinite(len)) dist = Math.max(dist, len);
    dist = Math.max(dist, maxDescendantDistance(child, baseY));
  });
  return dist;
}

/**
 * Recursive equal-angle layout.
 *
 * @param {Object} node - Current node
 * @param {Number} startAngle - Start of the angular arc allocated to this node
 * @param {Number} arcSize - Total angular arc allocated to this node
 */
function equalAngle(node, startAngle, arcSize) {
  let totalLeaves = countLeaves(node);

  if (!node.children || node.children.length === 0 || totalLeaves === 0) {
    return;
  }

  let currentAngle = startAngle;

  node.children.forEach(child => {
    let childLeaves = countLeaves(child);
    if (childLeaves === 0) {
      // hidden subtree: no angle, no position
      return;
    }
    let childArc = arcSize * (childLeaves / totalLeaves);
    let midAngle = currentAngle + childArc / 2;

    // Use the node's y value (cumulative branch length / depth) for distance
    let branchLen = child.y - node.y;
    branchLen = isFinite(branchLen) ? Math.max(0, branchLen) : 0;

    child._unrooted_x = node._unrooted_x + branchLen * Math.cos(midAngle);
    child._unrooted_y = node._unrooted_y + branchLen * Math.sin(midAngle);
    child._unrooted_collapsed = null;

    if (isNodeCollapsed(child)) {
      // a collapsed clade is one wedge; its descendants are not placed
      if (child.children && child.children.length) {
        let r = maxDescendantDistance(child, child.y);
        let cx = child._unrooted_x, cy = child._unrooted_y;
        let at = angle => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
        child._unrooted_collapsed = [
          [cx, cy],
          at(currentAngle),
          at(midAngle),
          at(currentAngle + childArc),
          [cx, cy]
        ];
      }
    } else {
      equalAngle(child, currentAngle, childArc);
    }
    currentAngle += childArc;
  });
}

/**
 * Draw a straight line edge between two nodes (for unrooted layout).
 *
 * @param {Array} points - Array of [source, target] node objects
 * @returns {String} SVG path string
 */
export function drawUnrootedEdge(points) {
  return (
    "M " + xCoord(points[0]) + "," + yCoord(points[0]) +
    " L " + xCoord(points[1]) + "," + yCoord(points[1])
  );
}

/**
 * Place a label along an unrooted edge via linear interpolation.
 *
 * @param {Object} edge - Edge object with source and target
 * @param {Number} where - Interpolation factor (0 = target, 1 = source)
 * @returns {Object} {x, y} screen coordinates
 */
export function unrootedSegmentPlacer(edge, where) {
  return {
    x: xCoord(edge.target) + (xCoord(edge.source) - xCoord(edge.target)) * where,
    y: yCoord(edge.target) + (yCoord(edge.source) - yCoord(edge.target)) * where
  };
}
