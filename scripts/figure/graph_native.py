"""Typed analytic graph semantics; sampling belongs only to the SVG renderer.

No expression interpreter, domain clipping, or nonfinite-point filtering. The
monotone families allow endpoint validation of the *whole* closed domain.
"""
from dataclasses import dataclass
import math


NATIVE_TYPES = ('exponential', 'logarithm')
NATIVE_FIELDS = {'type', 'base', 'domain', 'amplitude', 'xScale', 'xShift', 'yShift', 'dashed'}
SAMPLE_STEPS = 400


def finite_number(value):
    if (isinstance(value, bool) or not isinstance(value, (int, float))
            or not -10000 <= value <= 10000):
        raise ValueError('Native curve numbers must be finite and within -10000..10000.')
    return float(value)


def interval(value):
    if not isinstance(value, list) or len(value) != 2:
        raise ValueError('Native curve interval must be [min,max].')
    lo, hi = map(finite_number, value)
    if lo >= hi:
        raise ValueError('Native curve interval must be strictly increasing.')
    return lo, hi


def checked(value):
    if not math.isfinite(value):
        raise ValueError('Native curve evaluation is nonfinite.')
    return value


def power(base, exponent):
    try:
        value = math.pow(base, checked(exponent))
    except (OverflowError, ValueError):
        raise ValueError('Native curve power overflow or invalid exponent.') from None
    if value == 0:
        raise ValueError('Native curve power underflow.')
    return checked(value)


@dataclass(frozen=True)
class NativeCurve:
    kind: str
    base: float
    amplitude: float
    x_scale: float
    x_shift: float
    y_shift: float
    domain: tuple

    @classmethod
    def parse(cls, spec, x_range, y_range):
        if not isinstance(spec, dict) or set(spec) - NATIVE_FIELDS:
            raise ValueError('Unsupported native curve fields.')
        if spec.get('type') not in NATIVE_TYPES:
            raise ValueError('Unsupported native curve type.')
        if 'dashed' in spec and not isinstance(spec['dashed'], bool):
            raise ValueError('Native curve dashed must be boolean.')
        base = finite_number(spec.get('base'))
        amplitude = finite_number(spec.get('amplitude', 1))
        scale = finite_number(spec.get('xScale', 1))
        if base <= 0 or base == 1 or amplitude == 0 or scale == 0:
            raise ValueError('Native curve requires base>0, base!=1 and nonzero amplitude/xScale.')
        domain = interval(spec.get('domain'))
        if not x_range[0] <= domain[0] < domain[1] <= x_range[1]:
            raise ValueError('Native curve domain must fit xRange without clipping.')
        curve = cls(spec['type'], base, amplitude, scale,
                    finite_number(spec.get('xShift', 0)),
                    finite_number(spec.get('yShift', 0)), domain)
        for x in domain:
            y = curve.value(x)
            if not y_range[0] <= y <= y_range[1]:
                raise ValueError('Native curve must fit yRange without clipping.')
        return curve

    def value(self, x):
        argument = checked(self.x_scale * (x - self.x_shift))
        if self.kind == 'exponential':
            result = power(self.base, argument)
        else:
            if argument <= 0:
                raise ValueError('Logarithm domain requires xScale*(x-xShift)>0.')
            result = math.log(argument) / math.log(self.base)
        scaled = checked(self.amplitude * result)
        if result != 0 and scaled == 0:
            raise ValueError('Native curve amplitude underflow.')
        return checked(scaled + self.y_shift)

    def inverse(self, y):
        """Only exponentials are horizontal-band boundaries in this contract."""
        if self.kind != 'exponential':
            raise ValueError('Horizontal bands require exponential boundaries.')
        ratio = checked((y - self.y_shift) / self.amplitude)
        if ratio <= 0:
            raise ValueError('Band heights must stay strictly on one side of the asymptote.')
        return checked(math.log(ratio) / math.log(self.base) / self.x_scale + self.x_shift)


