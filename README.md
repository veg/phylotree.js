## phylotree.js

A JavaScript interactive viewer of [phylogenetic trees](https://en.wikipedia.org/wiki/Phylogenetic_tree), written as an extension of the [D3](http://d3js.org) [hierarchy layout](https://github.com/mbostock/d3/wiki/Hierarchy-Layout). It generates high quality SVG vector graphics, allows a great degree of customizability (CSS or JavaScript callbacks), and comes with a lot of *built-in* convenicence features. 

Key features

* Runs entirely in the browser, including Newick parsing. 
* Can easily handle trees with thousands of tips.
* Supports linear, radial, scaled branch, tip-aligned, and scaled tip size views.
* The viewer can be constrained to fit in a given SVG box, or scale based on the size of the tree.
* Numerous interactive features, including
   * Scaling 
   * Animated rerooting
   * Clade collapse and hiding to explore large trees
   * Node, clade, and subtree selection
   * Tools to automatically select subsets of tree branches based on conditions.
* Style customizations based on CSS and JavaScript callbacks
   * Color branches and tips, including gradient shading for continuous traits. 
   * Customize the way tip names are displayed
   * Transform branch lengths based on branch attributes (e.g. a non-linear scale).
   * Redefine the way a tree is displayed by writing custom CSS
  

## Examples

1. A [gallery of examples](http://bl.ocks.org/spond) is a good place to learn different ways that phylotree.js can be used to display and annotate the trees. 
2. A [full-featured web application](//veg.github.io/phylotree.js/index.html) based on phylotree.js, implemented in [index.html](index.html).
3. phylotree.js is also used by the 2015 revision of the [datamonkey.org server](//test.datamonkey.org) for molecular sequence analyis. 

## Dependencies 

See [bower.json](bower.json) for dependancies. 
