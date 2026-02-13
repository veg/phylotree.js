// Type definitions for phylotree
// Project: https://github.com/veg/phylotree.js

import { HierarchyNode, HierarchyLink } from 'd3-hierarchy';

/**
 * Node data stored in the phylogenetic tree
 */
export interface PhylotreeNodeData {
  name: string;
  attribute?: string;
  annotation?: string;
  [key: string]: any;
}

/**
 * A node in the phylogenetic tree (D3 hierarchy node with phylotree data)
 */
export type PhylotreeNode = HierarchyNode<PhylotreeNodeData> & {
  selected?: boolean;
  tag?: boolean;
  collapsed?: boolean;
  hidden?: boolean;
  notshown?: boolean;
  screen_x?: number;
  screen_y?: number;
  text_angle?: number;
  text_align?: string;
  angle?: number;
  radius?: number;
};

/**
 * A link/branch in the phylogenetic tree
 */
export type PhylotreeLink = HierarchyLink<PhylotreeNodeData> & {
  source: PhylotreeNode;
  target: PhylotreeNode;
};

/**
 * Options for rendering a phylogenetic tree
 */
export interface RenderOptions {
  /** CSS selector or DOM element for the container */
  container?: string | HTMLElement;
  /** Width of the SVG in pixels */
  width?: number;
  /** Height of the SVG in pixels */
  height?: number;
  /** Enable zoom/pan behavior */
  zoom?: boolean;
  /** Tree layout: "left-to-right" or "right-to-left" */
  layout?: 'left-to-right' | 'right-to-left';
  /** Use radial/circular layout */
  'is-radial'?: boolean;
  /** Align tip labels */
  'align-tips'?: boolean;
  /** Show node labels */
  'show-labels'?: boolean;
  /** Show scale bar */
  'show-scale'?: boolean;
  /** Draw size bubbles on nodes */
  'draw-size-bubbles'?: boolean;
  /** Show internal node names */
  'internal-names'?: boolean | ((node: PhylotreeNode) => boolean);
  /** Enable node selection */
  selectable?: boolean;
  /** Enable collapsing of clades */
  collapsible?: boolean;
  /** Enable brushing for selection */
  brush?: boolean;
  /** Left offset in pixels */
  'left-offset'?: number;
  /** Spacing mode for top-bottom */
  'top-bottom-spacing'?: 'fixed-step' | 'fit';
  /** Spacing mode for left-right */
  'left-right-spacing'?: 'fixed-step' | 'fit';
  /** Font size for labels */
  'font-size'?: number;
  /** Maximum label width in characters */
  'max-label-width'?: number;
  /** Bubble styler function */
  'bubble-styler'?: (node: PhylotreeNode) => number;
  /** Restrict which nodes can be selected */
  'restricted-selectable'?: string | ((link: PhylotreeLink) => boolean);
  /** Logger instance */
  logger?: Console;
}

/**
 * Options for parsing tree input
 */
export interface ParseOptions {
  /** Enable bootstrap value parsing */
  bootstrap_values?: boolean;
  /** Format type: "newick", "phyloxml", "nexus" */
  type?: string | ((input: string, options: ParseOptions) => any);
  /** Logger instance */
  logger?: Console;
}

/**
 * The TreeRender class handles visualization of the tree
 */
export class TreeRender {
  /** The phylotree instance this renderer belongs to */
  phylotree: Phylotree;
  /** The SVG element */
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  /** Rendering options */
  options: RenderOptions;
  /** Current zoom transform */
  currentZoomTransform: d3.ZoomTransform | null;
  /** Label width in pixels */
  label_width: number;
  /** Rightmost leaf x position */
  right_most_leaf: number;
  /** The container element */
  container: string | HTMLElement;

  constructor(phylotree: Phylotree, options?: RenderOptions);

  /** Get the SVG element */
  show(): SVGSVGElement;

  /** Update the tree display */
  update(): this;

  /** Update layout coordinates */
  update_layout(tree: PhylotreeNode): this;

  /** Get/set radial mode */
  radial(value?: boolean): boolean | this;

  /** Get/set align tips mode */
  alignTips(value?: boolean): boolean | this;

  /** Get/set selection label */
  selectionLabel(label?: string): string | this;

  /** Get/set node label accessor */
  nodeLabel(accessor?: (node: PhylotreeNode) => string): ((node: PhylotreeNode) => string) | this;

  /** Get/set node styler function */
  nodeStyler(styler?: (element: d3.Selection<any, PhylotreeNode, any, any>, node: PhylotreeNode) => void): this;

  /** Get/set edge styler function */
  edgeStyler(styler?: (element: d3.Selection<any, PhylotreeLink, any, any>, link: PhylotreeLink) => void): this;

  /** Collapse a node */
  collapse_node(node: PhylotreeNode): this;

  /** Modify selection based on a callback */
  modifySelection(callback: (link: PhylotreeLink, callback: (selected: boolean) => void) => boolean): this;

  /** Get selected nodes */
  getSelection(): PhylotreeNode[];

  /** Get selected branches */
  getSelectedBranches(): PhylotreeLink[];

