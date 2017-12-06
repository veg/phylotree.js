Fundamentals
============
This section describes basic commands for displaying trees, such as those found in
the :ref:`intro-section` section.

Reading and writing trees
-------------------------

The following is the main method for instantiating a phylotree. It is 
attached to the ``d3.layout`` namespace.

.. autofunction:: d3.layout.phylotree([container])

Phylotrees are themselves functions, with many methods attached and variables
that have been closed over to provide an internal state.

.. autofunction:: phylotree~phylotree(nwk[, bootstrap_values])

Internally, Phylotree.js uses the `D3 hierarchy layout`_. The following function
parses Newick strings into a hierarchical JSON format.

.. autofunction:: d3.layout.newick_parser(nwk_str[, bootstrap_values])

Trees may be serialized to Newick strings, possibly after having been annotated,
for downstream use in an application.

.. autofunction:: phylotree.get_newick([annotator])

.. _D3 hierarchy layout: https://github.com/d3/d3-3.x-api-reference/blob/master/Hierarchy-Layout.md

.. autofunction:: phylotree.get_parsed_tags

Drawing trees
-------------

In order to render a phylotree, an SVG element needs to present in the body of the document. One
can specify which svg to render to with the following function.

.. autofunction:: phylotree.svg

Once a tree has been parsed and an SVG element chosen, the following function is called to render
the tree.

.. autofunction:: phylotree.layout([transitions])

These form the basis for IO and drawing trees. The next section covers methods that pertain to nodes.

Formatting trees
----------------

The following methods are getters/setters for various formatting options.

.. autofunction:: phylotree.size([attr])

.. autofunction:: phylotree.spacing_x([attr, skip_render])

.. autofunction:: phylotree.spacing_y([attr, skip_render])

.. autofunction:: phylotree.font_size([attr])

