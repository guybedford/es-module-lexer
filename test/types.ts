import type {
  Import,
  Export,
} from '../types/lexer.js';
import { parse } from '../types/lexer.js';
import { parse as minimalParse } from '../types/lexer.minimal.js';
import type {
  ImportSpecifier as MinimalImportSpecifier,
  ExportSpecifier as MinimalExportSpecifier,
} from '../types/lexer.minimal.js';

declare const imported: Import;

switch (imported.type) {
  case 'static':
  case 'reexport-star':
    imported.specifier satisfies string;
    imported.attributes;
    imported.typeOnly;
    // @ts-expect-error Only dynamic imports have a dynamic argument start.
    imported.dynamicStart;
    break;
  case 'dynamic':
    imported.specifier;
    imported.dynamicStart;
    imported.phase;
    break;
  case 'import-meta':
    imported.start;
    // @ts-expect-error import.meta references have no specifier.
    imported.specifier;
    break;
  default: {
    const exhaustive: never = imported;
    exhaustive;
  }
}

declare const exported: Export;

switch (exported.type) {
  case 'direct':
    exported.localName;
    exported.typeOnly;
    // @ts-expect-error Imported names only exist on reexports.
    exported.importName;
    break;
  case 'reexport':
    exported.importName;
    exported.from satisfies string;
    // @ts-expect-error Local names only exist on direct exports.
    exported.localName;
    break;
  case 'reexport-all':
    exported.from satisfies string;
    // @ts-expect-error Star reexports do not have an exported name.
    exported.name;
    break;
  default: {
    const exhaustive: never = exported;
    exhaustive;
  }
}

declare const minimalImportSpecifier: MinimalImportSpecifier;
minimalImportSpecifier.n;
// @ts-expect-error Minimal import records keep the v2 shape.
minimalImportSpecifier.specifier;

declare const minimalExportSpecifier: MinimalExportSpecifier;
minimalExportSpecifier.ln;
// @ts-expect-error Minimal export records keep the v2 shape.
minimalExportSpecifier.t;

// @ts-expect-error Minimal export records omit TypeScript metadata.
minimalExportSpecifier.typeOnly;

// parse is synchronous — no promise in its return type.
const syncImports: ReadonlyArray<Import> = parse('')[0];
syncImports;
// @ts-expect-error parse does not return a promise.
parse('').then;

const minimalSyncImports: ReadonlyArray<MinimalImportSpecifier> = minimalParse('')[0];
minimalSyncImports;
