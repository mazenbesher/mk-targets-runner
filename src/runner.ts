export interface TargetMatch {
  targetName: string;
  comment: string;
  index: number;
}

export class Runner {
  targetRegexp: RegExp;

  /**
   * Represents a runner object.
   * @param targetCommentRegexpString - The regular expression string for target name and its comment. It should include two named capture groups: `comment` and `targetName`.
   */
  constructor(
    public cmd: string,
    public includeDirective: string,
    public supportsDryRun: boolean,
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

  *getMatchedTargetsInText(text: string): Iterable<TargetMatch> {
    let match: RegExpExecArray | null;
    while ((match = this.targetRegexp.exec(text)) !== null) {
      yield {
        comment: match.groups?.["comment"] || "",
        targetName: match.groups?.["targetName"] || "",
        index: match.index,
      };
    }
  }
}

const Make = new Runner(
  "make",
  "include",
  true,
  String.raw`^((#\s*(?<comment>[^\n|\\]*)(?!\\$)\n)?)(?<!\\\n) *(?<targetName>[a-zA-Z0-9_-]+):\s` // https://regex101.com/r/s10jX1/1
);

const Just = new Runner(
  "just",
  "!include",
  true,
  String.raw`^(#\s*(?<comment>[^\n]*)\n)? *(?<targetName>[a-zA-Z0-9_-]+):\s` // https://regex101.com/r/3Cx8Aq/1
);

export const allRunners = [Make, Just];
