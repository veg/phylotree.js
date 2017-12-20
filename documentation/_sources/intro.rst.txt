.. _intro-section:

Introduction
============

Getting started with Phylotree.js is straightforward. This page describes acquiring the source code and two simple examples for displaying trees on a web page.

Installation
------------

The source code for Phylotree is available as a single Javascript file. An additional CSS file is provided for appropriate SVG styling. Phylotree 
also requires `D3`_, `jQuery`_, `Underscore`_, and `Bootstrap`_ as dependencies. To use Phylotree.js, make sure all of Phylotree and its dependencies are included
in your project.

If you are developing web applications in the traditional manner (i.e., by including Javascript and CSS files in HTML files), acquire the source code at Github by
`downloading a compressed version of the latest release`_. Then, include the Javascript and CSS as usual:

.. code-block:: html

  <link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
  <link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap-theme.min.css">
  <link rel="stylesheet" href="phylotree.css">

  <script src="//code.jquery.com/jquery.js"></script>
  <script src="//netdna.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"></script>
  <script src="//d3js.org/d3.v3.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js" charset="utf-8"></script>
  <script type='text/javascript' src='phylotree.js'></script>

Phylotree.js is also available as an `NPM package`_. It can be imported as an ES6 module and bundled with a module-bundler like `Webpack`_. Install with NPM via

.. code-block:: bash

  npm install phylotree

or yarn via

.. code-block:: bash

  yarn add phylotree

to obtain the source code. Then include the necessary Javascript and CSS using the following ES6 syntax:

.. code-block:: javascript

  require("phylotree");
  require("phylotree.css");

.. _D3: https://d3js.org/
.. _jQuery: http://jquery.com/
.. _Underscore: http://underscorejs.org/
.. _Bootstrap: https://getbootstrap.com/docs/3.3/
.. _downloading a compressed version of the latest release: https://github.com/veg/phylotree.js/releases
.. _NPM package: https://www.npmjs.com/package/phylotree
.. _Webpack: https://webpack.js.org/

A minimal working example
-------------------------
If you have a tree in Newick format, you are ready to go with the following four lines of Javascript. Below, 
we assume such a string to be stored in the variable ``example_tree``.

.. code-block:: javascript

    var tree = d3.layout.phylotree()
      .svg(d3.select("#tree_display"));
    tree(example_tree)
      .layout();
  
This forms the basis of the `Hello World`_ example.

.. _Hello World: /examples/hello-world

Toggling options
----------------

The above example comes complete with selectable branches, nodes with drop down menus, clades that collapse, and
so on. These can be toggled with the options method. The following code snippet simply displays a tree, disabling
the default options.

.. code-block:: javascript

  var height = 400,
    width = 400,

    tree = d3.layout.phylotree()
    .svg(d3.select("#tree_display"))
    .options({
      'left-right-spacing': 'fit-to-size',
      // fit to given size top-to-bottom
      'top-bottom-spacing': 'fit-to-size',
      // fit to given size left-to-right
      'selectable': false,
      // make nodes and branches not selectable
      'collapsible': false,
      // turn off the menu on internal nodes
      'transitions': false
      // turn off d3 animations
    })
    .size([height, width])
    .node_circle_size(0); // do not show "circles" at internal nodes

  tree(newick)
    // generate node coordinates
    .layout();

This forms the basis of the `Vanilla`_ example. A list of available options is available in the :ref:`options-section` section.

.. _Vanilla: /examples/vanilla

