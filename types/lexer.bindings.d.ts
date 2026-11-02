import type { DynamicImport, Export, ImportMetaRef, StaticImport as BaseStaticImport } from './lexer.js';
export type * from './lexer.js';
export { init } from './lexer.js';
export interface ImportBinding {
    readonly type: 'named' | 'default' | 'namespace' | 'source';
    readonly importName: string | null;
    readonly localName: string;
    readonly importNameStart: number;
    readonly importNameEnd: number;
    readonly localStart: number;
    readonly localEnd: number;
    readonly typeOnly: boolean;
}
export interface StaticImport extends BaseStaticImport {
    readonly bindings: ReadonlyArray<ImportBinding>;
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
