export enum Action {
  Run = "run",
  DryRun = "dryRun",
}

export enum InlineRunnerLocation {
  Target = "target",
  Comment = "comment",
}

// fixed keys for workspace state
export enum WorkspaceStateKey {
  LastExecutedTarget = "LastExecutedTarget",
}
