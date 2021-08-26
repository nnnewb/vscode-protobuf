import * as vscode from 'vscode';

export function createCompletionOption(
  label: string | vscode.CompletionItemLabel,
  kind: vscode.CompletionItemKind | undefined,
  documentation?: string | vscode.MarkdownString,
  range?: vscode.Range
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(label, kind);
  item.documentation = documentation;
  item.range = range;
  return item;
}

function option(label: string, document?: string): vscode.CompletionItem {
  return createCompletionOption(label, vscode.CompletionItemKind.Property, document);
}

function scalar(label: string, document?: string) {
  return createCompletionOption(label, vscode.CompletionItemKind.Keyword, document);
}

function keyword(label: string): vscode.CompletionItem {
  return createCompletionOption(label, vscode.CompletionItemKind.Keyword);
}

export const keywords = {
  syntax: keyword('syntax'),
  package: keyword('package'),
  option: keyword('option'),
  import: keyword('import'),
  message: keyword('message'),
  enum: keyword('enum'),
  reserved: keyword('reserved'),
  rpc: keyword('rpc'),
  repeated: keyword('repeated'),
  optional: keyword('optional'),
  service: keyword('service'),
};

export const scalarTypes = [
  scalar('bool', `boolean type`),
  scalar(
    'int32',
    `Uses variable-length encoding.\nInefficient for encoding negative numbers – if your field is likely to have negative values, use sint32 instead.`
  ),
  scalar(
    'int64',
    `Uses variable-length encoding.\nInefficient for encoding negative numbers – if your field is likely to have negative values, use sint64 instead.`
  ),
  scalar('uint32', `Uses variable-length encoding.`),
  scalar('uint64', `Uses variable-length encoding.`),
  scalar(
    'sint32',
    `Uses variable-length encoding.\nSigned int value.\nThese more efficiently encode negative numbers than regular int32s.`
  ),
  scalar(
    'sint64',
    `Uses variable-length encoding.\nSigned int value.\nThese more efficiently encode negative numbers than regular int64s.`
  ),
  scalar('fixed32', `Always four bytes.\nMore efficient than uint32 if values are often greater than 2^28.`),
  scalar('fixed64', `Always eight bytes.\nMore efficient than uint64 if values are often greater than 2^56.`),
  scalar('sfixed32', `Always four bytes.`),
  scalar('sfixed64', `Always eight bytes.`),
  scalar('float', ``),
  scalar('double', ``),
  scalar('string', `A string must always contain UTF-8 encoded or 7-bit ASCII text.`),
  scalar('bytes', `May contain any arbitrary sequence of bytes.`),
];

export const documentOptions = [
  option(
    'java_package',
    `Sets the Java package where classes generated from this .proto will be placed.\nBy default, the proto package is used, but this is often inappropriate because proto packages do not normally start with backwards domain names.`
  ),
  option(
    'java_outer_classname',
    `If set, all the classes from the .proto file are wrapped in a single outer class with the given name.\nThis applies to both Proto1 (equivalent to the old "--one_java_file" option) and Proto2 (where a .proto always translates to a single class, but you may want to explicitly choose the class name).`
  ),
  option(
    'java_multiple_files',
    `If set true, then the Java code generator will generate a separate .java file for each top-level message, enum, and service defined in the .proto file.\nThus, these types will *not* be nested inside the outer class named by java_outer_classname.\nHowever, the outer class will still be generated to contain the file's getDescriptor() method as well as any top-level extensions defined in the file.`
  ),
  option(
    'java_generate_equals_and_hash',
    `If set true, then the Java code generator will generate equals() and hashCode() methods for all messages defined in the .proto file.\nThis increases generated code size, potentially substantially for large protos, which may harm a memory-constrained application.\n- In the full runtime this is a speed optimization, as the AbstractMessage base class includes reflection-based implementations of these methods.\n- In the lite runtime, setting this option changes the semantics of equals() and hashCode() to more closely match those of the full runtime; the generated methods compute their results based on field values rather than object identity.\n(Implementations should not assume that hashcodes will be consistent across runtimes or versions of the protocol compiler.)`
  ),
  option(
    'java_string_check_utf8',
    `If set true, then the Java2 code generator will generate code that throws an exception whenever an attempt is made to assign a non-UTF-8 byte sequence to a string field.\nMessage reflection will do the same.\nHowever, an extension field still accepts non-UTF-8 byte sequences.\nThis option has no effect on when used with the lite runtime.`
  ),
  option('optimize_for', `Generated classes can be optimized for speed or code size.`),
  option(
    'go_package',
    `Sets the Go package where structs generated from this .proto will be placed.\nIf omitted, the Go package will be derived from the following: - The basename of the package import path, if provided.\n- Otherwise, the package statement in the .proto file, if present.\n- Otherwise, the basename of the .proto file, without extension.`
  ),
  option(
    'deprecated',
    `Is this file deprecated?\nDepending on the target platform, this can emit Deprecated annotations for everything in the file, or it will be completely ignored; in the very least, this is a formalization for deprecating files.`
  ),
  option(
    'cc_enable_arenas',
    `Enables the use of arenas for the proto messages in this file. This applies only to generated classes for C++.`
  ),
  option(
    'objc_class_prefix',
    `Sets the objective c class prefix which is prepended to all objective c generated classes from this .proto. There is no default.`
  ),
  option('csharp_namespace', `Namespace for generated classes; defaults to the package.`),
];

export const fieldOptions = [
  option(
    'deprecated',
    `Is this file deprecated?\nDepending on the target platform, this can emit Deprecated annotations for everything in the file, or it will be completely ignored; in the very least, this is a formalization for deprecating files.`
  ),
];

export default {
  createCompletionOption,
  keywords,
  scalarTypes,
  documentOptions,
};
