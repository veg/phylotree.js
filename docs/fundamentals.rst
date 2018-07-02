Fundamentals
============
This section describes basic commands for displaying trees, such as those found in
the :ref:`intro-section` section.

Note that many methods follow the getter/setter pattern, commonly used in D3. That is,
they can either be used to retrieve an underlying parameter by being invoked without
arguments (get), or can be used to change an underlying parameter by being invoked with the
proper arguments (set).

Supported formats
-----------------

Phylotree supports the `Newick format`_, as well the extension of this format that is used
by `HyPhy`_. This allows assigning a category to each branch by the use of curly braces directly after
identifiers, e.g.:

``((((Pig:0.147969,Cow:0.21343):0.085099,Horse:0.165787,Cat:0.264806):0.058611,``
``((RhMonkey{Foreground}:0.002015,Baboon{Foreground}:0.003108){Foreground}:0.022733``
``,(Human{Foreground}:0.004349,Chimp{Foreground}:0.000799){Foreground}:0.011873):0.101856)``
``:0.340802,Rat:0.050958,Mouse:0.09795)``

Additionally, it supports two common XML formats in phylogenetics, namely the `PhyloXML`_ and `NeXML`_ formats.

.. _Newick format: https://en.wikipedia.org/wiki/Newick_format
.. _HyPhy: https://hyphy.org
.. _PhyloXML: http://www.phyloxml.org/
.. _NeXML: http://nexml.org/

Reading and writing trees
-------------------------

The following is the main method for instantiating a phylotree. It is 
attached to the ``d3.layout`` namespace.

.. autofunction:: d3.layout.phylotree([container])

Phylotrees are themselves functions, with many methods attached and variables
that have been closed over to provide an internal state. Newick, PhyloXML, and
NeXML formats are supported.

.. autofunction:: phylotree~phylotree(nwk[, bootstrap_values])

.. autofunction:: d3.layout.phylotree.nexml_parser

Internally, Phylotree.js uses the `D3 hierarchy layout`_. The following function
parses Newick strings into a hierarchical JSON format. Certain ad-hoc extensions,
such as those used by HyPhy or Beast, are (partially) supported.

.. autofunction:: d3.layout.newick_parser(nwk_str[, bootstrap_values])

Trees may be serialized to Newick strings, possibly after having been annotated,
for downstream use in an application.

.. autofunction:: phylotree.get_newick([annotator])

.. _D3 hierarchy layout: https://github.com/d3/d3-3.x-api-reference/blob/master/Hierarchy-Layout.md

.. autofunction:: phylotree.get_parsed_tags

Drawing trees
-------------

In order to render a phylotree, an SVG element needs to present in the body of the document. One
can specify which svg to render within with the following function.

.. autofunction:: phylotree.svg

Once a tree has been parsed and an SVG element chosen, the following function is called to render
the tree.

.. autofunction:: phylotree.layout([transitions])

Formatting trees
----------------

The following methods are getters/setters for various formatting options.

.. autofunction:: phylotree.size([attr])

.. autofunction:: phylotree.spacing_x([attr, skip_render])

.. autofunction:: phylotree.spacing_y([attr, skip_render])

.. autofunction:: phylotree.font_size([attr])

