// Type definitions for phylotree
// Project: https://github.com/veg/phylotree.js
//
// Every declaration here mirrors code in src/. Run `yarn typecheck` after
// changing this file; it compiles test/types/usage.ts against it.

import type * as d3 from 'd3';

/**
 * Node data stored in the phylogenetic tree (the `data` field of each node)
 */
export interface PhylotreeNodeData {
  name: string;
  /** Branch length as parsed from the input, as a string */
  attribute?: string;
  /** Annotation parsed from `{...}` (or `[...]`) after the node name */
  annotation?: string;
  /** Internal node label, kept when bootstrap values are parsed */
  bootstrap_values?: string;
  [key: string]: any;
}

/**
 * A node in the phylogenetic tree (D3 hierarchy node with phylotree state)
 */
export interface PhylotreeNode extends d3.HierarchyNode<PhylotreeNodeData> {
  /** Default selection attribute; see `TreeRender.selectionLabel` */
  selected?: boolean;
  tag?: boolean;
  collapsed?: boolean;
  hidden?: boolean;
  notshown?: boolean;
  /** Name of the selection set this node belongs to (multi-set mode) */
  _selectionSet?: string;
  screen_x?: number;
  screen_y?: number;
  text_angle?: number;
  text_align?: string;
  angle?: number;
  radius?: number;
}

/**
 * A link/branch in the phylogenetic tree
 */
export interface PhylotreeLink extends d3.HierarchyLink<PhylotreeNodeData> {
  source: PhylotreeNode;
  target: PhylotreeNode;
  /** Default selection attribute, mirrored from `target` */
  selected?: boolean;
  tag?: boolean;
}

/**
 * Node styler: called with a selection of the node's `<g>` element.
 */
export type NodeStyler = (
  element: d3.Selection<SVGGElement, PhylotreeNode, null, undefined>,
  node: PhylotreeNode
) => void;

/**
 * Edge styler: called with a selection of the branch's `<path>` element.
 * `transition` is passed while the tree is being drawn, not on refresh.
 */
export type EdgeStyler = (
  element: d3.Selection<SVGPathElement, PhylotreeLink, null, undefined>,
  link: PhylotreeLink,
  transition?: boolean
) => void;

/** Names accepted by `modifySelection` when `restricted-selectable` is on */
export type PredefinedSelector = 'all' | 'none' | 'all-leaf-nodes' | 'all-internal-nodes';

/** Keys of the CSS class map (see `css-classes` and `TreeRender.css`) */
export type CssClassKey =
  | 'tree-container'
  | 'tree-scale-bar'
  | 'node'
  | 'internal-node'
  | 'tagged-node'
  | 'selected-node'
  | 'collapsed-node'
  | 'root-node'
  | 'branch'
  | 'selected-branch'
  | 'tagged-branch'
  | 'tree-selection-brush'
  | 'branch-tracer'
  | 'clade'
  | 'node_text';

/** A named, coloured selection set for `selection-mode: "multi-set"` */
export interface SelectionSetDefinition {
  name: string;
  color: string;
}

/**
 * Options for rendering a phylogenetic tree (defaults in src/render/draw.js)
 */
