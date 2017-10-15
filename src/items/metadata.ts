/** Meta data for items. */
interface Metadata {
  /** Name of the item. */
  itemName?: string;

  /** Type of the item. */
  itemType?: number;

  /** Url of the model. */
  modelUrl?: string;

  /** Resizeable or not */
  resizable?: boolean;
}

export default Metadata;
