export function item_tagged(item) {
  return item.tag || false;
}

export function item_selected(item, tag) {
  return item[tag] || false;
}



