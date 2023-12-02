import * as vscode from "vscode";
import * as target from "../target";

export class QuickPickItemTarget implements vscode.QuickPickItem {
  constructor(public target: target.Target) { }

  get label(): string {
    return `Run Target: ${this.target.name}`;
  }

  get description(): string {
    return this.target.comment;
  }
}
