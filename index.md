# Phylotree.js Documentation

A JavaScript library for developing applications and interactive visualizations involving phylogenetic trees.

## Quick Links

- [📖 API Reference](API.md) - Complete API documentation with examples
- [🚀 Getting Started](README.md) - Installation and basic usage
- [🎨 Live Demo](index.html) - Interactive tree visualization demo

## Key Features

- Parse and render phylogenetic trees from Newick format
- Interactive selection and manipulation
- Multiple layout options (linear, radial, scaled)
- D3.js integration for custom styling
- Branch length transformations and tree operations

## Basic Usage

```javascript
import Phylotree from 'phylotree';

// Create tree from Newick string
const tree = new Phylotree("((A:0.1,B:0.2):0.05,C:0.3);");

// Render to DOM element
tree.render({
  container: "#tree-container",
  width: 800,
  height: 600
});
```

For complete documentation with examples, see the [API Reference](API.md).
