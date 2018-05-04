.. _options-section:

Options
============
phylotree.js supports a variety of options for common features, which can be set using
the following function.

.. autofunction:: phylotree.options(opt [, run_update])

The following are a list of possible options, along with their types, meanings, and possible values.

left-right-spacing
  `(String)` Determines layout size from left to right. Defaults to ``"fixed-step"``.

  * ``"fixed-step"`` - Determine width from padding and spacing.
  * ``"fit-to-size"`` - Determine width from size array.

top-bottom-spacing
  `(String)` Determines layout size from top to bottom. Defaults to ``"fixed-step"``.

  * ``"fixed-step"`` - Determine width from padding and spacing.
  * ``"fit-to-size"`` - Determine width from size array.

brush
  `(Boolean)` Whether or not the brush should be activated. Defaults to ``true``.

hide
  `(Boolean)` Whether or not hiding a given node or subtree is enabled. Defaults to ``true``.

reroot
  `(Boolean)` Whether or not rerooting on a given node is enabled. Defaults to ``true``.

compression
  `(Number)` The percentage of original size for a collapsed node. Defaults to ``.2``.

show-scale
  `(Boolean)` Determines whether or not scale bar for branch lengths is shown.

left-offset
  `(Number)` Amount of space on left side of phylotree. Defaults to ``0``.

draw-size-bubbles
  `(Boolean)` Determines whether nodes are drawn with a given size. Defaults to ``false``.

max-radius
  `(Number)` Set an upper bound on the radius in a radial layout. Defaults to 768.

collapsible
  `(Boolean)` Determines whether or not nodes are collapsible. Defaults to ``true``.

selectable
  `(Boolean)` Determines whether or not individual branches are selectable. Defaults to ``true``.

zoom
  `(Boolean)` Determines whether or not zooming is enabled. Defaults to ``false``.

restricted-selectable
  `(Array)` Determines what types of global selection actions are possible. Defaults to ``false``.

  * ``false`` - No restrictions placed on global selection.
  * ``"all"`` - Allow users to select all branches.
  * ``"none"`` - Allow users to unselect all branches.
  * ``"all-leaf-nodes"`` - Allow users to select all leaf nodes.
  * ``"all-internal-branches"`` - Allow users to select all internal branches.

align-tips
  `(Boolean)` Determines whether tip names are aligned or not. Defaults to false. 

maximum-per-node-spacing
  `(Number)` Determines maximum node spacing allocated when laying out left to right. Defaults to 100. 

minimum-per-node-spacing
  `(Number)` Determines minimum node spacing allocated when laying out left to right. Defaults to 2. 

maximum-per-level-spacing
  `(Number)` Determines maximum node spacing allocated when laying out top to bottom. Defaults to 100. 

minimum-per-level-spacing
  `(Number)` Determines minimum node spacing allocated when laying out top to bottom. Defaults to 10. 
