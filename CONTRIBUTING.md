# Contributing

## Requirements

Node > 9.x.x

## Development workflow

First, run the following commands in order to generate your environment.

```
git clone http://www.github.com/veg/phylotree.js phylo
cd phylo
npm install -g yarn
yarn global add webpack-cli
yarn
yarn serve
```

At this point, you should be able to navigate to `http://localhost:8080/` from
your browser.


Edit the file `src/main.js` while yarn develop is running in your terminal. Webpack
will generate `phylotree.js` in the root directory. Any edits to the file
`phylotree.js` will be overwritten by `webpack`. Note that you'll need to refresh your
browser after webpack builds to observe changes.
