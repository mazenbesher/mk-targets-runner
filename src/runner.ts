export class Runner {
  constructor(
    public cmd: string,
    public includeDirective: string,
    public targetRegexp: RegExp
  ) {}

  *getMatchedTargetsInText(
    text: string
  ): Iterable<{ targetName: string; comment: string; match: RegExpExecArray }> {
    // https://regex101.com/r/WZXw2l/1
    let match: RegExpExecArray | null;
    while ((match = this.targetRegexp.exec(text)) !== null) {
      yield {
        comment: match[2],
        targetName: match[3],
        match,
      };
    }
  }
}

const Make = new Runner(
  "make",
  "include",
  /^(#([^\n]*)\n)?([a-zA-Z0-9_-]+):/gm
);

const Just = new Runner(
  "just",
  "!include",
  /^(#([^\n]*)\n)?([a-zA-Z0-9_-]+):/gm
);

export const allRunners = [Make, Just];
