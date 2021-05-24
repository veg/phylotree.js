# phylotree.js

A JavaScript library for developing applications and interactive visualizations involving [phylogenetic trees](https://en.wikipedia.org/wiki/Phylogenetic_tree), written as an extension of the [D3](http://d3js.org) [hierarchy layout](https://github.com/d3/d3-3.x-api-reference/blob/master/Hierarchy-Layout.md). It generates high quality SVG vector graphics, allows a great degree of customizability (CSS or JavaScript callbacks), and comes with a lot of *built-in* convenience features. 

## Example Notebooks


### Standalone web application

A [full-featured web application](http://phylotree.hyphy.org) based on phylotree.js, implemented in [index.html](index.html).

## Features

* Capable of handling multiple selection categories for comparative analysis.
* Several mechanisms for selecting branches, including by clade, path to root, individual branches, internal branches, leaves, and branches that are nearby after layout.
* Runs entirely in the browser, including Newick/PhyloXML/NexML parsing. 
* Can handle trees with thousands of tips.
* Supports linear, radial, scaled branch, tip-aligned, and scaled tip size views.
* The viewer can be constrained to fit in a given SVG box, or scale based on the size of the tree.
* Numerous interactive features, including
   * Scaling 
   * Animated rerooting
   * Ladderization
   * Clade collapse and hiding to explore large trees
   * Node, clade, and subtree selection
   * Tools to automatically select subsets of tree branches based on conditions.
* Style customizations based on CSS and JavaScript callbacks
   * Color branches and tips, including gradient shading for continuous traits. 
   * Customize the way tip names are displayed
   * Transform branch lengths based on branch attributes (e.g. a non-linear scale).
   * Redefine the way a tree is displayed by writing custom CSS
* Available on [npm](https://www.npmjs.com/package/phylotree) to facilitate modern JavaScript development.

## Installation

If you use NPM, `npm install phylotree`. Otherwise, the latest release can be
installed locally using the following commands.

```
git clone https://github.com/veg/phylotree.js.git
yarn
yarn serve
```

This will run `rollup` in watch mode and start a local server (default port is 8080). Refresh upon editing to view changes.

## Fundamentals

This section describes basic commands for displaying trees, such as those found
in the Introduction section.

Note that many methods follow the getter/setter pattern, commonly used in D3.
That is, they can either be used to retrieve an underlying parameter by being
invoked without arguments (get), or can be used to change an underlying
parameter by being invoked with the proper arguments (set).

### Supported Formats
Phylotree supports the Newick format, as well the extension of this format that
is used by HyPhy. This allows assigning a category to each branch by the use of
curly braces directly after identifiers, e.g.:

```
((((Pig:0.147969,Cow:0.21343):0.085099,Horse:0.165787,Cat:0.264806):0.058611, ((RhMonkey{Foreground}:0.002015,Baboon{Foreground}:0.003108){Foreground}:0.022733 ,(Human{Foreground}:0.004349,Chimp{Foreground}:0.000799){Foreground}:0.011873):0.101856) :0.340802,Rat:0.050958,Mouse:0.09795)
```

## Examples
* [Simple Example](https://observablehq.com/@stevenweaver/phylotree-1-0-0?collection=@stevenweaver/phylotree-utilities)
* [Unscaled IAV HA colored by host](https://observablehq.com/@stevenweaver/phylotree-1-0-0-unscaled-iav-ha-colored-by-host?collection=@stevenweaver/phylotree-utilities)
* [HIV RT](https://observablehq.com/@stevenweaver/phylotree-1-0-0-hiv-rt?collection=@stevenweaver/phylotree-utilities)
* [NGS Copy Diversity](https://observablehq.com/@stevenweaver/ngs-copy-diversity-with-phylotree-1-0-0?collection=@stevenweaver/phylotree-utilities)
* [HIV-1 env multiple timepoints and compartments](https://observablehq.com/@stevenweaver/hiv-1-env-multiple-timepoints-and-compartments-with-phylot?collection=@stevenweaver/phylotree-utilities)
* [Computing Root-to-Tip Distances with Phylotree.js](https://observablehq.com/@stevenweaver/computing-root-to-tip-distances-with-phylotree-js?collection=@stevenweaver/phylotree-utilities)
* [Computing the Center of the Tree with Phylotree.js](https://observablehq.com/@stevenweaver/computing-the-center-of-the-tree-with-phylotree-js?collection=@stevenweaver/phylotree-utilities)
* [Identifying Clusters in a Phylogenetic Tree with Phylotree.js](https://observablehq.com/@stevenweaver/identifying-clusters-in-a-phylogenetic-tree-with-phylotre?collection=@stevenweaver/phylotree-utilities)
* [Identifying Clusters in a Phylogenetic Tree with Phylotree.js Part II](https://observablehq.com/@stevenweaver/identifying-clusters-in-a-phylogenetic-tree-with-phylotre/2?collection=@stevenweaver/phylotree-utilities)

## Options

phylotree.js supports a variety of options for common features, which can be set using
the following function.

The following are a list of possible options, along with their types, meanings, and possible values.

### left-right-spacing
  `(String)` Determines layout size from left to right. Defaults to ``"fixed-step"``.

  * ``"fixed-step"`` - Determine width from padding and spacing.
  * ``"fit-to-size"`` - Determine width from size array.

### top-bottom-spacing
  `(String)` Determines layout size from top to bottom. Defaults to ``"fixed-step"``.

  * ``"fixed-step"`` - Determine width from padding and spacing.
  * ``"fit-to-size"`` - Determine width from size array.

### brush
  `(Boolean)` Whether or not the brush should be activated. Defaults to ``true``.

### hide
  `(Boolean)` Whether or not hiding a given node or subtree is enabled. Defaults to ``true``.

### reroot
  `(Boolean)` Whether or not rerooting on a given node is enabled. Defaults to ``true``.

### compression
  `(Number)` The percentage of original size for a collapsed node. Defaults to ``.2``.

### show-scale
  `(Boolean)` Determines whether or not scale bar for branch lengths is shown.

### left-offset
  `(Number)` Amount of space on left side of phylotree. Defaults to ``0``.

### draw-size-bubbles
  `(Boolean)` Determines whether nodes are drawn with a given size. Defaults to ``false``.

### max-radius
  `(Number)` Set an upper bound on the radius in a radial layout. Defaults to 768.

### collapsible
  `(Boolean)` Determines whether or not nodes are collapsible. Defaults to ``true``.

### selectable
  `(Boolean)` Determines whether or not individual branches are selectable. Defaults to ``true``.

### zoom
  `(Boolean)` Determines whether or not zooming is enabled. Defaults to ``false``.

### restricted-selectable
  `(Array)` Determines what types of global selection actions are possible. Defaults to ``false``.

  * ``false`` - No restrictions placed on global selection.
  * ``"all"`` - Allow users to select all branches.
  * ``"none"`` - Allow users to unselect all branches.
  * ``"all-leaf-nodes"`` - Allow users to select all leaf nodes.
  * ``"all-internal-branches"`` - Allow users to select all internal branches.

### align-tips
  `(Boolean)` Determines whether tip names are aligned or not. Defaults to false.

### maximum-per-node-spacing
  `(Number)` Determines maximum node spacing allocated when laying out left to right. Defaults to 100.

### minimum-per-node-spacing
  `(Number)` Determines minimum node spacing allocated when laying out left to right. Defaults to 2.

### maximum-per-level-spacing
  `(Number)` Determines maximum node spacing allocated when laying out top to bottom. Defaults to 100.

### minimum-per-level-spacing
  `(Number)` Determines minimum node spacing allocated when laying out top to bottom. Defaults to 10.

## API Reference
A complete list of available functions can be found at [API.md](API.md)

