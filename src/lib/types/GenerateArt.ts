export type LayerConfigItem = {
  items: string[];
  weights: number[];
  priority: number;
};

export type LayerItem = {
  layerName: string;
  item: string;
  uri: string;
  priority: number;
};

export type PickedLayer = {
  priority: number;
  pickedLayerItem: string;
};
