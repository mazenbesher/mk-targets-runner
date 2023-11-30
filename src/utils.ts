export const globsToPattern = (files: string[]): string => {
  // e.g.[Makefile, *.mk] => "{**/Makefile,**/*.mk}"
  return `{**/${files.join(",**/")}}`;
};
