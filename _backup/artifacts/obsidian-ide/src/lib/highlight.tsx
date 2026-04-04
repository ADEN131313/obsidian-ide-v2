import React from "react";

export function HighlightObsidian({ code }: { code: string }) {
  const tokens: React.ReactNode[] = [];
  const tokenRegex =
    /(\/\/.*)|(f".*?"|"[^"\\]*(?:\\.[^"\\]*)*")|(\b(?:fn|let|if|else|while|return|true|false|for|in|struct|enum|match|pub|use)\b)|(\b(?:i64|f64|bool|string)\b)|(\b\d+(?:\.\d+)?\b)|(->|\.\.|=>|::|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!|])|([a-zA-Z_]\w*\s*\()|([a-zA-Z_]\w*)|(\s+)|([\s\S])/g;

  let result;
  let key = 0;
  while ((result = tokenRegex.exec(code)) !== null) {
    if (result[0].length === 0) {
      tokenRegex.lastIndex++;
      continue;
    }

    const [, comment, str, kw, ty, num, op, fn, ident, ws, other] = result;
    if (comment)
      tokens.push(
        <span key={key++} className="syntax-comment">
          {comment}
        </span>,
      );
    else if (str)
      tokens.push(
        <span key={key++} className="syntax-string">
          {str}
        </span>,
      );
    else if (kw)
      tokens.push(
        <span key={key++} className="syntax-keyword">
          {kw}
        </span>,
      );
    else if (ty)
      tokens.push(
        <span key={key++} className="syntax-type">
          {ty}
        </span>,
      );
    else if (num)
      tokens.push(
        <span key={key++} className="syntax-number">
          {num}
        </span>,
      );
    else if (op)
      tokens.push(
        <span key={key++} className="syntax-op">
          {op}
        </span>,
      );
    else if (fn)
      tokens.push(
        <span key={key++} className="syntax-fn">
          {fn.slice(0, -1)}
        </span>,
      );
    else if (ident)
      tokens.push(
        <span key={key++} className="syntax-default">
          {ident}
        </span>,
      );
    else if (ws) tokens.push(<span key={key++}>{ws}</span>);
    else if (other)
      tokens.push(
        <span key={key++} className="syntax-default">
          {other}
        </span>,
      );
  }

  return <>{tokens}</>;
}
