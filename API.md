## Classes

<dl>
<dt><a href="#Phylotree">Phylotree</a></dt>
<dd><p>An instance of a phylotree. Sets event listeners, parses tags, and creates links
that represent branches.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#getBranchLengths">getBranchLengths()</a> ⇒ <code>Array</code></dt>
<dd><p>Returns branch lengths</p>
</dd>
<dt><a href="#setBranchLength">setBranchLength(attr)</a> ⇒ <code>Object</code></dt>
<dd><p>Get or set branch length accessor.</p>
</dd>
<dt><a href="#normalize">normalize()</a> ⇒ <code><a href="#Phylotree">Phylotree</a></code></dt>
<dd><p>Normalizes branch lengths to range [0,1]</p>
</dd>
<dt><a href="#scale">scale(scale_by)</a> ⇒ <code><a href="#Phylotree">Phylotree</a></code></dt>
<dd><p>Scales branch lengths using a custom transformation function</p>
</dd>
<dt><a href="#branchName">branchName(attr)</a> ⇒</dt>
<dd><p>Get or set branch name accessor.</p>
</dd>
<dt><a href="#clusterPicker">clusterPicker(tree, bootstrap_thresold, diameter_threshold, root_node, missing_bootstrap_value)</a> ⇒</dt>
<dd><p>Implements a linear time / space version of the Cluster picker algorithm</p>
</dd>
<dt><a href="#newickParser">newickParser(nwk_str)</a> ⇒ <code>Object</code></dt>
<dd><p>Parses a Newick string into an equivalent JSON representation that is
suitable for consumption by <code>hierarchy</code>.</p>
<p>Optionally accepts bootstrap values. Currently supports Newick strings with or without branch lengths,
as well as tagged trees such as
 <code>(a,(b{TAG},(c{TAG},d{ANOTHERTAG})))</code></p>
</dd>
<dt><a href="#getNewick">getNewick(annotator, node)</a> ⇒ <code>String</code></dt>
<dd><p>Return Newick string representation of a phylotree.</p>
</dd>
<dt><a href="#loadAnnotations">loadAnnotations(tree, NEXUS)</a> ⇒ <code>Object</code></dt>
<dd><p>Loads annotations from a nexus-formatted buffer and annotates existing tree
 nodes appropriately.</p>
