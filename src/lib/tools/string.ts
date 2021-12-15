export const removeLastOccurrence = (str: string, substr: string): string => {
  const index = str.lastIndexOf(substr);
  if (index === -1) {
    return str;
  }
  return str.substr(0, index) + str.substr(index + substr.length);
};

export const padNumber = (n: number) =>
  n < 10 ? `000${n}` : n < 100 ? `00${n}` : n < 1000 ? `0${n}` : n.toString();
