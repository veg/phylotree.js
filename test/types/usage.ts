// Compile-only check of types/phylotree.d.ts against the runtime API.
// Run with `yarn typecheck` (tsc -p test/types); nothing here is executed.

import {
  phylotree,
  TreeRender,
  PhylotreeNode,
  PhylotreeLink,
  RenderOptions,
  newickParser,
  getNewick,
  pairwiseDistances,
  sackin,
  centerOfTree,
  computeMidpoint,
  rootToTip,
  fitRootToTip,
  extractDates,
  clusterPicker,
  phylopart,
  parseFasta,
  neighborJoining,
  getDistanceMatrix,
  parseAnnotations,
  inOrder,
  preOrder,
  postOrder,
  leftChildRightSibling,
} from "phylotree";

// ---------------------------------------------------------------- phylotree

const tree = new phylotree("((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);");
const fromJson = new phylotree({ name: "root", children: [{ name: "A" }] });
new phylotree("(A,B);", { type: "nwk", left_delimiter: "[", right_delimiter: "]" });

const root: PhylotreeNode = tree.getRootNode();
const sameRoot: PhylotreeNode = tree.getNodes();
const tips: PhylotreeNode[] = tree.getTips();
const internals: PhylotreeNode[] = tree.getInternals();
const maybeA: PhylotreeNode | undefined = tree.getNodeByName("A");
const name: string = root.data.name;
const isLeaf: boolean = tree.isLeafNode(tips[0]);
const newick: string = tree.getNewick();
const annotated: string = tree.getNewick((n) => (n.data.name === "A" ? "{FG}" : ""), root);
const tagged: string = tree.getTaggedNewick({ tag: "Foreground", multiSet: false });
const lengths: Array<number | undefined> = tree.getBranchLengths();
const hasLengths: boolean = tree.hasBranchLengths();
const tipLengths: Array<{ name: string; length: number }> = tree.getTipLengths();
const ancestor: PhylotreeNode | undefined = tree.mrca(["A", tips[1]]);
const json: string = tree.json("pre-order");
const pathUp: PhylotreeNode[] = tree.pathToRoot(tips[0]);
const descendants: PhylotreeNode[] = tree.selectAllDescendants(root, true, false);
const links: PhylotreeLink[] = tree.links;

tree
  .traverse_and_compute((n) => void n.data.name, "post-order")
  .setBranchLength((n) => 1)
  .scaleBranchLengths((length) => length * 2)
  .normalizeBranchLengths()
  .updateKeyName("selected", null)
  .resortChildren((a, b) => (a.value ?? 0) - (b.value ?? 0));

if (maybeA) {
  tree.reroot(maybeA, 0.5);
  tree.deleteANode(maybeA);
}
tree.addChild(root, tree.createNode("E"));
tree.assignAttributes({ A: { host: "human" } });

// ------------------------------------------------------------- TreeRender

const options: RenderOptions = {
  container: "#tree",
  width: 800,
  height: 600,
  layout: "right-to-left",
  "left-right-spacing": "fit-to-size",
  "top-bottom-spacing": "fixed-step",
  "show-scale": "top",
  "binary-selectable": false,
  "restricted-selectable": ["all-leaf-nodes"],
  "selection-mode": "multi-set",
  "selection-sets": [
    { name: "TEST", color: "#e41a1c" },
    { name: "REFERENCE", color: "#377eb8" },
  ],
  "initial-selection": ["A"],
  "initial-sets": { TEST: ["B"] },
  "css-classes": { "selected-branch": "my-selected-branch" },
  "node-span": (n) => 1,
  "internal-names": (n) => !!n.children,
  "node-styler": (element, node) => {
    element.style("fill", node.selected ? "red" : "black");
  },
  "edge-styler": (element, link, transition) => {
    element.style("stroke", link.target.data.name === "A" ? "red" : "black");
  },
};

const display: TreeRender = tree.render(options);
const svg: SVGSVGElement = display.show();
const sameDisplay: TreeRender | undefined = tree.display;

display
  .style_nodes((element, node) => {
    element.attr("data-name", node.data.name);
  })
  .style_edges((element, link) => {
    element.style("stroke-width", link.target.selected ? "3px" : "1px");
  })
  .radial(true)
  .unrooted(false)
  .alignTips(true)
  .internalNames(true)
  .selectionLabel("selected")
  .nodeLabel((n) => n.data.name.toUpperCase())
  .spacing_x(20)
  .spacing_y(40, true)
  .node_circle_size(5)
  .set_size([600, 800])
  .css({ "selected-branch": "branch-selected" })
  .countHandler((counts) => void counts)
  .layoutHandler((t) => void t)
  .selectionCallback((selection) => void selection.length)
  .on("nodeClick", (node, event) => void node)
  .off("nodeClick", () => undefined)
  .selectNodes(["A", "B"])
  .deselectNodes(["B"])
  .clearSelection()
  .setActiveSet("TEST")
  .addToSet("A", "TEST")
  .removeFromSet(tips[0], "TEST")
  .layout(false)
  .refresh()
  .update();