</dd>
<dt><a href="#mrca">mrca()</a> ⇒</dt>
<dd><p>Return most recent common ancestor of a pair of nodes.</p>
</dd>
<dt><a href="#computeMidpoint">computeMidpoint(tree)</a> ⇒ <code>Object</code></dt>
<dd><p>Compute midpoint of a phylogenetic tree</p>
</dd>
<dt><a href="#deleteANode">deleteANode(The)</a> ⇒</dt>
<dd><p>Delete a given node.</p>
</dd>
<dt><a href="#getTips">getTips()</a> ⇒ <code>Array</code></dt>
<dd><p>Get the tips of the tree</p>
</dd>
<dt><a href="#getInternals">getInternals()</a> ⇒ <code>Array</code></dt>
<dd><p>Get the internal nodes of the tree</p>
</dd>
<dt><a href="#getRootNode">getRootNode()</a> ⇒</dt>
<dd><p>Get the root node.</p>
</dd>
<dt><a href="#getNodes">getNodes()</a> ⇒ <code>Array</code></dt>
<dd><p>Get an array of all nodes.</p>
</dd>
<dt><a href="#getNodeByName">getNodeByName(name)</a> ⇒ <code>Node</code></dt>
<dd><p>Get a node by name.</p>
</dd>
<dt><a href="#assignAttributes">assignAttributes(attributes)</a></dt>
<dd><p>Add attributes to nodes. New attributes will be placed in the
<code>annotations</code> key of any nodes that are matched.</p>
</dd>
<dt><a href="#isLeafNode">isLeafNode(A)</a> ⇒ <code>Bool</code></dt>
<dd><p>Determine if a given node is a leaf node.</p>
</dd>
<dt><a href="#updateKeyName">updateKeyName(old_key, new_key)</a> ⇒</dt>
<dd><p>Update a given key name in each node.</p>
</dd>
<dt><a href="#selectAllDescendants">selectAllDescendants(node, terminal, internal)</a> ⇒ <code>Array</code></dt>
<dd><p>Select all descendents of a given node, with options for selecting
terminal/internal nodes.</p>
</dd>
<dt><a href="#toggleCollapse">toggleCollapse(node)</a> ⇒ <code><a href="#Phylotree">Phylotree</a></code></dt>
<dd><p>Toggle collapsed view of a given node. Either collapses a clade into
a smaller blob for viewing large trees, or expands a node that was
previously collapsed.</p>
</dd>
<dt><a href="#modifySelection">modifySelection(node_selecter, attr, place, skip_refresh, mode)</a> ⇒</dt>
<dd><p>Modify the current selection, via functional programming.</p>
</dd>
<dt><a href="#getSelection">getSelection()</a> ⇒ <code>Array</code></dt>
<dd><p>Get nodes which are currently selected.</p>
</dd>
<dt><a href="#selectAllDescendants">selectAllDescendants(node, terminal, internal)</a> ⇒ <code>Array</code></dt>
<dd><p>Select all descendents of a given node, with options for selecting
terminal/internal nodes.</p>
</dd>
<dt><a href="#selectionCallback">selectionCallback(callback)</a> ⇒</dt>
<dd><p>Getter/setter for the selection callback. This function is called
every time the current selection is modified, and its argument is
an array of nodes that make up the current selection.</p>
</dd>
<dt><a href="#nodeSpan">nodeSpan(attr)</a> ⇒</dt>
<dd><p>Get or set the current node span. If setting, the argument should
be a function of a node which returns a number, so that node spans
can be determined dynamically. Alternatively, the argument can be the
string <code>&quot;equal&quot;</code>, to give all nodes an equal span.</p>
</dd>
<dt><a href="#nodeLabel">nodeLabel(attr)</a> ⇒</dt>
<dd><p>Get or set nodeLabel accessor.</p>
</dd>
<dt><a href="#nodeBubbleSize">nodeBubbleSize(A)</a> ⇒ <code>Float</code></dt>
<dd><p>Return the bubble size of the current node.</p>
</dd>
<dt><a href="#selectionLabel">selectionLabel(attr)</a> ⇒</dt>
<dd><p>Getter/setter for the selection label. Useful when allowing
users to make multiple selections.</p>
</dd>
<dt><a href="#nodeSpan">nodeSpan(attr)</a> ⇒</dt>
<dd><p>Get or set the current node span. If setting, the argument should
be a function of a node which returns a number, so that node spans
can be determined dynamically. Alternatively, the argument can be the
string <code>&quot;equal&quot;</code>, to give all nodes an equal span.</p>
</dd>
<dt><a href="#selectionCallback">selectionCallback(callback)</a> ⇒</dt>
<dd><p>Getter/setter for the selection callback. This function is called
every time the current selection is modified, and its argument is
an array of nodes that make up the current selection.</p>
</dd>
<dt><a href="#reroot">reroot(node, if)</a> ⇒ <code><a href="#Phylotree">Phylotree</a></code></dt>
<dd><p>Reroot the tree on the given node.</p>
</dd>
<dt><a href="#leftChildRightSibling">leftChildRightSibling(tree)</a> ⇒ <code>Object</code></dt>
<dd><p>Traverses a tree that represents left-child right-sibling</p>
</dd>
</dl>

<a name="Phylotree"></a>

## Phylotree
An instance of a phylotree. Sets event listeners, parses tags, and creates links
that represent branches.

**Kind**: global class  

