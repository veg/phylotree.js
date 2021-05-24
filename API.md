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
<dt><a href="#normalize">normalize()</a></dt>
<dd><p>Normalizes branch lengths</p>
</dd>
<dt><a href="#scale">scale(function)</a></dt>
<dd><p>Scales branch lengths</p>
</dd>
<dt><a href="#branchName">branchName(attr)</a> ⇒</dt>
<dd><p>Get or set branch name accessor.</p>
</dd>
<dt><a href="#mrca">mrca()</a> ⇒</dt>
<dd><p>Return most recent common ancestor of a pair of nodes.</p>
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
<dt><a href="#reroot">reroot(node, if)</a> ⇒ <code><a href="#Phylotree">Phylotree</a></code></dt>
<dd><p>Reroot the tree on the given node.</p>
</dd>
<dt><a href="#leftChildRightSibling">leftChildRightSibling(tree)</a> ⇒ <code>Object</code></dt>
<dd><p>Traverses a tree that represents left-child right-sibling</p>
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
<dt><a href="#getNewick">getNewick(annotator)</a> ⇒ <code>String</code></dt>
<dd><p>Return Newick string representation of a phylotree.</p>
</dd>
<dt><a href="#loadAnnotations">loadAnnotations(tree, NEXUS)</a> ⇒ <code>Object</code></dt>
<dd><p>Loads annotations from a nexus-formatted buffer and annotates existing tree
 nodes appropriately.</p>
</dd>
<dt><a href="#computeMidpoint">computeMidpoint(tree)</a> ⇒ <code>Object</code></dt>
<dd><p>Compute midpoint of a phylogenetic tree</p>
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
</dl>

<a name="Phylotree"></a>

## Phylotree
An instance of a phylotree. Sets event listeners, parses tags, and creates links
that represent branches.

**Kind**: global class  
<a name="new_Phylotree_new"></a>

### new Phylotree(nwk, options)
**Returns**: [<code>Phylotree</code>](#Phylotree) - phylotree - itself, following the builder pattern.  

| Param | Type | Description |
| --- | --- | --- |
| nwk | <code>Object</code> | A Newick string, PhyloXML string, or hierarchical JSON representation of a phylogenetic tree. |
| options | <code>Object</code> | - boostrap_values - type - format type |

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

<a name="normalize"></a>

## normalize()
Normalizes branch lengths

**Kind**: global function  
<a name="scale"></a>

## scale(function)
Scales branch lengths

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| function | <code>function</code> | that scales the branches |

<a name="branchName"></a>

## branchName(attr) ⇒
Get or set branch name accessor.

**Kind**: global function  
**Returns**: The ``nodeLabel`` accessor if getting, or the current ``this`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| attr | <code>function</code> | (Optional) If setting, a function that accesses a branch name from a node. |

<a name="mrca"></a>

## mrca() ⇒
Return most recent common ancestor of a pair of nodes.

**Kind**: global function  
**Returns**: An array of strings, comprising each tag that was read.  
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

<a name="assignAttributes"></a>

## assignAttributes(attributes)
Add attributes to nodes. New attributes will be placed in the
``annotations`` key of any nodes that are matched.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| attributes | <code>Object</code> | An object whose keys are the names of nodes to modify, and whose values are the new attributes to add. |

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

<a name="reroot"></a>

## reroot(node, if) ⇒ [<code>Phylotree</code>](#Phylotree)
Reroot the tree on the given node.

**Kind**: global function  
**Returns**: [<code>Phylotree</code>](#Phylotree) - The current ``phylotree``.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Node</code> | Node to reroot on. |
| if | <code>fraction</code> | specified, partition the branch not into 0.5 : 0.5, but according to                     the specified fraction |

<a name="reroot..nodes"></a>

### reroot~nodes
TODO add the option to root in the middle of a branch

**Kind**: inner property of [<code>reroot</code>](#reroot)  
<a name="leftChildRightSibling"></a>

## leftChildRightSibling(tree) ⇒ <code>Object</code>
Traverses a tree that represents left-child right-sibling

**Kind**: global function  
**Returns**: <code>Object</code> - An edge list that represents the original multi-way tree  

| Param | Type | Description |
| --- | --- | --- |
| tree | <code>Object</code> | - the phylotree.js tree object |

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

<a name="getNewick"></a>

## getNewick(annotator) ⇒ <code>String</code>
Return Newick string representation of a phylotree.

**Kind**: global function  
**Returns**: <code>String</code> - newick - Phylogenetic tree serialized as a Newick string.  

| Param | Type | Description |
| --- | --- | --- |
| annotator | <code>function</code> | Function to apply to each node, determining what label is written (optional). |

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

<a name="computeMidpoint"></a>

## computeMidpoint(tree) ⇒ <code>Object</code>
Compute midpoint of a phylogenetic tree

**Kind**: global function  
**Returns**: <code>Object</code> - the calculated midpoint to root on
 { location: root_node, breakpoint: 0 }  

| Param | Type | Description |
| --- | --- | --- |
| tree | <code>Object</code> | - the phylotree.js tree object |

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
**Returns**: The current ``selectionCallback`` if getting, or the current ``this`` if setting.  

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
**Returns**: The current ``selectionCallback`` if getting, or the current ``this`` if setting.  

| Param | Type | Description |
| --- | --- | --- |
| callback | <code>function</code> | (Optional) The selection callback function. |