  /** Register event listener */
  on(event: string, callback: (...args: any[]) => void): this;

  /** Emit an event */
  emit(event: string, ...args: any[]): this;

  /** Selection callback setter */
  selectionCallback(callback: (selection: PhylotreeNode[]) => void): this;

  /**
   * Get or set spacing in the x-direction (horizontal spacing between nodes)
   * @param attr The new spacing value if setting
   * @param skip_render Whether to skip re-rendering after setting
   * @returns The current spacing_x value if getting, or the TreeRender instance if setting
   */
  spacing_x(): number;
  spacing_x(attr: number, skip_render?: boolean): this;

  /**
   * Get or set spacing in the y-direction (vertical spacing between levels)
   * @param attr The new spacing value if setting
   * @param skip_render Whether to skip re-rendering after setting
   * @returns The current spacing_y value if getting, or the TreeRender instance if setting
   */
  spacing_y(): number;
  spacing_y(attr: number, skip_render?: boolean): this;

  /**
   * Get or set the font size for labels
   * @param attr The new font size if setting
   * @returns The current font size if getting, or the TreeRender instance if setting
   */
  font_size(): number;
  font_size(attr: number): this;

  /**
   * Get or set the scale bar font size
   * @param attr The new font size if setting
   * @returns The current scale bar font size if getting, or the TreeRender instance if setting
   */
  scale_bar_font_size(): number;
  scale_bar_font_size(attr: number): this;

  /**
   * Get or set the node circle size
   * @param attr The new circle size if setting
   * @param attr2 Optional second parameter
   * @returns The current node circle size if getting, or the TreeRender instance if setting
   */
  node_circle_size(): number;
  node_circle_size(attr: number, attr2?: number): this;

  /**
   * Get or set CSS classes
   * @param opt CSS class options
   * @returns The current CSS classes if getting, or the TreeRender instance if setting
   */
  css(): { [key: string]: string };
  css(opt: { [key: string]: string }): this;

  /**
   * Get or set transitions
   * @param arg Transition settings
   * @returns The current transition settings if getting, or the TreeRender instance if setting
   */
  transitions(): boolean | null;
  transitions(arg: boolean): this;

  /**
   * Layout the tree
   * @param transitions Whether to use transitions
   * @returns The TreeRender instance
   */
  layout(transitions?: boolean): this;

  /** Refresh the tree display */
  refresh(): this;

  /** Place nodes in the layout */
  placenodes(): this;

  /**
   * Set the separation function for node spacing
   * @param callback Function that returns additional spacing between nodes
   * @returns The TreeRender instance
   */
  separation(callback: (node: PhylotreeNode, previous: PhylotreeNode) => number): this;

  /**
   * Set internal node labels based on children
   * @param callback Function that determines label based on children
   * @param respect_existing Whether to respect existing selections
   * @returns The TreeRender instance
   */
  internalLabel(callback: (children: PhylotreeNode[]) => boolean, respect_existing?: boolean): this;

  /**
   * Get or set the count handler callback
   * @param callback Function called with selection count
   * @returns The current handler if getting, or the TreeRender instance if setting
   */
  countHandler(): ((count: number) => void) | null;
  countHandler(callback: (count: number) => void): this;

  /**
   * Update the selection key name
   * @param old_key The old key name
   * @param new_key The new key name
   * @returns The TreeRender instance
   */
  updateKeyName(old_key: string, new_key: string | null): this;

  /**
   * Set the size of the tree display
   * @param attr Size as [width, height]
   * @returns The current size if getting, or the TreeRender instance if setting
   */
  set_size(): [number, number];
  set_size(attr: [number, number]): this;
}

/**
 * Main Phylotree class for creating and manipulating phylogenetic trees
 */
export class phylotree {
  /** Hierarchical tree structure (D3 hierarchy) */
  nodes: PhylotreeNode;
  /** Links between nodes */
  links: PhylotreeLink[];
  /** Parsed annotation tags */
  parsed_tags: string[];
  /** The tree renderer (set after calling render()) */
  display: TreeRender | null;
  /** Original Newick string */
  newick_string: string;
  /** Selection attribute name */
  selection_attribute_name: string;

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
   * @param traversal_type "pre-order", "post-order", or "in-order"
   * @param root_node Optional starting node
   * @param backtrack Optional function to stop traversal
   */
  traverse_and_compute(
    callback: (node: PhylotreeNode) => void,
    traversal_type?: 'pre-order' | 'post-order' | 'in-order',
    root_node?: PhylotreeNode,
    backtrack?: (node: PhylotreeNode) => boolean
  ): void;

  /** Export tree to JSON string */
  json(traversal_type?: string): string;

  /** Get parsed annotation tags */
  get_parsed_tags(): string[];

  /** Update tree from JSON */
  update(json: object): this;

  /** Check if tree has branch lengths */
  hasBranchLengths(): boolean;

  /** Get all branch lengths */
  getBranchLengths(): number[];

  /** Set branch length accessor */
  setBranchLength(accessor: (node: PhylotreeNode) => number): this;

  /** Normalize branch lengths */
  normalizeBranchLengths(attr?: string): this;

