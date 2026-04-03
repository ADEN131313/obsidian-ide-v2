export enum TokenKind {
  Int = "Int",
  Float = "Float",
  Str = "Str",
  FStr = "FStr",
  Ident = "Ident",
  Keyword = "Keyword",
  Op = "Op",
  Punct = "Punct",
  Eof = "Eof",
}

export type Keyword =
  | "fn"
  | "let"
  | "if"
  | "else"
  | "while"
  | "return"
  | "true"
  | "false"
  | "for"
  | "in"
  | "struct"
  | "enum"
  | "match"
  | "pub"
  | "use";

export type Op =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "="
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "&&"
  | "||"
  | "!"
  | "->"
  | ".."
  | "=>"
  | "|";

export type Punct =
  | "("
  | ")"
  | "{"
  | "}"
  | "["
  | "]"
  | ";"
  | ":"
  | ","
  | "."
  | "::";

const KEYWORDS: Set<string> = new Set([
  "fn",
  "let",
  "if",
  "else",
  "while",
  "return",
  "true",
  "false",
  "for",
  "in",
  "struct",
  "enum",
  "match",
  "pub",
  "use",
]);

export interface Token {
  kind: TokenKind;
  value: string | number;
  pos: number;
  len: number;
}

export function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    // Line comments
    if (source[i] === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    // Whitespace
    if (" \t\n\r".includes(source[i])) {
      i++;
      continue;
    }

    // F-strings: f"..."
    if (source[i] === "f" && i + 1 < source.length && source[i + 1] === '"') {
      const start = i;
      i += 2; // skip f"
      let str = "";
      while (i < source.length && source[i] !== '"') {
        if (source[i] === "\\") {
          i++;
          if (source[i] === "n") str += "\n";
          else if (source[i] === "t") str += "\t";
          else if (source[i] === "\\") str += "\\";
          else if (source[i] === '"') str += '"';
          else if (source[i] === "{") str += "{";
          else if (source[i] === "}") str += "}";
          else str += source[i];
        } else {
          str += source[i];
        }
        i++;
      }
      i++; // skip closing "
      tokens.push({
        kind: TokenKind.FStr,
        value: str,
        pos: start,
        len: i - start,
      });
      continue;
    }

    // Regular strings
    if (source[i] === '"') {
      const start = i;
      i++;
      let str = "";
      while (i < source.length && source[i] !== '"') {
        if (source[i] === "\\") {
          i++;
          if (source[i] === "n") str += "\n";
          else if (source[i] === "t") str += "\t";
          else if (source[i] === "\\") str += "\\";
          else if (source[i] === '"') str += '"';
          else str += source[i];
        } else {
          str += source[i];
        }
        i++;
      }
      i++;
      tokens.push({
        kind: TokenKind.Str,
        value: str,
        pos: start,
        len: i - start,
      });
      continue;
    }

    // Numbers (int and float)
    if (/[0-9]/.test(source[i])) {
      const start = i;
      while (i < source.length && /[0-9]/.test(source[i])) i++;
      if (
        i < source.length &&
        source[i] === "." &&
        i + 1 < source.length &&
        /[0-9]/.test(source[i + 1])
      ) {
        i++;
        while (i < source.length && /[0-9]/.test(source[i])) i++;
        tokens.push({
          kind: TokenKind.Float,
          value: parseFloat(source.slice(start, i)),
          pos: start,
          len: i - start,
        });
      } else {
        tokens.push({
          kind: TokenKind.Int,
          value: parseInt(source.slice(start, i)),
          pos: start,
          len: i - start,
        });
      }
      continue;
    }

    if (/[a-zA-Z_]/.test(source[i])) {
      const start = i;
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) i++;
      const word = source.slice(start, i);
      if (KEYWORDS.has(word)) {
        tokens.push({
          kind: TokenKind.Keyword,
          value: word,
          pos: start,
          len: i - start,
        });
      } else {
        tokens.push({
          kind: TokenKind.Ident,
          value: word,
          pos: start,
          len: i - start,
        });
      }
      continue;
    }

    // Two-char operators and punctuation
    const twoChar = source.slice(i, i + 2);
    if (
      ["==", "!=", "<=", ">=", "&&", "||", "->", "..", "=>", "::"].includes(
        twoChar,
      )
    ) {
      const kind = ["::"].includes(twoChar) ? TokenKind.Punct : TokenKind.Op;
      tokens.push({ kind, value: twoChar, pos: i, len: 2 });
      i += 2;
      continue;
    }

    // Single-char operators
    if ("+-*/%=<>!|".includes(source[i])) {
      tokens.push({ kind: TokenKind.Op, value: source[i], pos: i, len: 1 });
      i++;
      continue;
    }

    // Punctuation (including [ and ])
    if ("(){}[];:,.".includes(source[i])) {
      tokens.push({ kind: TokenKind.Punct, value: source[i], pos: i, len: 1 });
      i++;
      continue;
    }

    i++;
  }

  tokens.push({ kind: TokenKind.Eof, value: "", pos: i, len: 0 });
  return tokens;
}
