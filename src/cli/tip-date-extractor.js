#!/usr/bin/env node

const fs = require("fs"),
  phylotree = require("../../build/phylotree.js"),
  commander = require("commander"),
  _ = require("underscore"),
  moment = require("moment"),
  winston = require("winston"),
  stringify = require("csv-stringify");

const logger = winston.createLogger({
  level: "warn",
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/*
 * Computes root-to-tip distance and fits linear regression
 * Please see the following notebook for more details
 * https://observablehq.com/@stevenweaver/computing-root-to-tip-distances-with-phylotree-js
 *
 * Usage:
 * root-to-tip -n test/data/MERS.txt
 *
 */

const default_regexp = /([0-9]{4})-?([0-9]{2})-?([0-9]{2})$/g;
const default_date_format = "YYYY-MM-DD";
const default_pos = "last";
const default_log = "warn";

var regexp = default_regexp;

// TODO : Allow multiple regular expressions
commander
  .requiredOption("-n --newick <newick>", "Input newick file")
  .option("-r --regex <regex>", "Regular expression to search date for")
  .option(
    "-s --split-on-char <delimiter>",
    "Splits tip name based on delimiter"
  )
  .option(
    "-i --index <index>",
    "Used with -s argument. Can be first, last, or <index>",
    default_pos
  )
  .option(
    "-f --date-format <format>",
    "Specifies date format in tip.",
    default_date_format
  )
  .option("-l --log-level <level>", "Specify log level", default_log);

commander
  .on("--help", function() {
    console.log("");
    console.log("Examples:");
    console.log(
      'tip-date-extractor -n test/data/MERS.txt -s "_" -f YYYY-MM-DD'
    );
    console.log(
      "tip-date-extractor -n test/data/MERS.txt -r [0-9]{4}-[0-9]{2}-[0-9]{2} -f YYYY-MM-DD"
    );
  })
  .parse(process.argv);

if (commander.regex && commander.splitOnChar) {
  logger.warn("-r and -s options are mutually exclusive");
  process.exit(1);
}

if (commander.regex) {
  regexp = new RegExp(commander.regex);
}

if (commander.logLevel) {
  logger.level = commander.logLevel;
}

if (commander.dateFormat) {
  date_format = commander.dateFormat;
}

// Assumes date formatted like 1984-09-20
let default_date_parser = function(tree, node) {
  const default_regexp = /([0-9]{4})-?([0-9]{2})-?([0-9]{2})$/g;

  var location = "";

  if (tree.is_leafnode(node)) {
    if ("name" in node.data) {
      location = default_regexp.exec(node.data.name);
      if (location) {
        return location[1] + location[2] + location[3];
      } else {
        const default_regexp = /([0-9]{4})-?([0-9]{2})$/g;
        location = default_regexp.exec(node.data.name);
        if (location) {
          return location[1] + location[2] + "1";
        }
      }
    }
  }

  return null;
};

// Example - [0-9]{4}-[0-9]{2}-[0-9]{2}
let regex_date_parser = function(tree, regex, format, node) {
  var location = "";

  if (tree.is_leafnode(node) && "name" in node.data) {
    location = regex.exec(node.data.name);

    if (location) {
      // cast to date and format.
      let parsed_date = moment(location[0], format);
      // log if debugger is turned on
      let t = parsed_date.format("YYYYMMDD");
      return t;
    }

    logger.debug("Unable to find date for " + node.data.name);
  }

  return null;
};

let split_date_parser = function(tree, delimiter, pos, format, node) {
  // pos can be first, last, or index
  if (tree.is_leafnode(node) && "name" in node.data) {
    try {
      let nsp = node.data.name.split(delimiter);
      let itm = "";

      // cast to date and format.
      if (pos == "last") {
        itm = nsp.pop();
      } else if (pos == "first") {
        itm = nsp[0];
      } else {
        itm = nsp[pos];
      }

      let parsed_date = moment(itm, format);
      let t = parsed_date.format("YYYYMMDD");
      return t;
    } catch (e) {
      logger.debug("Unable to find date for " + node.data.name);
    }
  }

  return null;
};

fs.readFile(commander.newick, (err, newick_data) => {
  const tree = new phylotree.phylotree(newick_data.toString());
  let computed_tree = phylotree.root_to_tip(tree);

  let date_parser = _.partial(default_date_parser, computed_tree);

  // Set appropriate date parser
  if (commander.splitOnChar) {
    date_parser = _.partial(
      split_date_parser,
      computed_tree,
      commander.splitOnChar,
      "last",
      date_format
    );
  } else if (commander.regex) {
    date_parser = _.partial(
      regex_date_parser,
      computed_tree,
      regexp,
      date_format
    );
  }

  let tree_with_dates = phylotree.extract_dates(computed_tree, date_parser);

  // Filter just in case the date extractor did not always find a date from the header
  const mapped = _.map(tree_with_dates.get_tips(), d => [
    d.data.name,
    d.data.decimal_date_value
  ]);

  let date_and_distances = _.filter(mapped, d => {
    return !_.isNull(d.decimal_date_value);
  });

  stringify(date_and_distances, function(err, output) {
    // Pretty print table
    console.log("name, date");
    console.log(output);
  });

});