// modifySelection accepts a predicate over links, an array of nodes, or a
// predefined selector name, plus the optional attr/place/skip_refresh/mode.
display.modifySelection((link) => link.target.data.name === "A");
display.modifySelection([tips[0], tips[1]], "selected", false, false, "true");
display.modifySelection("all-leaf-nodes");

const nodeStyler = display.style_nodes();
const edgeStyler = display.style_edges();
const fontSize: number = display.font_size;
const scaleBarFontSize: number = display.scale_bar_font_size;
const spacingX: number = display.spacing_x();
const isRadial: boolean = display.radial();
const size: [number, number] = display.set_size();
const circle: number = display.node_circle_size()(root);
const transitions: boolean = display.transitions();
const selection: PhylotreeNode[] = display.getSelection();
const active: string | null | undefined = display.getActiveSet();
const members: PhylotreeNode[] = display.getSetMembers("TEST");
const inSet: boolean = display.isInSet(root, "TEST");
const nodeSet: string | null = display.getNodeSet(root);
const classes: Record<string, string> = display.css_classes;
display.font_size = 16;
display.separation = (node, previous) => 0;
display.internalLabel((children) => children.every((c) => !!c.selected));
display.toggleCollapse(root);
display.collapse_node(root);
display.addCustomMenu(
  root,
  (n) => "Log " + n.data.name,
  (n) => console.log(n.data.name),
  (n) => !n.children
);

// Names that never existed at runtime must stay undeclared.
// @ts-expect-error -- the runtime method is style_nodes
display.nodeStyler;
// @ts-expect-error -- the runtime method is style_edges
display.edgeStyler;
// @ts-expect-error -- no such method
display.getSelectedBranches;
// @ts-expect-error -- font_size is a number, not a getter/setter
display.font_size(12);
// @ts-expect-error -- TreeRender is type-only; it is not exported at runtime
display instanceof TreeRender;

// ----------------------------------------------------------- module functions

const parsed = newickParser("(A,B);", { left_delimiter: "{" });
const parsedJson: object | null = parsed.json;
const parseError: string | null = parsed.error;
const boundNewick: string = getNewick.call(tree);
const leafCount: number = pairwiseDistances(tree);
const sackinIndex: number = sackin(tree);
const cot = centerOfTree(tree, 2);
const cotDistance: number = cot.distance;
const midpoint = computeMidpoint(tree);
const midpointBreak: number = midpoint.breakpoint;
const r2t: phylotree = rootToTip(tree);
const fit = fitRootToTip(tree);
const r2: number = fit.fit.r2;
const dated: phylotree = extractDates(tree, (n) => n.data.name.slice(-8));
const clusters = clusterPicker(tree, 0.7, 0.05);
const clusterMembers: PhylotreeNode[] = clusters[0].members;
const parts = phylopart(tree, 0.7, 0.1);
const partMedian: number = parts[0].median;
const seqs: Record<string, string> = parseFasta(">A\nACGT\n>B\nACGA\n");
const distances: Record<string, number[]> = getDistanceMatrix(seqs);
const njTree: phylotree | null = neighborJoining([[0, 5], [5, 0]], 2, ["A", "B"]);
const annotations = parseAnnotations("#NEXUS");
preOrder(root, (n) => void n, (n) => false);
postOrder(root, (n) => void n);
inOrder(root, (n) => void n);
const edges: Array<{ source: PhylotreeNode | null | undefined; target: PhylotreeNode; name: string }> =
  leftChildRightSibling(root);

export {
  fromJson, sameRoot, internals, name, isLeaf, newick, annotated, tagged, lengths,
  hasLengths, tipLengths, ancestor, json, pathUp, descendants, links, svg, sameDisplay,
  nodeStyler, edgeStyler, fontSize, scaleBarFontSize, spacingX, isRadial, size, circle,
  transitions, selection, active, members, inSet, nodeSet, classes, parsedJson,
  parseError, boundNewick, leafCount, sackinIndex, cotDistance, midpointBreak, r2t, r2,
  dated, clusterMembers, partMedian, distances, njTree, annotations, edges,
};