export interface RenderOptions {
  /** CSS selector or DOM element for the container */
  container?: string | HTMLElement;
  /** Width of the SVG in pixels (default 800) */
  width?: number;
  /** Height of the SVG in pixels (default 600) */
  height?: number;
  /** Tree layout direction */
  layout?: 'left-to-right' | 'right-to-left';
  /** Logger instance */
  logger?: Console;
  branches?: string;
  /** Scale branches by length */
  scaling?: boolean;
  bootstrap?: boolean;
  'color-fill'?: boolean;
  /** Font size for labels */
  'font-size'?: number;
  /** Show internal node names */
  'internal-names'?: boolean | ((node: PhylotreeNode) => boolean);
  /** Enable node selection */
  selectable?: boolean;
  /** Only allow selection through the predefined selector names */
  'restricted-selectable'?: false | PredefinedSelector[];
  /** Enable collapsing of clades */
  collapsible?: boolean;
  /** Horizontal spacing mode */
  'left-right-spacing'?: 'fixed-step' | 'fit-to-size';
  /** Vertical spacing mode */
  'top-bottom-spacing'?: 'fixed-step' | 'fit-to-size';
  /** Left offset in pixels */
  'left-offset'?: number;
  /** Show scale bar (only top placement is implemented) */
  'show-scale'?: boolean | 'top';
  /** Draw size bubbles on nodes */
  'draw-size-bubbles'?: boolean;
  /** Bubble size for a node, used when `draw-size-bubbles` is on */
  'bubble-styler'?: (node: PhylotreeNode) => number;
  'binary-selectable'?: boolean;
  /** Attributes cleared by binary selection */
  'attribute-list'?: string[];
  /** Use radial/circular layout */
  'is-radial'?: boolean;
  /** Use unrooted (equal-angle) layout */
  'is-unrooted'?: boolean;
  'max-radius'?: number;
  'annular-limit'?: number;
  /** Compression applied to collapsed clades */
  compression?: number;
  /** Align tip labels */
  'align-tips'?: boolean;
  'maximum-per-node-spacing'?: number;
  'minimum-per-node-spacing'?: number;
  'maximum-per-level-spacing'?: number;
  'minimum-per-level-spacing'?: number;
  /** Node circle radius accessor */
  node_circle_size?: (node: PhylotreeNode) => number;
  /** Force transitions on or off; null picks based on tree size */
  transitions?: boolean | null;
  /** Enable brushing for selection */
  brush?: boolean;
  /** Offer "reroot" in the node menu */
  reroot?: boolean;
  /** Offer "hide" in the node menu */
  hide?: boolean;
  'label-nodes-with-name'?: boolean;
  /** Enable zoom/pan behavior */
  zoom?: boolean;
  /** Show the node context menu */
  'show-menu'?: boolean;
  /** Show node labels */
  'show-labels'?: boolean;
  /** Node styler; same as `TreeRender.style_nodes` */
  'node-styler'?: NodeStyler | null;
  /** Edge styler; same as `TreeRender.style_edges` */
  'edge-styler'?: EdgeStyler | null;
  /** Vertical span of each node */
  'node-span'?: ((node: PhylotreeNode) => number) | null;
  /** Scale the SVG with its container using a viewBox */
  responsive?: boolean;
  /** `preserveAspectRatio` used when `responsive` is on */
  'preserve-aspect-ratio'?: string;
  /** Single selection or several named selection sets */
  'selection-mode'?: 'single' | 'multi-set';
  /** Selection sets for multi-set mode */
  'selection-sets'?: SelectionSetDefinition[];
  /** Names of nodes to select after the first render */
  'initial-selection'?: string[];
  /** Set name to node names, applied after the first render (multi-set mode) */
  'initial-sets'?: { [setName: string]: string[] };
  /** Override CSS class names */
  'css-classes'?: Partial<Record<CssClassKey, string>>;
}

/**
 * Options for parsing tree input
 */
export interface ParseOptions {
  /** A registered format name, or a custom parser function */
  type?:
    | 'nexml'
    | 'phyloxml'
    | 'nexus'
    | 'nwk'
    | 'nhx'
    | 'beast'
    | ((input: any, options: ParseOptions) => { json: object | null; error: string | null });
  /** Newick annotation delimiters (default `{` and `}`) */
  left_delimiter?: string;
  right_delimiter?: string;
  /** Logger instance */
  logger?: Console;
}

/** Branch length accessor; called with a second argument to set a length */
export type BranchLengthAccessor = (node: PhylotreeNode, new_length?: number) => number | undefined;

/** Result of the linear fit used by `fitRootToTip` */
export interface LinearFit {
  intercept: number;
  slope: number;
  r2: number;
  'var (intercept)': number;
  'var (slope)': number;
}

/**
 * The TreeRender class handles visualization of the tree.
 *
 * Type-only: the class is not exported at runtime, so create instances with
 * `phylotree.render()` rather than `new TreeRender()` or `instanceof`.
 */
declare class TreeRender {
  /** The phylotree instance this renderer belongs to */
  phylotree: phylotree;
  /** The SVG element */
  svg: d3.Selection<SVGSVGElement, undefined, null, undefined>;
  /** Rendering options, merged with the defaults */
  options: RenderOptions;
  /** Current zoom transform */
  currentZoomTransform: d3.ZoomTransform | null;
  /** Label width in pixels */
  label_width: number;
  /** Rightmost leaf x position */
  right_most_leaf: number;
  /** The container element */
  container: string | HTMLElement | undefined;
  /** Width of the SVG in pixels */
  width: number;
  /** Height of the SVG in pixels */
  height: number;
  /** Links being drawn */
  links: PhylotreeLink[];
  /** Label font size */
  font_size: number;
  /** Scale bar font size */
  scale_bar_font_size: number;
  /** CSS class names in use */
  css_classes: Record<CssClassKey, string>;
  /** Selection attribute name; see `selectionLabel` */
  selection_attribute_name: string;
  /** Current node styler */
  node_styler: NodeStyler | null | undefined;
  /** Current edge styler */
  edge_styler: EdgeStyler | null | undefined;
  /** Vertical span of each node */
  nodeSpan: (node: PhylotreeNode) => number;
  /** Extra spacing between a node and the previous one */
  separation: (node: PhylotreeNode, previous: PhylotreeNode) => number;

