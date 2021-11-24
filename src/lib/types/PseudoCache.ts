export type PseudoCacheItem = {
  link: string;
  name: string;
  onChain: boolean;
};

export type PseudoCache = {
  items: {
    [key: string]: PseudoCacheItem;
  };
};
