import type {
  DynamicImport, Export, ImportMetaRef, StaticImport as BaseStaticImport,
} from './lexer.js';

export type * from './lexer.js';
export { init } from './lexer.js';

export interface ImportBinding {
  readonly type: 'named' | 'default' | 'namespace' | 'source';
  readonly importName: string | null;
  readonly localName: string;
  // Named import tokens include quotes and escapes. Other kinds use -1.
  readonly importNameStart: number;
  readonly importNameEnd: number;
  readonly localStart: number;
  readonly localEnd: number;
  readonly typeOnly: boolean;
}

export interface StaticImport extends BaseStaticImport {
  readonly bindings: ReadonlyArray<ImportBinding>;
  // UTF-16 offsets excluding import/type/phase prefixes, from, and trivia.
  // Side-effect imports and reexports have no clause and use -1.
  readonly clauseStart: number;
  readonly clauseEnd: number;
}

export type Import = StaticImport | DynamicImport | ImportMetaRef;

export declare function parse(source: string, name?: string): readonly [
  imports: ReadonlyArray<Import>,
  exports: ReadonlyArray<Export>,
  facade: boolean,
  hasModuleSyntax: boolean
];