  constructor(phylotree: phylotree, options?: RenderOptions);

  /** Get the SVG element */
  show(): SVGSVGElement;

  /** Update the tree display */
  update(transitions?: boolean): this;

  /** Re-run the layout and redraw */
  update_layout(new_json: object, do_hierarchy?: boolean): void;

  /** Get/set radial mode */
  radial(): boolean;
  radial(value: boolean): this;

  /** Get/set unrooted (equal-angle) layout mode */
  unrooted(): boolean;
  unrooted(value: boolean): this;

  /** Get/set align tips mode */
  alignTips(): boolean;
  alignTips(value: boolean): this;

  /** Get/set whether internal node names are shown */
  internalNames(): boolean | ((node: PhylotreeNode) => boolean);
  internalNames(value: boolean | ((node: PhylotreeNode) => boolean)): this;

  /** Get/set the selection attribute name */
  selectionLabel(): string;
  selectionLabel(label: string): this;

  /** Get/set node label accessor (a falsy value restores the default) */
  nodeLabel(): (node: PhylotreeNode) => string;
  nodeLabel(accessor: ((node: PhylotreeNode) => string) | null | undefined): this;

  /** Get/set node styler function */
  style_nodes(): NodeStyler | null | undefined;
  style_nodes(styler: NodeStyler | null): this;

  /** Get/set edge styler function */
  style_edges(): EdgeStyler | null | undefined;
  style_edges(styler: EdgeStyler): this;

  /** Mark a node as collapsed (call `update()` to redraw) */
  collapse_node(node: PhylotreeNode): void;

  /** Collapse or expand a node and lay out the tree again */
  toggleCollapse(node: PhylotreeNode): this;

  /**
   * Modify the selection.
   * @param node_selecter A predicate over links; an array of nodes to change;
   * or, when `restricted-selectable` is set, a predefined selector name
   * (any other value is then ignored and nothing is returned)
   * @param attr Selection attribute to modify (default: `selectionLabel()`)
   * @param place Whether to call `placenodes` afterwards
   * @param skip_refresh Whether to skip the refresh
   * @param mode For an array of nodes: toggle them, or set to true / false
   */
  modifySelection(
    node_selecter: ((link: PhylotreeLink) => boolean) | PhylotreeNode[] | PredefinedSelector,
    attr?: string,
    place?: boolean,
    skip_refresh?: boolean,
    mode?: 'toggle' | 'true' | 'false'
  ): this;

  /** Get selected nodes */
  getSelection(): PhylotreeNode[];

  /** Select nodes by name */
  selectNodes(names: string[]): this;

  /** Deselect nodes by name */
  deselectNodes(names: string[]): this;

  /** Clear the selection */
  clearSelection(): this;

  /**
   * Register an event listener. Emitted events: nodeClick, nodeHover,
   * branchClick, rendered, selectionChange, collapsed, rerooted, setChange.
   */
  on(event: string, callback: (...args: any[]) => void): this;

  /** Remove an event listener */
  off(event: string, callback: (...args: any[]) => void): this;

  /** Emit an event */
  emit(event: string, ...args: any[]): this;

  /** Get/set the selection callback */
  selectionCallback(): ((selection: PhylotreeNode[]) => void) | null;
  selectionCallback(callback: (selection: PhylotreeNode[]) => void): this;

  /** Make a set's members the target of node/branch clicks (multi-set mode) */
  setActiveSet(name: string): this;

  /** Name of the active selection set */
  getActiveSet(): string | null | undefined;

  /** Nodes in a selection set */
  getSetMembers(setName: string): PhylotreeNode[];

  /** Add a node (or node name) to a selection set, removing it from the others */
  addToSet(node: PhylotreeNode | string, setName: string): this;

  /** Remove a node (or node name) from a selection set */
  removeFromSet(node: PhylotreeNode | string, setName: string): this;

  /** Whether a node is in a selection set */
  isInSet(node: PhylotreeNode, setName: string): boolean;

