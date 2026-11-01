export interface TableColumn {
  readonly header: string;
  // Numbers are easier to compare right-aligned.
  readonly numeric?: boolean;
}
