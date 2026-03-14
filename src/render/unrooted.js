import { xCoord, yCoord } from "./coordinates";

/**
 * Count the number of leaf nodes in a subtree.
 * @param {Object} node - A D3 hierarchy node
 * @returns {Number} The number of leaves
 */
function countLeaves(node) {
  if (!node.children || node.children.length === 0) {
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

  equalAngle(root, 0, 2 * Math.PI);

  // Find bounding box of all raw positions
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  root.each(d => {
    if (d._unrooted_x < minX) minX = d._unrooted_x;
    if (d._unrooted_x > maxX) maxX = d._unrooted_x;
    if (d._unrooted_y < minY) minY = d._unrooted_y;
    if (d._unrooted_y > maxY) maxY = d._unrooted_y;
  });

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
    d.y = d._unrooted_x * scale + offsetX;
    d.x = d._unrooted_y * scale + offsetY;

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
 * Recursive equal-angle layout.
 *
 * @param {Object} node - Current node
 * @param {Number} startAngle - Start of the angular arc allocated to this node
 * @param {Number} arcSize - Total angular arc allocated to this node
 */
function equalAngle(node, startAngle, arcSize) {
  let totalLeaves = countLeaves(node);

  if (!node.children || node.children.length === 0) {
    return;
  }

  let currentAngle = startAngle;

  node.children.forEach(child => {
    let childLeaves = countLeaves(child);
    let childArc = arcSize * (childLeaves / totalLeaves);
    let midAngle = currentAngle + childArc / 2;

    // Use the node's y value (cumulative branch length / depth) for distance
    let branchLen = child.y !== undefined ? child.y - (node.y || 0) : 1;
    if (branchLen <= 0) branchLen = 1;

    child._unrooted_x = node._unrooted_x + branchLen * Math.cos(midAngle);
    child._unrooted_y = node._unrooted_y + branchLen * Math.sin(midAngle);

    equalAngle(child, currentAngle, childArc);
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
