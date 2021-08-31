[
  "syntax"
  "package"
  "option"
  "import"
  "service"
  "rpc"
  "returns"
  "message"
  "enum"
  "oneof"
  "repeated"
  "reserved"
  "to"
  "map"
  "optional"
] @keyword

[
  (key_type)
  (type)
  (message_name)
] @type

(enum_name) @enum
(service_name) @class
(rpc_name) @function
(string) @string

(package
  package_name: (full_ident) @namespace)

(syntax
  "\"proto3\"" @string)

(import
  ["public" "weak"] @keyword)

[
  (int_lit)
  (float_lit)
] @number
 
(field_name) @property

(rpc
  request_type: (message_or_enum_type) @type)

(rpc
  response_type: (message_or_enum_type) @type)

(option
  ("(" (full_ident) @parameter ")"))

(option
  (identifier) @parameter)

(option
  (_)
  (identifier) @parameter)

(field_option
  ("(" (full_ident) @parameter ")"))

(field_option
  (identifier) @parameter)

(field_option
  (_)
  (identifier) @parameter)

(block_lit (identifier) @property)

(constant
  (full_ident) @enumMember)

(enum_field
  enum_member_name: (identifier) @enumMember)

[
  (true)
  (false)
] @keyword

(comment) @comment

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
]  @punctuation.bracket
