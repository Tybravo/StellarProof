/**
 * Scans a raw JSON string for duplicate object keys using a recursive
 * descent approach. Returns the first duplicate key found, or null if none.
 * Syntax errors are not thrown — they are deferred to the caller's JSON.parse.
 */
function findFirstDuplicateKey(jsonString: string): string | null {
  let pos = 0;
  const len = jsonString.length;

  function skipWhitespace(): void {
    while (pos < len && '\x20\t\n\r'.includes(jsonString[pos])) {
      pos++;
    }
  }

  function parseString(): string {
    pos++; // skip opening "
    let str = '';
    while (pos < len) {
      const ch = jsonString[pos++];
      if (ch === '\\') {
        const escaped = jsonString[pos++];
        if (escaped === 'u') {
          const hex = jsonString.slice(pos, pos + 4);
          pos += 4;
          str += String.fromCharCode(parseInt(hex, 16));
        } else {
          const escapeMap: Record<string, string> = {
            '"': '"', '\\': '\\', '/': '/', b: '\b',
            f: '\f', n: '\n', r: '\r', t: '\t',
          };
          str += escapeMap[escaped] ?? escaped;
        }
      } else if (ch === '"') {
        return str;
      } else {
        str += ch;
      }
    }
    throw new SyntaxError('Unterminated string literal');
  }

  function parseValue(): string | null {
    skipWhitespace();
    if (pos >= len) return null;
    const ch = jsonString[pos];
    if (ch === '{') return parseObject();
    if (ch === '[') return parseArray();
    if (ch === '"') { parseString(); return null; }
    // number, boolean, null — consume until delimiter
    while (pos < len) {
      const c = jsonString[pos];
      if (c === ',' || c === '}' || c === ']' || c === ' ' || c === '\t' || c === '\n' || c === '\r') break;
      pos++;
    }
    return null;
  }

  function parseObject(): string | null {
    pos++; // skip {
    const seenKeys = new Set<string>();

    skipWhitespace();
    if (pos < len && jsonString[pos] === '}') { pos++; return null; }

    while (pos < len) {
      skipWhitespace();
      if (jsonString[pos] !== '"') break;

      const key = parseString();
      if (seenKeys.has(key)) return key; // duplicate detected
      seenKeys.add(key);

      skipWhitespace();
      if (pos < len && jsonString[pos] === ':') pos++;

      const dup = parseValue();
      if (dup !== null) return dup;

      skipWhitespace();
      if (pos < len && jsonString[pos] === ',') {
        pos++;
      } else if (pos < len && jsonString[pos] === '}') {
        pos++;
        return null;
      } else {
        break;
      }
    }
    return null;
  }

  function parseArray(): string | null {
    pos++; // skip [
    skipWhitespace();
    if (pos < len && jsonString[pos] === ']') { pos++; return null; }

    while (pos < len) {
      const dup = parseValue();
      if (dup !== null) return dup;

      skipWhitespace();
      if (pos < len && jsonString[pos] === ',') {
        pos++;
      } else if (pos < len && jsonString[pos] === ']') {
        pos++;
        return null;
      } else {
        break;
      }
    }
    return null;
  }

  try {
    return parseValue();
  } catch {
    return null;
  }
}

class ValidationService {
  findFirstDuplicateKey(jsonString: string): string | null {
    return findFirstDuplicateKey(jsonString);
  }
}

export const validationService = new ValidationService();