* [Phylotree](#Phylotree)
    * [new Phylotree(nwk, options)](#new_Phylotree_new)
    * [.traverse_and_compute(callback, traversal_type, root_node, backtrack)](#Phylotree+traverse_and_compute)
    * [.render(options)](#Phylotree+render) ⇒ <code>TreeRender</code>

<a name="new_Phylotree_new"></a>

### new Phylotree(nwk, options)
**Returns**: [<code>Phylotree</code>](#Phylotree) - phylotree - itself, following the builder pattern.  

| Param | Type | Description |
| --- | --- | --- |
| nwk | <code>Object</code> | A Newick string, PhyloXML string, or hierarchical JSON representation of a phylogenetic tree. |
| options | <code>Object</code> | - boostrap_values - type - format type |

**Example**  
```js
// Create a simple phylotree from a Newick string
const newick = "((A:0.1,B:0.2):0.05,C:0.3)";
const tree = new Phylotree(newick);
```
**Example**  
```js
// Create a phylotree with options
const tree = new Phylotree(newick, {
  bootstrap_values: true,
  type: "newick"
});
```
**Example**  
```js
// Create from hierarchical JSON
const jsonTree = {
  name: "root",
  children: [
    { name: "A", length: 0.1 },
    { name: "B", length: 0.2 }
  ]
};
const tree = new Phylotree(jsonTree);
```
<a name="Phylotree+traverse_and_compute"></a>

### phylotree.traverse\_and\_compute(callback, traversal_type, root_node, backtrack)
Traverse the tree in a prescribed order, and compute a value at each node.

**Kind**: instance method of [<code>Phylotree</code>](#Phylotree)  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | A function to be called on each node. |
| traversal_type | <code>String</code> | Either ``"pre-order"`` or ``"post-order"`` or ``"in-order"``. |
| root_node | <code>Node</code> | start traversal here, if provided, otherwise start at root |
| backtrack | <code>function</code> | ; if provided, then at each node n, backtrack (n) will be called,                                    and if it returns TRUE, traversal will NOT continue past into this                                    node and its children |

**Example**  
```js
// Count all nodes in the tree
let nodeCount = 0;
tree.traverse_and_compute(function(node) {
  nodeCount++;
});
console.log(`Tree has ${nodeCount} nodes`);
```
**Example**  
```js
// Find maximum depth in post-order traversal
tree.traverse_and_compute(function(node) {
  if (!node.children) {
    node.depth = 0;
  } else {
    node.depth = Math.max(...node.children.map(c => c.depth)) + 1;
  }
}, "post-order");
```
**Example**  
```js
// Add custom attributes to leaf nodes only
tree.traverse_and_compute(function(node) {
  if (!node.children) {
    node.data.isLeaf = true;
  }
});
```
<a name="Phylotree+render"></a>

### phylotree.render(options) ⇒ <code>TreeRender</code>
Render the phylotree to a DOM element. Warning: Requires DOM!

**Kind**: instance method of [<code>Phylotree</code>](#Phylotree)  
**Returns**: <code>TreeRender</code> - The display object for further customization  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | Rendering options including container, dimensions, and styling |

**Example**  
```js
// Basic rendering to a div element
const tree = new Phylotree(newick);
tree.render({
  container: "#tree-container",
  width: 800,
  height: 600
});
```
**Example**  
```js
// Render with custom styling options
const display = tree.render({
  container: d3.select("#my-tree"),
  width: 1000,
  height: 800,
  'left-right-spacing': 'fit-to-size',
  'top-bottom-spacing': 'fit-to-size',
  'show-scale': true,
  selectable: true,
  collapsible: true
});
```
**Example**  
```js
// Render radial tree layout
tree.render({
  container: "#radial-tree",
  layout: "radial",
  width: 600,
  height: 600
});
```
<a name="getBranchLengths"></a>

## getBranchLengths() ⇒ <code>Array</code>
Returns branch lengths

**Kind**: global function  
**Returns**: <code>Array</code> - array of branch lengths  
<a name="setBranchLength"></a>

## setBranchLength(attr) ⇒ <code>Object</code>
Get or set branch length accessor.

**Kind**: global function  
**Returns**: <code>Object</code> - The branch length accessor if getting, or the current this if setting.  

| Param | Type | Description |
| --- | --- | --- |
| attr | <code>function</code> | Empty if getting, or new branch length accessor if setting. |

**Example**  
```js
// Set a custom branch length accessor
const tree = new Phylotree(newick);
tree.setBranchLength(function(node) {
  // Use a transformed branch length
  return Math.log(node.data.attribute + 1);
});
```
**Example**  
```js
// Set all branch lengths to 1 (equal branch lengths)
tree.setBranchLength(function(node) {
  return 1;
});
```
**Example**  
```js
// Get the current branch length accessor
const currentAccessor = tree.setBranchLength();
```
<a name="normalize"></a>

## normalize() ⇒ [<code>Phylotree</code>](#Phylotree)
Normalizes branch lengths to range [0,1]

**Kind**: global function  
**Returns**: [<code>Phylotree</code>](#Phylotree) - The current phylotree instance  
**Example**  
```js
// Normalize all branch lengths to 0-1 range
const tree = new Phylotree(newick);
tree.normalizeBranchLengths();
// Now all branch lengths are between 0 and 1
```
**Example**  
```js
// Useful for comparing trees with different scales
const tree1 = new Phylotree(newick1).normalizeBranchLengths();
const tree2 = new Phylotree(newick2).normalizeBranchLengths();
// Both trees now have comparable branch length scales
```
<a name="scale"></a>

## scale(scale_by) ⇒ [<code>Phylotree</code>](#Phylotree)
Scales branch lengths using a custom transformation function

**Kind**: global function  
**Returns**: [<code>Phylotree</code>](#Phylotree) - The current phylotree instance  

| Param | Type | Description |
| --- | --- | --- |
| scale_by | <code>function</code> | Function that transforms each branch length |

**Example**  
```js
// Scale all branch lengths by a constant factor
const tree = new Phylotree(newick);
tree.scaleBranchLengths(function(length) {
  return length * 2; // Double all branch lengths
});
```
**Example**  
```js
// Apply logarithmic transformation
tree.scaleBranchLengths(function(length) {
  return Math.log10(length + 1);
});
```
**Example**  
```js
// Convert to time units (assuming substitutions per site)
const mutationRate = 1e-8;
tree.scaleBranchLengths(function(length) {
  return length / mutationRate; // Convert to years
});
```
<a name="branchName"></a>

## branchName(attr) ⇒
Get or set branch name accessor.

**Kind**: global function  
**Returns**: The ``nodeLabel`` accessor if getting, or the current ``this`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| attr | <code>function</code> | (Optional) If setting, a function that accesses a branch name from a node. |

<a name="clusterPicker"></a>

## clusterPicker(tree, bootstrap_thresold, diameter_threshold, root_node, missing_bootstrap_value) ⇒
Implements a linear time / space version of the Cluster picker algorithm

**Kind**: global function  
**Returns**: an array of clusters, where cluster = 
\{
   'root'   : [root node of cluster],
   'members' : [list of leaf. nodes],
   'diameter' : max distance in the cluster,
   'bootstrap' : bootstrap support at the root node
\}  

| Param | Description |
| --- | --- |
| tree | - the tree object |
| bootstrap_thresold | - value in [0,1] that sets the stringency of bootstrap support |
| diameter_threshold | - value >=0 that defines the maximum allowable pairwise distance in a cluster |
| root_node | - if specified, traverse the tree starting here (useful for only looking at parts of the tree), tree root by default |
| missing_bootstrap_value | - if a branch is missing bootstrap support value, use this value instead                   (1.0 by default) |

<a name="newickParser"></a>

## newickParser(nwk_str) ⇒ <code>Object</code>
Parses a Newick string into an equivalent JSON representation that is
suitable for consumption by ``hierarchy``.

Optionally accepts bootstrap values. Currently supports Newick strings with or without branch lengths,
as well as tagged trees such as
 ``(a,(b{TAG},(c{TAG},d{ANOTHERTAG})))``

**Kind**: global function  
**Returns**: <code>Object</code> - An object with keys ``json`` and ``error``.  

| Param | Type | Description |
| --- | --- | --- |
| nwk_str | <code>String</code> | A string representing a phylogenetic tree in Newick format. |
| bootstrap_values. | <code>Object</code> |  |

**Example**  
```js
// Parse a simple Newick tree with branch lengths
const newick = "((A:0.1,B:0.2):0.05,C:0.3);";
const result = newickParser(newick);
if (result.error) {
  console.error("Parse error:", result.error);
} else {
  console.log("Parsed tree:", result.json);
}
```
**Example**  
```js
// Parse tree with tagged branches
const taggedNewick = "((A:0.1,B{Foreground}:0.2){Foreground}:0.05,C:0.3);";
const result = newickParser(taggedNewick);
// Tagged branches will have annotation properties
```
**Example**  
```js
// Parse tree with custom delimiters
const nhxNewick = "((A:0.1,B:0.2[&&NHX:S=species1:D=Y]):0.05,C:0.3);";
const result = newickParser(nhxNewick, {
  left_delimiter: '[',
  right_delimiter: ']'
});
```
<a name="getNewick"></a>

## getNewick(annotator, node) ⇒ <code>String</code>
Return Newick string representation of a phylotree.

**Kind**: global function  
**Returns**: <code>String</code> - newick - Phylogenetic tree serialized as a Newick string.  

| Param | Type | Description |
| --- | --- | --- |
| annotator | <code>function</code> | Function to apply to each node, determining what label is written (optional). |
| node | <code>Node</code> | start at this node (default == root) |

**Example**  
```js
// Export tree to basic Newick format
const tree = new Phylotree(newick);
const exportedNewick = tree.getNewick();
console.log(exportedNewick); // "((A:0.1,B:0.2):0.05,C:0.3);"
```
**Example**  
```js
// Export with custom node annotations
const annotatedNewick = tree.getNewick(function(node) {
  if (node.data.selected) {
    return "{SELECTED}";
  }
  return "";
});
```
**Example**  
```js
// Export a subtree starting from a specific node
const nodeOfInterest = tree.getNodeByName("A");
const subtreeNewick = tree.getNewick(null, nodeOfInterest);
```
<a name="loadAnnotations"></a>

## loadAnnotations(tree, NEXUS) ⇒ <code>Object</code>
Loads annotations from a nexus-formatted buffer and annotates existing tree
 nodes appropriately.

**Kind**: global function  
**Returns**: <code>Object</code> - Annotations  

| Param | Type | Description |
| --- | --- | --- |
| tree | <code>Object</code> | Instatiated phylotree |
| NEXUS | <code>String</code> | string |

<a name="mrca"></a>

## mrca() ⇒
Return most recent common ancestor of a pair of nodes.

**Kind**: global function  
**Returns**: An array of strings, comprising each tag that was read.  
<a name="computeMidpoint"></a>

## computeMidpoint(tree) ⇒ <code>Object</code>
Compute midpoint of a phylogenetic tree

**Kind**: global function  
**Returns**: <code>Object</code> - the calculated midpoint to root on
 { location: root_node, breakpoint: 0 }  

| Param | Type | Description |
| --- | --- | --- |
| tree | <code>Object</code> | - the phylotree.js tree object |

<a name="deleteANode"></a>

## deleteANode(The) ⇒
Delete a given node.

**Kind**: global function  
**Returns**: The current ``phylotree``.  

| Param | Type | Description |
| --- | --- | --- |
| The | <code>Node</code> | node to be deleted, or the index of such a node. |

<a name="getTips"></a>

## getTips() ⇒ <code>Array</code>
Get the tips of the tree

**Kind**: global function  
**Returns**: <code>Array</code> - Nodes in the current ``phylotree``.  
**Example**  
```js
// Get all leaf nodes from a tree
const tree = new Phylotree("((A:0.1,B:0.2):0.05,C:0.3);");
const tips = tree.getTips();
console.log(tips.map(tip => tip.data.name)); // ["A", "B", "C"]
```
**Example**  
```js
// Count the number of taxa in the tree
const numTaxa = tree.getTips().length;
console.log(`Tree has ${numTaxa} taxa`);
```
<a name="getInternals"></a>

## getInternals() ⇒ <code>Array</code>
Get the internal nodes of the tree

**Kind**: global function  
**Returns**: <code>Array</code> - Nodes in the current ``phylotree``.  
<a name="getRootNode"></a>

## getRootNode() ⇒
Get the root node.

**Kind**: global function  
**Returns**: the current root node of the ``phylotree``.  
<a name="getNodes"></a>

## getNodes() ⇒ <code>Array</code>
Get an array of all nodes.

**Kind**: global function  
**Returns**: <code>Array</code> - Nodes in the current ``phylotree``.  
<a name="getNodeByName"></a>

## getNodeByName(name) ⇒ <code>Node</code>
Get a node by name.

**Kind**: global function  
**Returns**: <code>Node</code> - Desired node.  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Name of the desired node. |

**Example**  
```js
// Find a specific node by name
const tree = new Phylotree("((A:0.1,B:0.2):0.05,C:0.3);");
const nodeA = tree.getNodeByName("A");
console.log(nodeA.data.name); // "A"
```
**Example**  
```js
// Check if a node exists and get its branch length
const nodeB = tree.getNodeByName("B");
if (nodeB) {
  console.log(`Node B has branch length: ${nodeB.data.attribute}`);
}
```
<a name="assignAttributes"></a>

## assignAttributes(attributes)
Add attributes to nodes. New attributes will be placed in the
``annotations`` key of any nodes that are matched.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| attributes | <code>Object</code> | An object whose keys are the names of nodes to modify, and whose values are the new attributes to add. |

**Example**  
```js
// Add species information to nodes
const tree = new Phylotree(newick);
tree.assignAttributes({
  "Human": { species: "Homo sapiens", host: "human" },
  "Chimp": { species: "Pan troglodytes", host: "chimpanzee" }
});
```
**Example**  
```js
// Add selection categories for visualization
tree.assignAttributes({
  "foreground_1": { category: "foreground", color: "red" },
  "foreground_2": { category: "foreground", color: "red" },
  "background_1": { category: "background", color: "blue" }
});
```
<a name="isLeafNode"></a>

## isLeafNode(A) ⇒ <code>Bool</code>
Determine if a given node is a leaf node.

**Kind**: global function  
**Returns**: <code>Bool</code> - Whether or not the node is a leaf node.  

| Param | Type | Description |
| --- | --- | --- |
| A | <code>Node</code> | node in a tree. |

<a name="updateKeyName"></a>

## updateKeyName(old_key, new_key) ⇒
Update a given key name in each node.

**Kind**: global function  
**Returns**: The current ``this``.  

| Param | Type | Description |
| --- | --- | --- |
| old_key | <code>String</code> | The old key name. |
| new_key | <code>String</code> | The new key name. |

<a name="selectAllDescendants"></a>

## selectAllDescendants(node, terminal, internal) ⇒ <code>Array</code>
Select all descendents of a given node, with options for selecting
terminal/internal nodes.

**Kind**: global function  
**Returns**: <code>Array</code> - An array of selected nodes.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Node</code> | The node whose descendents should be selected. |
| terminal | <code>Boolean</code> | Whether to include terminal nodes. |
| internal | <code>Boolean</code> | Whther to include internal nodes. |

**Example**  
```js
// Select all descendants of an internal node
const tree = new Phylotree("(((A,B)AB,(C,D)CD)ABCD,E);");
const internalNode = tree.getNodeByName("ABCD");
const allDescendants = tree.selectAllDescendants(internalNode, true, true);
console.log(allDescendants.map(n => n.data.name)); // ["AB", "A", "B", "CD", "C", "D"]
```
**Example**  
```js
// Select only terminal descendants (tips in a clade)
const cladeTips = tree.selectAllDescendants(internalNode, true, false);
console.log(cladeTips.map(n => n.data.name)); // ["A", "B", "C", "D"]
```
**Example**  
```js
// Select only internal descendants
const cladeInternals = tree.selectAllDescendants(internalNode, false, true);
console.log(cladeInternals.map(n => n.data.name)); // ["AB", "CD"]
```
<a name="toggleCollapse"></a>

## toggleCollapse(node) ⇒ [<code>Phylotree</code>](#Phylotree)
Toggle collapsed view of a given node. Either collapses a clade into
a smaller blob for viewing large trees, or expands a node that was
previously collapsed.

**Kind**: global function  
**Returns**: [<code>Phylotree</code>](#Phylotree) - The current ``phylotree``.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Node</code> | The node to toggle. |

<a name="modifySelection"></a>

## modifySelection(node_selecter, attr, place, skip_refresh, mode) ⇒
Modify the current selection, via functional programming.

**Kind**: global function  
**Returns**: The current ``this``.  

| Param | Type | Description |
| --- | --- | --- |
| node_selecter | <code>function</code> | A function to apply to each node, which determines whether they become part of the current selection. Alternatively, if ``restricted-selectable`` mode is enabled, a string describing one of the pre-defined restricted-selectable options. |
| attr | <code>String</code> | (Optional) The selection attribute to modify. |
| place | <code>Boolean</code> | (Optional) Whether or not ``placenodes`` should be called. |
| skip_refresh | <code>Boolean</code> | (Optional) Whether or not a refresh is called. |
| mode | <code>String</code> | (Optional) Can be ``"toggle"``, ``"true"``, or ``"false"``. |

<a name="getSelection"></a>

## getSelection() ⇒ <code>Array</code>
Get nodes which are currently selected.

**Kind**: global function  
**Returns**: <code>Array</code> - An array of nodes that match the current selection.  
<a name="selectAllDescendants"></a>

## selectAllDescendants(node, terminal, internal) ⇒ <code>Array</code>
Select all descendents of a given node, with options for selecting
terminal/internal nodes.

**Kind**: global function  
**Returns**: <code>Array</code> - An array of selected nodes.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Node</code> | The node whose descendents should be selected. |
| terminal | <code>Boolean</code> | Whether to include terminal nodes. |
| internal | <code>Boolean</code> | Whther to include internal nodes. |

<a name="selectionCallback"></a>

## selectionCallback(callback) ⇒
Getter/setter for the selection callback. This function is called
every time the current selection is modified, and its argument is
an array of nodes that make up the current selection.

**Kind**: global function  
**Returns**: The current ``_selectionCallback`` if getting, or the current ``this`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | (Optional) The selection callback function. |

<a name="nodeSpan"></a>

## nodeSpan(attr) ⇒
Get or set the current node span. If setting, the argument should
be a function of a node which returns a number, so that node spans
can be determined dynamically. Alternatively, the argument can be the
string ``"equal"``, to give all nodes an equal span.

**Kind**: global function  
**Returns**: The ``nodeSpan`` if getting, or the current ``phylotree`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| attr | <code>function</code> | Optional; if setting, the nodeSpan function. |

<a name="nodeLabel"></a>

## nodeLabel(attr) ⇒
Get or set nodeLabel accessor.

**Kind**: global function  
**Returns**: The ``nodeLabel`` accessor if getting, or the current ``this`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| attr | <code>function</code> | (Optional) If setting, a function that accesses a branch name from a node. |

<a name="nodeBubbleSize"></a>

## nodeBubbleSize(A) ⇒ <code>Float</code>
Return the bubble size of the current node.

**Kind**: global function  
**Returns**: <code>Float</code> - The size of the bubble associated to this node.  

| Param | Type | Description |
| --- | --- | --- |
| A | <code>Node</code> | node in the phylotree. |

<a name="selectionLabel"></a>

## selectionLabel(attr) ⇒
Getter/setter for the selection label. Useful when allowing
users to make multiple selections.

**Kind**: global function  
**Returns**: The current selection label if getting, or the current ``phylotree`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| attr | <code>String</code> | (Optional) If setting, the new selection label. |

<a name="nodeSpan"></a>

## nodeSpan(attr) ⇒
Get or set the current node span. If setting, the argument should
be a function of a node which returns a number, so that node spans
can be determined dynamically. Alternatively, the argument can be the
string ``"equal"``, to give all nodes an equal span.

**Kind**: global function  
**Returns**: The ``nodeSpan`` if getting, or the current ``phylotree`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| attr | <code>function</code> | Optional; if setting, the nodeSpan function. |

<a name="selectionCallback"></a>

## selectionCallback(callback) ⇒
Getter/setter for the selection callback. This function is called
every time the current selection is modified, and its argument is
an array of nodes that make up the current selection.

**Kind**: global function  
**Returns**: The current ``_selectionCallback`` if getting, or the current ``this`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | (Optional) The selection callback function. |

<a name="reroot"></a>

## reroot(node, if) ⇒ [<code>Phylotree</code>](#Phylotree)
Reroot the tree on the given node.

**Kind**: global function  
**Returns**: [<code>Phylotree</code>](#Phylotree) - The current ``phylotree``.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Node</code> | Node to reroot on. |
| if | <code>fraction</code> | specified, partition the branch not into 0.5 : 0.5, but according to                     the specified fraction |

**Example**  
```js
// Reroot tree on a specific node
const tree = new Phylotree("((A:0.1,B:0.2):0.05,(C:0.3,D:0.1):0.08);");
const nodeC = tree.getNodeByName("C");
tree.reroot(nodeC);
// Tree is now rooted on the branch leading to C
```
**Example**  
```js
// Reroot with custom branch length partitioning
const nodeA = tree.getNodeByName("A");
tree.reroot(nodeA, 0.3); // 30% of branch length goes to new root
```
**Example**  
```js
// Reroot on midpoint of tree (balance tree)
const tips = tree.getTips();
const midpoint = tree.computeMidpoint();
tree.reroot(midpoint);
```
<a name="leftChildRightSibling"></a>

## leftChildRightSibling(tree) ⇒ <code>Object</code>
Traverses a tree that represents left-child right-sibling

**Kind**: global function  
**Returns**: <code>Object</code> - An edge list that represents the original multi-way tree  

| Param | Type | Description |
| --- | --- | --- |
| tree | <code>Object</code> | - the phylotree.js tree object |