  /** Scale branch lengths by a factor */
  scaleBranchLengths(scale: number): this;

  /** Get branch name accessor */
  branchName(accessor?: (node: PhylotreeNode) => string): string | this;

  /** Get Newick representation of tree */
  getNewick(annotator?: (node: PhylotreeNode) => string): string;

  /** Get tagged Newick representation */
  getTaggedNewick(): string;

  /** Find most recent common ancestor of nodes */
  mrca(nodes: (PhylotreeNode | string)[]): PhylotreeNode;

  /** Check if a node is a leaf */
  isLeafNode(node: PhylotreeNode): boolean;

  /** Get all tip/leaf nodes */
  getTips(): PhylotreeNode[];

  /** Get all internal nodes */
  getInternals(): PhylotreeNode[];

  /** Get root node */
  getRootNode(): PhylotreeNode;

  /** Get all nodes */
  getNodes(): PhylotreeNode[];

  /** Get node by name */
  getNodeByName(name: string): PhylotreeNode | undefined;

  /** Select all descendants of a node */
  selectAllDescendants(node: PhylotreeNode, terminal?: boolean, internal?: boolean): PhylotreeNode[];

  /** Reroot the tree at a node */
  reroot(node: PhylotreeNode, fraction?: number): this;

  /** Get path from a node to the root */
  pathToRoot(node: PhylotreeNode): PhylotreeNode[];

  /** Resort children of nodes */
  resortChildren(comparator: (a: PhylotreeNode, b: PhylotreeNode) => number): this;

  /** Graft a new node */
  graftANode(graftAt: PhylotreeNode, newChild: PhylotreeNode, newParent?: PhylotreeNode, lengths?: { new_child: number; new_parent: number }): void;

  /** Add a child node */
  addChild(parent: PhylotreeNode, child: PhylotreeNode): void;

  /** Delete a node */
  deleteANode(index: number): void;

  /** Assign attributes to nodes */
  assignAttributes(attributes: object): this;

  /** Get tip lengths for date extraction */
  getTipLengths(): { [name: string]: number };

  /** Maximum parsimony ancestral state reconstruction */
  maxParsimony(attr: string, states: string[]): this;

  /** Clear internal node selections */
  clearInternalNodes(respect?: boolean): this;
}

// Utility functions

/**
 * Parse a Newick format string
 */
export function newickParser(newick: string, options?: ParseOptions): { json: object; error: string | null };

/**
 * Get Newick string from tree
 */
export function getNewick(tree: PhylotreeNode, annotator?: (node: PhylotreeNode) => string): string;

/**
 * Compute pairwise distances between nodes
 */
export function pairwise_distances(tree: phylotree): number[][];

/**
 * Compute pairwise distances between nodes (camelCase alias)
 */
export function pairwiseDistances(tree: phylotree): number[][];

/**
 * Compute Sackin's index (tree balance measure)
 */
export function sackin(tree: phylotree): number;

/**
 * Find center of tree
 */
export function centerOfTree(tree: phylotree): PhylotreeNode;

/**
 * Compute midpoint for rooting
 */
export function computeMidpoint(tree: phylotree): { node: PhylotreeNode; fraction: number };

/**
 * Root to tip regression
 */
export function rootToTip(tree: phylotree, attr?: string): {
  slope: number;
  intercept: number;
  r2: number;
  data: Array<{ date: number; distance: number; name: string }>;
};

/**
 * Fit root to tip (find optimal root)
 */
export function fitRootToTip(tree: phylotree, attr?: string): {
  node: PhylotreeNode;
  fraction: number;
  r2: number;
};

/**
 * Extract dates from tip names
 */
export function extract_dates(tree: phylotree, pattern?: RegExp): { [name: string]: number };

/**
 * Extract dates from tip names (camelCase alias)
 */
export function extractDates(tree: phylotree, pattern?: RegExp): { [name: string]: number };

/**
 * Cluster Picker algorithm
 */
export function clusterPicker(tree: phylotree, options?: {
  bootstrap_threshold?: number;
  distance_threshold?: number;
}): PhylotreeNode[][];

/**
 * PhyloPart clustering algorithm
 */
export function phylopart(tree: phylotree, options?: {
  bootstrap_threshold?: number;
}): PhylotreeNode[][];

/**
 * Parse FASTA format
 */
export function parseFasta(fasta: string): Array<{ name: string; seq: string }>;

/**
 * Neighbor joining tree construction
 */
export function neighborJoining(matrix: number[][], labels: string[]): object;

/**
 * Get distance matrix from sequences
 */
export function getDistanceMatrix(sequences: Array<{ name: string; seq: string }>): {
  matrix: number[][];
  labels: string[];
};

/**
 * Load annotations from NEXUS file
 */
export function loadAnnotations(nexus: string): object;

/**
 * Parse annotations from NEXUS
 */
export function parseAnnotations(nexus: string): object;

// Tree traversal functions

/**
 * In-order traversal
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
 * Left-child right-sibling traversal
 */
export function leftChildRightSibling(node: PhylotreeNode, callback: (node: PhylotreeNode) => void): void;
