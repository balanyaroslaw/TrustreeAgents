export interface WriteTarget {
  readonly isDirectory: boolean;
  readonly isSymbolicLink: boolean;
  readonly isFile: boolean;
}