def band_boundaries(spec, curves, y_range):
    """Validate the entire band, including an interior minimum of its width.

    An exponential inverse is A*log(abs(y-v))+B. The derivative of
    right-left has at most one zero on a shared valid interval, so endpoints
    plus that critical point prove ordering, rather than a sampled guess.
    """
    if not isinstance(spec, dict) or set(spec) - {'leftCurve', 'rightCurve', 'yRange', 'fill'}:
        raise ValueError('Unsupported horizontal band fields.')
    indexes = [spec.get(key) for key in ('leftCurve', 'rightCurve')]
    if any(isinstance(i, bool) or not isinstance(i, int) or not 0 <= i < len(curves) for i in indexes):
        raise ValueError('Band boundaries must reference existing curve indexes.')
    left, right = (curves[i] for i in indexes)
    if indexes[0] == indexes[1] or any(c is None or c.kind != 'exponential' for c in (left, right)):
        raise ValueError('Bands need two distinct exponential boundaries.')
    lo, hi = interval(spec.get('yRange'))
    if not y_range[0] <= lo < hi <= y_range[1]:
        raise ValueError('Band heights must fit yRange without clipping.')
    for curve in (left, right):
        # Check in y space first: no inverse-roundoff excuse can expand a domain.
        ends = sorted(curve.value(x) for x in curve.domain)
        if not ends[0] <= lo < hi <= ends[1]:
            raise ValueError('Band extends outside a boundary curve domain.')
        curve.inverse(lo)
        curve.inverse(hi)
    probes = [lo, hi]
    a_left = 1 / math.log(left.base) / left.x_scale
    a_right = 1 / math.log(right.base) / right.x_scale
    checked(a_left)
    checked(a_right)
    if a_right != a_left:
        critical = checked((a_right * left.y_shift - a_left * right.y_shift) / (a_right - a_left))
        if lo < critical < hi:
            probes.append(critical)
    if any(right.inverse(y) <= left.inverse(y) for y in probes):
        raise ValueError('Band boundaries cross, touch or are reversed.')
    fill = spec.get('fill', '#eeeeee')
    if (not isinstance(fill, str) or len(fill) != 7 or fill[0] != '#'
            or any(c not in '0123456789abcdefABCDEF' for c in fill[1:])):
        raise ValueError('Band fill must be #RRGGBB.')
    return left, right, (lo, hi), fill


def sample_interval(lo, hi):
    # Preserve supplied endpoints exactly; never drift across a closed domain.
    return [lo] + [lo + (hi - lo) * i / SAMPLE_STEPS for i in range(1, SAMPLE_STEPS)] + [hi]


def sample_screen(function, lo, hi, max_segments=400, tolerance=0.15):
    """Bounded deterministic subdivision in screen pixels (one or two curves).

    Probe quarter/mid/three-quarter positions against each chord. These native
    functions have one curvature sign, with no hidden oscillations. If the
    budget or floating-point resolution cannot resolve a curve, reject it;
    never silently emit a coarse approximation or discard selected samples.
    """
    first, last = function(lo), function(hi)
    stack = [(lo, hi, first, last)]
    result = [first]
    segments = 1
    while stack:
        a, b, start, end = stack.pop()
        middle = a + (b - a) / 2
        if not a < middle < b:
            raise ValueError('Native curve sampling exhausted numeric resolution.')
        probes = [function(a + (b - a) * fraction) for fraction in (0.25, 0.5, 0.75)]
        error = 0
        for sampled in probes:
            for point, p, q in zip(sampled, start, end):
                dx, dy = q[0] - p[0], q[1] - p[1]
                length = math.hypot(dx, dy)
                distance = (abs(dx * (p[1] - point[1]) - (p[0] - point[0]) * dy) / length
                            if length else math.hypot(point[0] - p[0], point[1] - p[1]))
                error = max(error, distance)
        if error <= tolerance:
            result.append(end)
        else:
            segments += 1
            if segments > max_segments:
                raise ValueError('Native curve exceeds the bounded sampling budget; choose a smaller visible domain.')
            stack.append((middle, b, probes[1], end))
            stack.append((a, middle, start, probes[1]))
    return result
