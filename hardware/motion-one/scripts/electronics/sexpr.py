"""Minimal S-expression reader/writer for KiCad files."""
class Q(str):
    """Quoted string atom."""

def parse(text):
    i, n = 0, len(text)
    stack, cur = [], []
    while i < n:
        c = text[i]
        if c in ' \t\r\n':
            i += 1
        elif c == '(':
            stack.append(cur); cur = []; i += 1
        elif c == ')':
            done = cur; cur = stack.pop(); cur.append(done); i += 1
        elif c == '"':
            j = i + 1; buf = []
            while text[j] != '"':
                if text[j] == '\\':
                    buf.append(text[j:j + 2]); j += 2
                else:
                    buf.append(text[j]); j += 1
            cur.append(Q(''.join(buf))); i = j + 1
        else:
            j = i
            while j < n and text[j] not in ' \t\r\n()':
                j += 1
            cur.append(text[i:j]); i = j
    return cur[0]

def dump(node, ind=0):
    if isinstance(node, list):
        simple = all(not isinstance(x, list) for x in node)
        if simple:
            return '(' + ' '.join(dump(x) for x in node) + ')'
        out = '(' + ' '.join(dump(x) for x in node if not isinstance(x, list))
        for x in node:
            if isinstance(x, list):
                out += '\n' + '\t' * (ind + 1) + dump(x, ind + 1)
        return out + '\n' + '\t' * ind + ')'
    if isinstance(node, Q):
        return '"' + node + '"'
    return str(node)

def find(node, key):
    return [x for x in node if isinstance(x, list) and x and x[0] == key]
