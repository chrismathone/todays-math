import re

SIGNS = {'×': r'\times', '÷': r'\div', '−': '-', '－': '-', '＋': '+', '＝': '=', '○': r'\bigcirc', '△': r'\triangle', '□': r'\square', '≤': r'\le', '≥': r'\ge', '≠': r'\ne', '°': r'^\circ', '²': '^2', '³': '^3', '+': '+', '-': '-', '=': '='}
NUMBER = r'\d+(?:,\d{3})*(?:\.\d+)?'
NUMBER_TOKEN = re.compile(rf'({NUMBER})(?:/({NUMBER})|:({NUMBER}))?\s*(%|cm|km|mm|kg|mL|L|g|m)?(?![A-Za-z])')
FRACTION_ARGUMENTS = re.compile(r'\\([dt]?frac)\s*(\{[^{}]+\}|[0-9])\s*(\{[^{}]+\}|[0-9])')
def explicit_fractions(s):
    def fraction(m):
        a,b=m.group(2),m.group(3)
        return '\\'+m.group(1)+(a if a.startswith('{') else '{'+a+'}')+(b if b.startswith('{') else '{'+b+'}')
    return FRACTION_ARGUMENTS.sub(fraction,s)

def meaning(s):
    # Only formatting introduced by this file is decoded. Existing complex TeX
    # stays identical on both sides; no formula simplification is performed.
    s = explicit_fractions(s)
    s = re.sub(r'\\(?:d|t)?frac\{(' + NUMBER + r')\}\{(' + NUMBER + r')\}', r'\1/\2', s)
    s = re.sub(r'\\mathrm\{([A-Za-z]+)\}', r'\1', s)
    for plain, command in SIGNS.items():
        s = s.replace(command, plain)
    s = s.replace('－', '−').replace('-', '−').replace('＋', '+').replace('＝', '=')
    s = s.replace(r'\%', '%').replace(r'\,', '').replace('$', '')
    return re.sub(r'\s+', '', s)

def outside(piece):
    def number(m):
        first, denominator, ratio, suffix = m.groups()
        body = rf'\frac{{{first}}}{{{denominator}}}' if denominator else first + (':' + ratio if ratio else '')
        if suffix == '%':
            body += r'\%'
        elif suffix:
            body += rf'\,\mathrm{{{suffix}}}'
        return '$' + body + '$'
    # Any whitespace consumed without a unit belongs to the surrounding prose.
    def preserve_space(m):
        result = number(m)
        if not m.group(4) and m.group(0).endswith((' ', '\t', '\n')):
            result += m.group(0)[len(m.group(0).rstrip()):]
        return result
    piece = NUMBER_TOKEN.sub(preserve_space, piece)
    def plain(part):
        part = re.sub(r'(?<![A-Za-z])(?:cm|km|mm|kg|mL|L|g|m)(?![A-Za-z])', lambda m: '$\\mathrm{' + m.group(0) + '}$', part)
        # Protect newly wrapped units as well as number/unit pairs.
        bits=re.split(r'(\$[^$]*\$)',part)
        return ''.join(bit if bit.startswith('$') else re.sub('[' + re.escape(''.join(SIGNS)) + ']',lambda m:'$'+SIGNS[m.group(0)]+'$',bit) for bit in bits)
    return ''.join(part if part.startswith('$') else plain(part) for part in re.split(r'(\$[^$]*\$)',piece))

def normalize(s):
    if not isinstance(s, str):
        return s, None
    chunks, i = [], 0
    while i < len(s):
        open_math = s.find('$', i)
        if open_math < 0:
            chunks.append(outside(s[i:]))
            break
        chunks.append(outside(s[i:open_math]))
        close_math = s.find('$', open_math + 1)
        if close_math < 0:
            return s, {'issue': 'unpaired_existing_math'}
        chunks.append('$'+explicit_fractions(s[open_math+1:close_math])+'$')
        i = close_math + 1
    after = ''.join(chunks)
    # Attach an exponent to its visible base and keep adjacent arithmetic in
    # one inline math span. Never concatenate adjacent numeric tokens (12).
    operator = re.compile(r'^(?:\\(?:times|div|cdot|le|ge|ne)|[+\-=^])|(?:\\(?:times|div|cdot|le|ge|ne)|[+\-=])$')
    def join_pair(m):
        left,right=m.groups()
        if right.startswith('^') or operator.search(left) or operator.search(right):
            return '$'+left+' '+right+'$'
        return m.group(0)
    for _ in range(12):
        joined = re.sub(r'\$([^$]+)\$\$([^$]+)\$', join_pair, after)
        if joined == after:break
        after=joined
    if meaning(s) != meaning(after):
        return s, {'issue': 'markup_semantics_not_equal', 'attemptedAfter': after}
    if after == s:
        return s, None
    return after, {'before': s, 'after': after, 'verifiedMeaning': meaning(s), 'method': 'Dollar/KaTeX display markup only; decoded meaning is byte-equal after whitespace removal'}
