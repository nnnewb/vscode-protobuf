const delimiterRegExp = /[\s{}=;:[\],'"()<>]/g;
const stringDoubleRe = /(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g;
const stringSingleRe = /(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g;

const setCommentRe = /^ *[*/]+ */;
const setCommentAltRe = /^\s*\*?\/*/;
const setCommentSplitRe = /\n/g;
const whitespaceRe = /\s/;
const unescapeRe = /\\(.?)/g;

const unescapeMap: Record<string, string> = {
  '0': '\0',
  r: '\r',
  n: '\n',
  t: '\t',
};

interface Comment {
  text: string;
  type: string;
  lineEmpty: boolean;
  leading: boolean;
}

export class Token {
  constructor(public tok: string, public offset: number) {}

  public get width(): number {
    return this.tok.length;
  }
}

export default class Tokenizer {
  private _offset = 0;
  private length: number;
  private _line: number = 0;
  private lastCommentLine: number = 0;
  private comments: Record<number, Comment> = {};
  private stack: Token[] = [];
  private stringDelimiter: string | null = null;

  constructor(private source: string, private alternateCommentMode?: boolean) {
    this.length = source.length;
  }

  public get row(): number {
    return this._line;
  }

  /**
   * Unescapes a string.
   * @param {string} str String to unescape
   * @returns {string} Unescaped string
   * @property {Object.<string,string>} map Special characters map
   */
  private unescape(str: string): string {
    return str.replace(unescapeRe, function ($0, $1) {
      switch ($1) {
        case '\\':
        case '':
          return $1;
        default:
          return unescapeMap[$1] || '';
      }
    });
  }

  /**
   * Creates an error for illegal syntax.
   * @param {string} subject Subject
   * @returns {Error} Error created
   * @inner
   */
  private illegal(subject: string): Error {
    return Error('illegal ' + subject + ' (line ' + this._line + ')');
  }

  /**
   * Reads a string till its end.
   * @returns {string} String read
   * @inner
   */
  private readString(): string {
    var re = this.stringDelimiter === "'" ? stringSingleRe : stringDoubleRe;
    re.lastIndex = this._offset - 1;
    var match = re.exec(this.source);
    if (!match) {
      throw this.illegal('string');
    }
    const before = this._offset;
    this._offset = re.lastIndex;
    this.push(new Token(this.stringDelimiter!, this._offset));
    this.stringDelimiter = null;
    return unescape(match[1]);
  }

  /**
   * Gets the character at `pos` within the source.
   * @param {number} pos Position
   * @returns {string} Character
   * @inner
   */
  private charAt(pos: number): string {
    return this.source.charAt(pos);
  }

  /**
   * Sets the current comment text.
   * @param {number} start Start offset
   * @param {number} end End offset
   * @param {boolean} isLeading set if a leading comment
   * @inner
   */
  private setComment(start: number, end: number, isLeading: boolean) {
    var comment: Comment = {
      type: this.source.charAt(start++),
      lineEmpty: false,
      leading: isLeading,
      text: '',
    };
    var lookBack;
    if (this.alternateCommentMode) {
      lookBack = 2; // alternate comment parsing: "//" or "/*"
    } else {
      lookBack = 3; // "///" or "/**"
    }
    var commentOffset = start - lookBack,
      c;
    do {
      if (--commentOffset < 0 || (c = this.source.charAt(commentOffset)) === '\n') {
        comment.lineEmpty = true;
        break;
      }
    } while (c === ' ' || c === '\t');
    var lines = this.source.substring(start, end).split(setCommentSplitRe);
    for (var i = 0; i < lines.length; ++i) {
      lines[i] = lines[i].replace(this.alternateCommentMode ? setCommentAltRe : setCommentRe, '').trim();
    }
    comment.text = lines.join('\n').trim();

    this.comments[this._line] = comment;
    this.lastCommentLine = this._line;
  }

  private isDoubleSlashCommentLine(startOffset: number): boolean {
    var endOffset = this.findEndOfLine(startOffset);

    // see if remaining line matches comment pattern
    var lineText = this.source.substring(startOffset, endOffset);
    // look for 1 or 2 slashes since startOffset would already point past
    // the first slash that started the comment.
    var isComment = /^\s*\/{1,2}/.test(lineText);
    return isComment;
  }

  private findEndOfLine(cursor: number): number {
    // find end of cursor's line
    var endOffset = cursor;
    while (endOffset < this.length && this.charAt(endOffset) !== '\n') {
      endOffset++;
    }
    return endOffset;
  }

  /**
   * Pushes a token back to the stack.
   * @param {Token} token Token
   * @inner
   */
  push(token: Token) {
    this.stack.push(token);
  }

  /**
   * Obtains the next token.
   * @returns {string|null} Next token or `null` on eof
   * @inner
   */
  next(): Token | null {
    if (this.stack.length > 0) {
      // return this.stack.shift() || null;
      return this.stack.shift() || null;
    }

    if (this.stringDelimiter) {
      const s = this.readString();
      return new Token(s, this._offset);
    }

    var repeat,
      prev,
      curr,
      start,
      isDoc,
      isLeadingComment = this._offset === 0;

    do {
      if (this._offset === this.length) {
        return null;
      }

      repeat = false;
      while (whitespaceRe.test((curr = this.charAt(this._offset)))) {
        if (curr === '\n') {
          isLeadingComment = true;
          ++this._line;
        }
        if (++this._offset === this.length) {
          return null;
        }
      }

      if (this.charAt(this._offset) === '/') {
        if (++this._offset === this.length) {
          throw this.illegal('comment');
        }
        if (this.charAt(this._offset) === '/') {
          // Line
          if (!this.alternateCommentMode) {
            // check for triple-slash comment
            isDoc = this.charAt((start = this._offset + 1)) === '/';

            while (this.charAt(++this._offset) !== '\n') {
              if (this._offset === this.length) {
                return null;
              }
            }
            ++this._offset;
            if (isDoc) {
              this.setComment(start, this._offset - 1, isLeadingComment);
              // Trailing comment cannot not be multi-line,
              // so leading comment state should be reset to handle potential next comments
              isLeadingComment = true;
            }
            ++this._line;
            repeat = true;
          } else {
            // check for double-slash comments, consolidating consecutive lines
            start = this._offset;
            isDoc = false;
            if (this.isDoubleSlashCommentLine(this._offset)) {
              isDoc = true;
              do {
                this._offset = this.findEndOfLine(this._offset);
                if (this._offset === this.length) {
                  break;
                }
                this._offset++;
                if (!isLeadingComment) {
                  // Trailing comment cannot not be multi-line
                  break;
                }
              } while (this.isDoubleSlashCommentLine(this._offset));
            } else {
              this._offset = Math.min(this.length, this.findEndOfLine(this._offset) + 1);
            }
            if (isDoc) {
              this.setComment(start, this._offset, isLeadingComment);
              isLeadingComment = true;
            }
            this._line++;
            repeat = true;
          }
        } else if ((curr = this.charAt(this._offset)) === '*') {
          /* Block */
          // check for /** (regular comment mode) or /* (alternate comment mode)
          start = this._offset + 1;
          isDoc = this.alternateCommentMode || this.charAt(start) === '*';
          do {
            if (curr === '\n') {
              ++this._line;
            }
            if (++this._offset === this.length) {
              throw this.illegal('comment');
            }
            prev = curr;
            curr = this.charAt(this._offset);
          } while (prev !== '*' || curr !== '/');
          ++this._offset;
          if (isDoc) {
            this.setComment(start, this._offset - 2, isLeadingComment);
            isLeadingComment = true;
          }
          repeat = true;
        } else {
          return new Token('/', this._offset);
        }
      }
    } while (repeat);

    // offset !== length if we got here

    var end = this._offset;
    delimiterRegExp.lastIndex = 0;
    var delim = delimiterRegExp.test(this.charAt(end++));
    if (!delim) {
      while (end < this.length && !delimiterRegExp.test(this.charAt(end))) {
        ++end;
      }
    }
    var token = this.source.substring(this._offset, (this._offset = end));
    if (token === '"' || token === "'") {
      this.stringDelimiter = token;
    }
    return new Token(token, this._offset);
  }

  /**
   * Peeks for the next token.
   * @returns {string|null} Token or `null` on eof
   * @inner
   */
  peek(): Token | null {
    if (!this.stack.length) {
      var token = this.next();
      if (token === null) {
        return null;
      }
      this.push(token);
    }
    return this.stack[0];
  }

  /**
   * Skips a token.
   * @param {string} expected Expected token
   * @param {boolean} [optional=false] Whether the token is optional
   * @returns {boolean} `true` when skipped, `false` if not
   * @throws {Error} When a required token is not present
   * @inner
   */
  skip(expected: string, optional: boolean): boolean {
    var actual = this.peek(),
      equals = actual?.tok === expected;
    if (equals) {
      this.next();
      return true;
    }
    if (!optional) {
      throw this.illegal("token '" + actual + "', '" + expected + "' expected");
    }
    return false;
  }

  /**
   * Gets a comment.
   * @param {number} [trailingLine] Line number if looking for a trailing comment
   * @returns {string|null} Comment text
   * @inner
   */
  cmnt(trailingLine: number): string | null {
    var ret = null;
    var comment;
    if (trailingLine === undefined) {
      comment = this.comments[this._line - 1];
      delete this.comments[this._line - 1];
      if (comment && (this.alternateCommentMode || comment.type === '*' || comment.lineEmpty)) {
        ret = comment.leading ? comment.text : null;
      }
    } else {
      /* istanbul ignore else */
      if (this.lastCommentLine < trailingLine) {
        this.peek();
      }
      comment = this.comments[trailingLine];
      delete this.comments[trailingLine];
      if (comment && !comment.lineEmpty && (this.alternateCommentMode || comment.type === '/')) {
        ret = comment.leading ? null : comment.text;
      }
    }
    return ret;
  }
}
