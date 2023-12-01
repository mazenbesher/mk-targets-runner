export class Runner {
  targetRegexp: RegExp;

  /**
   * Represents a runner object.
   * @param targetCommentRegexpString - The regular expression string for target name and its comment. It should include two named capture groups: `comment` and `targetName`.
   */
  constructor(
    public cmd: string,
    public includeDirective: string,
    public targetCommentRegexpString: string
  ) {
    if (!targetCommentRegexpString.includes("?<comment>")) {
      throw new Error(
        `targetCommentRegexpString should include ?<comment> named capture group`
      );
    }
    if (!targetCommentRegexpString.includes("?<targetName>")) {
      throw new Error(
        `targetCommentRegexpString should include ?<targetName> named capture group`
      );
    }
    this.targetRegexp = new RegExp(targetCommentRegexpString, "gmd"); // d: to get mache index
  }

  *getMatchedTargetsInText(
    text: string
  ): Iterable<{ targetName: string; comment: string; matchIndex: number }> {
    let match: RegExpExecArray | null;
    while ((match = this.targetRegexp.exec(text)) !== null) {
      yield {
        comment: match.groups?.["comment"] || "",
        targetName: match.groups?.["targetName"] || "",
        matchIndex: match.index,
      };
    }
  }
}

const Make = new Runner(
  "make",
  "include",
  String.raw`^((#\s*(?<comment>[^\n|\\]*)(?!\\$)\n)?)(?<!\\\n) *(?<targetName>[a-zA-Z0-9_-]+):` // https://regex101.com/r/BmPAG0/1
);

const Just = new Runner(
  "just",
  "!include",
  String.raw`^(#(?<comment>[^\n]*)\n)?(?<targetName>[a-zA-Z0-9_-]+):` // TODO
);

export const allRunners = [Make, Just];