  /** Name of the selection set a node belongs to */
  getNodeSet(node: PhylotreeNode): string | null;

  /** Set up selection sets (called by the constructor in multi-set mode) */
  initializeSelectionSets(sets: SelectionSetDefinition[]): void;

  /**
   * Get or set spacing in the x-direction (horizontal spacing between nodes)
   * @param attr The new spacing value if setting
   * @param skip_render Whether to skip re-rendering after setting
   */
  spacing_x(): number;
  spacing_x(attr: number, skip_render?: boolean): this;

  /**
   * Get or set spacing in the y-direction (vertical spacing between levels)
   * @param attr The new spacing value if setting
   * @param skip_render Whether to skip re-rendering after setting
   */
  spacing_y(): number;
  spacing_y(attr: number, skip_render?: boolean): this;

  /** Get the node circle radius accessor, or set a constant radius */
  node_circle_size(): (node: PhylotreeNode) => number;
  node_circle_size(attr: number): this;

  /** Get or set this tree's CSS class names (kept across reroot) */
  css(): Record<CssClassKey, string>;
  css(opt: Partial<Record<CssClassKey, string>>): this;

  /** Whether transitions are used: `arg` if given, else the option, else size-based */
  transitions(arg?: boolean): boolean;

  /** Lay out the tree */
  layout(transitions?: boolean): this;

  /** Re-apply classes and the edge styler to the drawn edges */
  refresh(): this;

  /** Compute node positions */
  placenodes(): this;

  /**
   * Set internal node selection from their children
   * @param callback Called with an internal node's children; returns its selection state
   * @param respect_existing Whether to keep existing internal selections
   */
  internalLabel(callback: (children: PhylotreeNode[]) => boolean, respect_existing?: boolean): void;

  /** Get or set the selection count handler */
  countHandler(): (counts: { [attr: string]: number }) => void;
  countHandler(callback: (counts: { [attr: string]: number }) => void): this;

  /** Get or set the layout handler */
  layoutHandler(): (tree: TreeRender) => void;
  layoutHandler(callback: (tree: TreeRender) => void): this;

  /**
   * Add an item to a node's context menu
   * @param node The node
   * @param name Returns the menu item label
   * @param callback Called when the item is clicked
   * @param condition Optional; the item is shown only if it returns true
   */
  addCustomMenu(
    node: PhylotreeNode,
    name: (node: PhylotreeNode) => string,
    callback: (node: PhylotreeNode, ...args: any[]) => void,
    condition?: (node: PhylotreeNode) => boolean
  ): void;

  /**
   * Get or set the size of the tree as `[height, width]`. Setting only
   * changes dimensions whose spacing mode is not "fixed-step".
   */
  set_size(): [number, number];
  set_size(attr: [number, number]): this;
}

export type { TreeRender };

/**
 * Main phylotree class for creating and manipulating phylogenetic trees
 */
export class phylotree {
  /** Root of the hierarchy (D3 hierarchy) */
  nodes: PhylotreeNode;
  /** Links between nodes */
  links: PhylotreeLink[];
  /** Parsed annotation tags */
  parsed_tags: string[];
  /** The tree renderer (set after calling render()) */
  display?: TreeRender;
  /** Original Newick string */
  newick_string: string;
  /** Selection attribute name */
  selection_attribute_name: string;
  /** Branch length accessor in use */
  branch_length: BranchLengthAccessor;
  /** Logger instance */
  logger: Console;

  /**
   * Create a new phylogenetic tree
   * @param nwk Newick string, PhyloXML string, or hierarchical JSON
   * @param options Parsing options
   */
  constructor(nwk: string | object, options?: ParseOptions);

  /**
   * Render the tree to an SVG
   * @param options Rendering options
   * @returns TreeRender instance
   */
  render(options?: RenderOptions): TreeRender;

  /**
   * Traverse the tree and compute values at each node
   * @param callback Function called on each node
   * @param traversal_type "pre-order", "post-order" (default), or "in-order"
   * @param root_node Optional starting node
   * @param backtrack Optional; returning true skips a node and its subtree
   */
  traverse_and_compute(
    callback: (node: PhylotreeNode) => void,
    traversal_type?: 'pre-order' | 'post-order' | 'in-order',
    root_node?: PhylotreeNode | null,
    backtrack?: (node: PhylotreeNode) => boolean
  ): this;

