export class Runner {
  constructor(
    public cmd: string,
    public includeDirective: string,
    public targetRegexp: RegExp
  ) {}

  *getTargetsInText(
    text: string
  ): Iterable<{ targetName: string; comment: string }> {
    // https://regex101.com/r/WZXw2l/1
    let match;
    while ((match = this.targetRegexp.exec(text)) !== null) {
      yield {
        comment: match[2],
        targetName: match[3],
      };
    }
  }
}

export const Make = new Runner(
  "make",
  "include",
  /^(#([^\n]*)\n)?([a-zA-Z0-9_-]+):/gm
);
export const Just = new Runner(
  "just",
  "!include",
  /^(#([^\n]*)\n)?([a-zA-Z0-9_-]+):/gm
);
