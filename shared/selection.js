// Konva IDs are literal identifiers, not CSS selectors. UUIDs may start with digits.
export const findElementNode=(container,id)=>container?.findOne(node=>node.id()===id);
