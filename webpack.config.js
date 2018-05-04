const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'phylotree.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'phylotree.js'
  },
  externals: [
    'd3',
    'underscore',
    'bootstrap',
    'jquery'
  ]
}
