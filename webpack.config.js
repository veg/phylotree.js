const path = require('path');

module.exports = {
  //devtool: "source-map",
  mode: 'production',
  entry: path.resolve(__dirname, 'src', 'main.js'),
  output: {
    path: path.resolve(__dirname),
    filename: 'phylotree.js'
  },
  externals: [
    'd3',
    'underscore',
    'bootstrap',
    'jquery'
  ]
}