  /** Export the nodes to a JSON string, in the given traversal order */
  json(traversal_type?: 'pre-order' | 'post-order' | 'in-order'): string;

  /** Get parsed annotation tags */
  get_parsed_tags(): string[];

  /** Replace the hierarchy */
  update(json: PhylotreeNode): void;

  /** Check if every non-root node has a branch length */
  hasBranchLengths(): boolean;

  /** Get all branch lengths */
  getBranchLengths(): Array<number | undefined>;

  /** Get or set the branch length accessor (a falsy value restores the default) */
  setBranchLength(): BranchLengthAccessor;
  setBranchLength(accessor: BranchLengthAccessor | null | undefined): this;

  /** Rescale branch lengths to [0, 1] */
  normalizeBranchLengths(): this;

  /** Transform every branch length with a function */
  scaleBranchLengths(scale_by: (length: number) => number): this;

  /** Get or set the branch name accessor */
  branchName(): ((node: PhylotreeNode) => string) | undefined;
  branchName(accessor: (node: PhylotreeNode) => string): this;

  /**
   * Get Newick representation of the tree
   * @param annotator Returns a label to write after each node name
   * @param root Start at this node (default: the root)
   */
  getNewick(annotator?: ((node: PhylotreeNode) => string) | null, root?: PhylotreeNode): string;

  /** Get Newick with `{tag}` annotations on selected nodes (or set names) */
  getTaggedNewick(options?: { tag?: string; multiSet?: boolean }): string;

  /** Find most recent common ancestor of nodes (given as nodes or names) */
  mrca(nodes: Array<PhylotreeNode | string>): PhylotreeNode | undefined;

  /** Check if a node is a leaf */
  isLeafNode(node: PhylotreeNode): boolean;

  /** Get all tip/leaf nodes */
  getTips(): PhylotreeNode[];

  /** Get all internal nodes */
  getInternals(): PhylotreeNode[];

  /** Get root node */
  getRootNode(): PhylotreeNode;

  /** Get the root of the hierarchy (same as getRootNode) */
  getNodes(): PhylotreeNode;

  /** Get node by name */
  getNodeByName(name: string): PhylotreeNode | undefined;

  /** Get the descendants of a node */
  selectAllDescendants(node: PhylotreeNode, terminal?: boolean, internal?: boolean): PhylotreeNode[];

  /** Reroot the tree on the branch above a node */
  reroot(node: PhylotreeNode, fraction?: number): this;

  /** Get the path from a node to the root, starting with the node */
  pathToRoot(node: PhylotreeNode): PhylotreeNode[];

  /** Re-sort children of nodes */
  resortChildren(comparator: (a: PhylotreeNode, b: PhylotreeNode) => number): this;

  /**
   * Graft a new leaf next to a node
   * @param graftAt The node to graft next to
   * @param newChild Name of the new leaf
   * @param newParent Name of the new internal node
   * @param lengths Branch lengths for `[graftAt, newChild, newParent]`
   */
  graftANode(graftAt: PhylotreeNode, newChild: string, newParent: string, lengths?: string[]): this;

  /** Create a node stub for `addChild` */
  createNode(name: string, lengths?: unknown[]): { data: { name: string; attribute: unknown }; parent: string };

  /** Add a child to a node; returns the parent */
  addChild<T extends object>(parent: T, child: object): T;

  /** Delete a node, given the node or its index in `nodes.descendants()` */
  deleteANode(index: number | PhylotreeNode): this;

  /** Store attributes in the `annotations` field of the nodes named by the keys */
  assignAttributes(attributes: { [name: string]: unknown }): void;

  /** Get tips and their branch lengths, longest first */
  getTipLengths(): Array<{ name: string; length: number }>;

  /** Maximum parsimony reconstruction of a selection attribute; needs a rendered tree */
  maxParsimony(respect_existing: boolean, attr_name: string): void;

  /** Clear selection of internal nodes (unless `respect` is true) */
  clearInternalNodes(respect?: boolean): void;

  /** Rename (or, with a null new_key, delete) a key on every node */
  updateKeyName(old_key: string, new_key: string | null): this;
}

// Utility functions

/**
 * Parse a Newick format string
 */
export function newickParser(
  newick: string,
  options?: { left_delimiter?: string; right_delimiter?: string }
): { json: object | null; error: string | null };

/**
 * Get Newick string from a tree; must be called with a phylotree as `this`
 * (prefer `tree.getNewick()`)
 */
export function getNewick(
  this: phylotree,
  annotator?: ((node: PhylotreeNode) => string) | null,
  root?: PhylotreeNode
): string;

