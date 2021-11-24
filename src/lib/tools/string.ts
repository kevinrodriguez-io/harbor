export const removeLastOccurrence = (str: string, substr: string): string => {
  const index = str.lastIndexOf(substr);
  if (index === -1) {
    return str;
  }
  return str.substr(0, index) + str.substr(index + substr.length);
};
