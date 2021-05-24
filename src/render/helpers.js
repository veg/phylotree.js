export function itemTagged(item) {
  return item.tag || false;
}

export function itemSelected(item, tag) {
  return item[tag] || false;
}