/**
 * Annotate nodes with path lengths for pairwise distance computations
 * @returns The number of leaves
 */
export function pairwise_distances(tree: phylotree): number;

/**
 * Annotate nodes with path lengths for pairwise distance computations (camelCase alias)
 * @returns The number of leaves
 */
export function pairwiseDistances(tree: phylotree): number;

/**
 * Compute Sackin's index (tree balance measure)
 */
export function sackin(tree: phylotree): number;

/**
 * Find the center of the tree (minimises the sum of distances^power to the leaves)
 */
export function centerOfTree(tree: phylotree, power?: number): {
  location: PhylotreeNode;
  breakpoint: number;
  distance: number;
};

/**
 * Compute the midpoint for rooting
 */
export function computeMidpoint(tree: phylotree): { location: PhylotreeNode; breakpoint: number };

/**
 * Store root-to-tip distances on the nodes; returns the tree
 */
export function rootToTip(tree: phylotree): phylotree;

/**
 * Find the root that maximises the root-to-tip regression r2 (needs dates;
 * see extractDates). `root` is 0 if the current root is best.
 */
export function fitRootToTip(tree: phylotree): { root: PhylotreeNode | 0; fit: LinearFit };

/**
 * Extract dates from nodes and store `date_value` / `decimal_date_value` in their data
 */
export function extract_dates(
  tree: phylotree,
  date_getter?: (node: PhylotreeNode) => string | null,
  date_converter?: (date: string) => Date | null
): phylotree;

/**
 * Extract dates from nodes (camelCase alias)
 */
export function extractDates(
  tree: phylotree,
  date_getter?: (node: PhylotreeNode) => string | null,
  date_converter?: (date: string) => Date | null
): phylotree;

/**
 * Cluster Picker algorithm
 */
export function clusterPicker(
  tree: phylotree,
  bootstrap_threshold: number,
  diameter_threshold: number,
  root_node?: PhylotreeNode | null,
  missing_bootstrap_value?: number
): Array<{ root: PhylotreeNode; diameter: number; bootstrap: number; members: PhylotreeNode[] }>;

/**
 * PhyloPart clustering algorithm
 */
export function phylopart(
  tree: phylotree,
  bootstrap_threshold: number,
  percentile_threshold: number,
  missing_bootstrap_value?: number,
  resolution?: number
): Array<{ root: PhylotreeNode; median: number; bootstrap: number; members: PhylotreeNode[] }>;

/**
 * Parse FASTA format into a map of sequence name to sequence
 */
export function parseFasta(fasta: string): { [name: string]: string };

/**
 * Neighbor joining tree construction
 * @param matrix The n x n distance matrix
 * @param n The dimension of the matrix
 * @param labels Row names (modified in place)
 */
export function neighborJoining(matrix: number[][], n: number, labels: string[]): phylotree | null;

/**
 * Pairwise (gap-masked) distances between aligned sequences
 */
export function getDistanceMatrix(sequences: { [name: string]: string }): { [name: string]: number[] };

/**
 * Store `annotations.matrix[name]` in the `test` field of each tip's data
 */
export function loadAnnotations(
  tree: phylotree,
  label: string,
  annotations: { matrix: { [name: string]: unknown } }
): void;

/**
 * Parse the DATA block of a NEXUS string ('' if there is none)
 */
export function parseAnnotations(nexus: string): '' | {
  dimensions: { [key: string]: string };
  format: { symbols: string[]; [key: string]: string | string[] };
  matrix: { [name: string]: string[] };
};

// Tree traversal functions

/**
 * Level-order traversal (exported as inOrder)
 */
export function inOrder(node: PhylotreeNode, callback: (node: PhylotreeNode) => void, backtrack?: (node: PhylotreeNode) => boolean): void;

/**
 * Pre-order traversal
 */
export function preOrder(node: PhylotreeNode, callback: (node: PhylotreeNode) => void, backtrack?: (node: PhylotreeNode) => boolean): void;

/**
 * Post-order traversal
 */
export function postOrder(node: PhylotreeNode, callback: (node: PhylotreeNode) => void, backtrack?: (node: PhylotreeNode) => boolean): void;

/**
 * Edge list of the multi-way tree encoded by a left-child right-sibling binary tree
 */
export function leftChildRightSibling(root: PhylotreeNode): Array<{
  source: PhylotreeNode | null | undefined;
  target: PhylotreeNode;
  name: string;
}>;
