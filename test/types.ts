import {
  ExportType,
  type ExportSpecifier,
} from '../types/lexer.js';
import type {
  ExportSpecifier as MinimalExportSpecifier,
} from '../types/lexer.minimal.js';

declare const exportSpecifier: ExportSpecifier;

switch (exportSpecifier.t) {
  case ExportType.Direct:
    exportSpecifier.ln;
    // @ts-expect-error Imported names only exist on reexports.
    exportSpecifier.im;
    break;
  case ExportType.Reexport:
    exportSpecifier.im;
    // @ts-expect-error Local names only exist on direct exports.
    exportSpecifier.ln;
    break;
  case ExportType.ReexportAll:
    exportSpecifier.f;
    // @ts-expect-error Star reexports do not have an exported name.
    exportSpecifier.n;
    break;
  default: {
    const exhaustive: never = exportSpecifier;
    exhaustive;
  }
}

declare const minimalExportSpecifier: MinimalExportSpecifier;
minimalExportSpecifier.ln;
// @ts-expect-error Minimal export records keep the v2 shape.
minimalExportSpecifier.t;
