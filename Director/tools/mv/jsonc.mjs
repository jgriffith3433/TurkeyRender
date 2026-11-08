// JSON with comments and trailing commas, as Newtonsoft reads the score, keeping where everything came from.
// parse(text, file) gives plain values. where(obj) gives {file, line, keys:{key:line}, dupes:[{key,line,first}]} for any object or array.
const WHERE = new WeakMap();
export const where = (o) => (o && typeof o === 'object' ? WHERE.get(o) : null);
/** For other parsers (the cards' YAML): remember where an object came from. */
export const placed = (o, info) => { WHERE.set(o, info); return o; };

export class JsoncError extends Error {
  constructor(msg, file, line) { super(`${file}:${line}: ${msg}`); this.file = file; this.line = line; this.plain = msg; }
}

export function parse(s, file = '?') {
  let i = 0, line = 1;
  const fail = (m) => { throw new JsoncError(m, file, line); };
  const ws = () => {
    for (;;) {
      const c = s.charCodeAt(i);
      if (c === 10) { line++; i++; } else if (c === 32 || c === 9 || c === 13 || c === 0xfeff) i++;
      else if (c === 47 && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; }
      else if (c === 47 && s[i + 1] === '*') {
        const e = s.indexOf('*/', i + 2); if (e < 0) fail('a /* comment never ends');
        for (let k = i; k < e; k++) if (s.charCodeAt(k) === 10) line++;
        i = e + 2;
      } else return;
    }
  };
  const str = () => {
    const q = s[i]; i++; let o = '', from = i;
    for (;;) {
      const c = s[i];
      if (c === undefined) fail('a string never ends');
      if (c === q) { o += s.slice(from, i); i++; return o; }
      if (c === '\n') line++;
      if (c.charCodeAt(0) === 92) { // backslash
        o += s.slice(from, i); i++;
        const e = s[i++];
        if (e === 'n') o += '\n'; else if (e === 't') o += '\t'; else if (e === 'r') o += '\r'; else if (e === 'b') o += '\b'; else if (e === 'f') o += '\f';
        else if (e === 'u') { o += String.fromCharCode(parseInt(s.slice(i, i + 4), 16)); i += 4; } else o += e;
        from = i;
      } else i++;
    }
  };
  const value = () => {
    ws();
    const c = s[i], at = line;
    if (c === '{') {
      i++; const o = {}, info = { file, line: at, keys: {}, dupes: [] }; WHERE.set(o, info);
      for (;;) {
        ws();
        if (s[i] === '}') { i++; return o; }
        if (s[i] !== '"' && s[i] !== "'") fail(`expected a key in quotes, found ${JSON.stringify(s[i] ?? 'the end of the file')}. A missing comma or brace?`);
        const kl = line, k = str(); ws();
        if (s[i] !== ':') fail(`expected : after "${k}"`);
        i++;
        const v = value();
        if (Object.prototype.hasOwnProperty.call(o, k)) info.dupes.push({ key: k, line: kl, first: info.keys[k] });
        o[k] = v; info.keys[k] = kl; ws();
        if (s[i] === ',') i++; else if (s[i] !== '}') fail(`expected , or } after "${k}". A missing comma?`);
      }
    }
    if (c === '[') {
      i++; const a = []; WHERE.set(a, { file, line: at });
      for (;;) {
        ws();
        if (s[i] === ']') { i++; return a; }
        a.push(value()); ws();
        if (s[i] === ',') i++; else if (s[i] !== ']') fail('expected , or ] in a list. A missing comma?');
      }
    }
    if (c === '"' || c === "'") return str();
    const m = /^(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+|true|false|null)/.exec(s.slice(i, i + 40));
    if (!m) fail(`can't read ${JSON.stringify(s.slice(i, i + 12))}`);
    i += m[0].length;
    return m[0] === 'true' ? true : m[0] === 'false' ? false : m[0] === 'null' ? null : Number(m[0]);
  };
  const v = value(); ws();
  if (i < s.length) fail('extra text after the end of the JSON');
  return v;
}
