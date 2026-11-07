// Dialscape GPU scenes: WebGL2 fragment shaders that ray-march 3D worlds (mountains, ocean, dunes, a sea of clouds,
// a studio sculpture, a ringed planet). Every pixel knows how far away it is, so the time can sit at a real depth:
// whatever is nearer than the time's plane becomes the front layer and passes in front of the digits.
// One render gives both layers: colour in RGB, "in front of the time" in alpha.

const COMMON = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uSeed;
uniform vec3 uC0, uC1, uC2, uC3, uAcc;
uniform float uClock;   // distance of the time's plane from the camera
uniform float uFocus;   // where the time sits, as a share of the height from the top
uniform float uTime;
out vec4 fragColor;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
vec3 noised(vec2 x) {
  vec2 i = floor(x), f = fract(x); vec2 u = f * f * (3. - 2. * f); vec2 du = 6. * f * (1. - f);
  float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  return vec3(a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y, du * (vec2(b - a, c - a) + (a - b - c + d) * u.yx));
}
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
const mat2 M2 = mat2(0.8, -0.6, 0.6, 0.8);
float fbm(vec2 p, int oct) { float a = 0.5, s = 0.; for (int i = 0; i < 9; i++) { if (i >= oct) break; s += a * noise(p); p = M2 * p * 2.02; a *= 0.5; } return s; }
float fbm3(vec3 p, int oct) { float a = 0.5, s = 0.; for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * noise3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0., 1.); }
// screen point → ray, with the horizon shifted to height hy (a lens shift keeps verticals straight)
vec3 ray(vec2 fc, vec3 fwd, float fl, float hy) {
  vec2 p = (2. * fc - uRes) / uRes.y;
  vec3 r = normalize(cross(vec3(0, 1, 0), fwd)), u = cross(fwd, r);
  return normalize(r * p.x + u * (p.y - hy) + fwd * fl);
}
// horizon height on screen (-1 bottom .. 1 top) a little below where the time sits
float horizonFor(float below) { return 1. - 2. * (uFocus + below); }
vec3 stars(vec3 rd) {
  vec2 g = rd.xy / (abs(rd.z) + 0.6) * 260.;
  float h = hash12(floor(g) + uSeed);
  float s = smoothstep(0.9965, 1., h) * smoothstep(0.5, 0.0, length(fract(g) - 0.5));
  return vec3(s) * (0.6 + 0.4 * hash12(floor(g) * 1.3));
}
// distance → 0..1 on a log scale (0.05 to 200 units); 1 means sky. Must match depthCode() in gpu.js.
float depthCode(float t) { return t > 1e4 ? 1. : clamp(log(max(t, 0.05) / 0.05) / log(4000.), 0., 0.996); }
void emit(vec3 col, float t, vec2 fc) {
  col = aces(col);
  col = pow(col, vec3(1. / 2.2));
  vec2 q = fc / uRes;
  col *= 0.6 + 0.4 * pow(16. * q.x * q.y * (1. - q.x) * (1. - q.y), 0.18);
  col += (hash12(fc + uSeed * 13.1) - 0.5) / 48.;
  fragColor = vec4(col, depthCode(t));
}
`;

/* ───────────── terrain family (peaks, dunes, clouds) ───────────── */
const TERRAIN = /* glsl */ `
float H(vec2 p, int oct);
float march(vec3 ro, vec3 rd, float tmax) {
  float t = 0.2;
  for (int i = 0; i < 260; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - H(p.xz, 6);
    if (abs(h) < 0.0015 * t || t > tmax) break;
    t += 0.4 * h;
  }
  return t;
}
vec3 terrainNormal(vec3 p, float t) {
  vec2 e = vec2(0.0015 * t, 0);
  return normalize(vec3(H(p.xz - e.xy, 9) - H(p.xz + e.xy, 9), 2. * e.x, H(p.xz - e.yx, 9) - H(p.xz + e.yx, 9)));
}
float softShadow(vec3 ro, vec3 rd) {
  float res = 1., t = 0.05;
  for (int i = 0; i < 40; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - H(p.xz, 5);
    res = min(res, 10. * h / t);
    t += clamp(h, 0.05, 0.6);
    if (res < 0.001 || t > 25.) break;
  }
  return clamp(res, 0., 1.);
}
vec3 skyCol(vec3 rd, vec3 sun) {
  float y = max(rd.y, 0.);
  vec3 col = mix(lin(uC2), lin(uC0), pow(y, 0.45));
  float s = max(dot(rd, sun), 0.);
  col += lin(uC3) * (pow(s, 6.) * 0.45 + pow(s, 64.) * 0.6) + lin(mix(uC3, vec3(1), 0.5)) * pow(s, 1200.) * 12.;
  if (luma(uC0) < 0.08) col += stars(rd) * smoothstep(0.02, 0.25, rd.y) * 0.9;
  return col;
}
`;

const PEAKS = COMMON + TERRAIN + /* glsl */ `
float H(vec2 x, int oct) {
  vec2 p = x * 0.055 + vec2(uSeed * 7.1, uSeed * 3.3);
  float a = 0., b = 1.; vec2 d = vec2(0);
  for (int i = 0; i < 10; i++) { if (i >= oct) break; vec3 n = noised(p); d += n.yz; a += b * n.x / (1. + dot(d, d)); b *= 0.5; p = M2 * p * 2.0; }
  // valleys near the camera, high peaks further off
  float far = smoothstep(8., 28., length(x));
  return (a * 15. - 6.) * (0.12 + 1.25 * far) - 1.5;
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec3 ro = vec3(0., 0., 0.);
  ro.y = max(H(ro.xz, 6), -1.) + 1.6;
  vec3 fwd = normalize(vec3(0.15 * sin(uSeed * 3.), 0., 1.));
  vec3 rd = ray(fc, fwd, 1.9, horizonFor(0.13));
  vec3 sun = normalize(vec3(0.55 * cos(uSeed * 5.), 0.11 + 0.08 * fract(uSeed * 1.7), 1.));
  float tmax = 90.;
  float t = march(ro, rd, tmax);
  vec3 col;
  if (t > tmax) { col = skyCol(rd, sun); t = 1e5; }
  else {
    vec3 p = ro + rd * t, n = terrainNormal(p, t);
    float dif = clamp(dot(n, sun), 0., 1.);
    float sh = dif > 0.001 ? softShadow(p + n * 0.02, sun) : 0.;
    vec3 rock = mix(lin(uC1) * 0.5, vec3(0.1, 0.09, 0.085), 0.7);
    float snow = smoothstep(0.5, 0.8, n.y) * smoothstep(1.5, 3.5, p.y + 1.2 * fbm(p.xz * 2., 3));
    vec3 mat = mix(rock, vec3(0.82, 0.85, 0.9), snow);
    vec3 lightCol = lin(uC3) * 4.2 * dif * sh;
    vec3 amb = mix(lin(uC2), lin(uC0), 0.4) * (0.35 + 0.65 * n.y) * 0.85;
    col = mat * (lightCol + amb);
    float fogAmt = 1. - exp(-0.009 * t);
    vec3 fogCol = mix(lin(uC2), lin(uC3), pow(max(dot(rd, sun), 0.), 6.) * 0.6);
    col = mix(col, fogCol, fogAmt);
  }
  emit(col, t, fc);
}
`;

const DUNES = COMMON + TERRAIN + /* glsl */ `
float H(vec2 x, int oct) {
  vec2 q = x * 0.05 + vec2(uSeed * 4.3, uSeed * 2.1);
  float base = fbm(q * 0.5, 4) * 5.;
  float w = q.x * 1.2 + q.y * 0.25 + fbm(q * 0.7, 4) * 3.2;
  float s = fract(w * 0.45);
  float ridge = s < 0.7 ? s / 0.7 : (1. - s) / 0.3;        // long windward slope, steep slip face
  ridge = smoothstep(0., 1., ridge) * (0.45 + 0.55 * noise(q * 0.8));
  float h = base + ridge * 3.4 - 4.2;
  if (oct > 6) h += (noise(x * 9.) - 0.5) * 0.012;   // wind ripples, only in the shading
  return h;
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec3 ro = vec3(0.);
  ro.y = H(ro.xz, 6) + 1.3;
  vec3 fwd = normalize(vec3(0.2 * sin(uSeed * 2.3), 0., 1.));
  vec3 rd = ray(fc, fwd, 1.8, horizonFor(0.035));
  vec3 sun = normalize(vec3(-0.9 * sign(sin(uSeed * 9.) + 0.1), 0.09, 0.7));
  float tmax = 80.;
  float t = march(ro, rd, tmax);
  vec3 col;
  if (t > tmax) { col = skyCol(rd, sun); t = 1e5; }
  else {
    vec3 p = ro + rd * t, n = terrainNormal(p, t);
    float dif = clamp(dot(n, sun), 0., 1.);
    float sh = dif > 0.001 ? softShadow(p + n * 0.02, sun) : 0.;
    vec3 sand = lin(mix(vec3(0.86, 0.6, 0.38), uC3, 0.25)) * 0.8;
    vec3 lightCol = lin(mix(uC3, vec3(1., 0.85, 0.6), 0.4)) * 3.6 * dif * sh;
    vec3 amb = lin(uC1) * (0.3 + 0.7 * n.y) * 0.35;
    col = sand * (lightCol + amb);
    col += lin(uC3) * pow(clamp(1. + dot(rd, n), 0., 1.), 4.) * 0.15 * dif;
    col = mix(col, mix(lin(uC2), lin(uC3), 0.3), 1. - exp(-0.014 * t));
  }
  emit(col, t, fc);
}
`;

const CLOUDS = COMMON + TERRAIN + /* glsl */ `
float H(vec2 x, int oct) {
  vec2 p = x * 0.16 + vec2(uSeed * 3.7, uSeed * 1.9);
  p *= 0.55;
  vec2 warp = vec2(fbm(p + 3.1, 3), fbm(p + 7.7, 3));
  float a = fbm(p + warp * 1.4, min(oct, 4));   // few octaves: soft, rounded billows rather than rock
  float puff = smoothstep(0.32, 0.78, a);
  return sqrt(puff) * 2.4 - 2.1;
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec3 ro = vec3(0., 1.5, 0.);
  vec3 fwd = normalize(vec3(0.15 * sin(uSeed * 2.), 0., 1.));
  vec3 rd = ray(fc, fwd, 1.9, horizonFor(0.035));
  vec3 sun = normalize(vec3(0.5 * cos(uSeed * 4.), 0.07 + 0.06 * fract(uSeed * 2.3), 1.));
  float tmax = 110.;
  float t = march(ro, rd, tmax);
  vec3 col;
  if (t > tmax) { col = skyCol(rd, sun); t = 1e5; }
  else {
    vec3 p = ro + rd * t, n = terrainNormal(p, t);
    float dif = clamp(dot(n, sun) * 0.8 + 0.2, 0., 1.);
    float sss = pow(clamp(dot(rd, sun), 0., 1.), 3.) * 0.8;          // light glowing through the cloud
    float sh = softShadow(p + n * 0.03, sun) * 0.75 + 0.25;
    float hgt = smoothstep(-2.1, 0.3, p.y);
    vec3 cloud = mix(lin(mix(uC1, vec3(0.45, 0.5, 0.6), 0.5)) * 0.55, lin(mix(uC3, vec3(1), 0.7)) * 2.2, dif * sh) * (0.45 + 0.55 * hgt);
    cloud += lin(uC3) * sss * 1.4;
    col = cloud;
    // the valleys between billows fill with mist
    col = mix(col, lin(mix(uC2, vec3(0.8, 0.82, 0.88), 0.5)) * 0.9, (1. - hgt) * 0.55);
    col = mix(col, mix(lin(uC2), lin(uC3), pow(max(dot(rd, sun), 0.), 4.) * 0.7), 1. - exp(-0.016 * t));
  }
  emit(col, t, fc);
}
`;

/* ───────────── ocean ───────────── */
const OCEAN = COMMON + /* glsl */ `
const float SEA_H = 0.6, SEA_CHOP = 4.0, SEA_FREQ = 0.16;
const mat2 OCT = mat2(1.6, 1.2, -1.2, 1.6);
float seaOct(vec2 uv, float choppy) {
  uv += noise(uv) * 2. - 1.;
  vec2 wv = 1. - abs(sin(uv)), swv = abs(cos(uv));
  wv = mix(wv, swv, wv);
  return pow(1. - pow(wv.x * wv.y, 0.65), choppy);
}
float sea(vec3 p, int iter) {
  float freq = SEA_FREQ, amp = SEA_H, choppy = SEA_CHOP, h = 0.;
  vec2 uv = p.xz; uv.x *= 0.75;
  float T = uTime * 0.8 + uSeed * 10.;
  for (int i = 0; i < 6; i++) {
    if (i >= iter) break;
    float d = seaOct((uv + T) * freq, choppy) + seaOct((uv - T) * freq, choppy);
    h += d * amp;
    uv *= OCT; freq *= 1.9; amp *= 0.22; choppy = mix(choppy, 1., 0.2);
  }
  return p.y - h;
}
float trace(vec3 ro, vec3 rd, out vec3 p) {
  float tm = 0., tx = 1000.;
  float hx = sea(ro + rd * tx, 3);
  if (hx > 0.) { p = ro + rd * tx; return 1e5; }
  float hm = sea(ro, 3), tmid = 0.;
  for (int i = 0; i < 10; i++) {
    tmid = mix(tm, tx, hm / (hm - hx));
    p = ro + rd * tmid;
    float hmid = sea(p, 3);
    if (hmid < 0.) { tx = tmid; hx = hmid; } else { tm = tmid; hm = hmid; }
  }
  return tmid;
}
vec3 skyCol(vec3 rd, vec3 sun) {
  float y = max(rd.y, 0.);
  vec3 col = mix(lin(uC2), lin(uC0), pow(y, 0.4));
  float s = max(dot(rd, sun), 0.);
  col += lin(uC3) * (pow(s, 5.) * 0.5 + pow(s, 80.) * 0.7) + lin(mix(uC3, vec3(1), 0.6)) * smoothstep(0.9993, 0.9996, s) * 6.;
  // soft cloud streaks
  float c = fbm(rd.xz / (rd.y + 0.08) * 1.6 + uSeed, 5);
  col = mix(col, lin(mix(uC1, uC3, 0.35)) * (0.6 + s), smoothstep(0.5, 0.85, c) * 0.5 * smoothstep(0.0, 0.2, rd.y));
  if (luma(uC0) < 0.08) col += stars(rd) * smoothstep(0.05, 0.3, rd.y);
  return col;
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec3 ro = vec3(0., 3.2, 0.);
  vec3 rd = ray(fc, vec3(0, 0, 1), 1.9, horizonFor(0.1));
  vec3 sun = normalize(vec3(0.25 * sin(uSeed * 3.), 0.06 + 0.04 * fract(uSeed * 3.1), 1.));
  vec3 p;
  float t = trace(ro, rd, p);
  vec3 sky = skyCol(rd, sun);
  vec3 col = sky;
  if (t < 1e4) {
    vec3 dist = p - ro;
    float e = dot(dist, dist) * (0.12 / uRes.x);
    float h0 = sea(p, 5);
    vec3 n = normalize(vec3(sea(vec3(p.x + e, p.y, p.z), 5) - h0, e, sea(vec3(p.x, p.y, p.z + e), 5) - h0));
    float fres = pow(clamp(1. - dot(n, -rd), 0., 1.), 3.) * 0.65;
    vec3 refl = skyCol(reflect(rd, n), sun);
    vec3 deep = lin(uC0) * 0.35, water = lin(mix(uC2, uC1, 0.5)) * 0.6;
    vec3 refr = deep + pow(dot(n, sun) * 0.4 + 0.6, 80.) * water * 0.12;
    vec3 sc = mix(refr, refl, fres);
    sc += water * (p.y - SEA_H) * 0.18 * max(1. - dot(dist, dist) * 0.001, 0.);
    float spec = pow(max(dot(reflect(rd, n), sun), 0.), 90.) * (90. + 8.) / 25.;
    sc += lin(mix(uC3, vec3(1), 0.5)) * spec;
    col = mix(sky, sc, pow(smoothstep(0., -0.02, rd.y), 0.25));
  }
  emit(col, t, fc);
}
`;

/* ───────────── studio sculpture ───────────── */
const SCULPTURE = COMMON + /* glsl */ `
float sdBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xy) - t.x, p.z)) - t.y; }
vec3 P0, P1, P2, P3;  // object places, set from the seed
vec2 map(vec3 p) {
  vec2 res = vec2(p.y, 0.);
  float d = length(p - P0) - P0.y;                                  // big sphere resting on the floor
  if (d < res.x) res = vec2(d, 1.);
  d = sdTorus(p - P1, vec2(1.15, 0.24));                            // an arch standing up
  if (d < res.x) res = vec2(d, 2.);
  d = sdBox(p - P2, vec3(0.32, P2.y, 0.32), 0.08);                  // a column
  if (d < res.x) res = vec2(d, 3.);
  d = length(p - P3) - P3.y;                                        // a small sphere in front
  if (d < res.x) res = vec2(d, 4.);
  return res;
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0008, 0);
  return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x));
}
float shadow(vec3 ro, vec3 rd) {
  float res = 1., t = 0.02;
  for (int i = 0; i < 64; i++) { float h = map(ro + rd * t).x; res = min(res, 12. * h / t); t += clamp(h, 0.01, 0.3); if (res < 0.001 || t > 14.) break; }
  return clamp(res, 0., 1.);
}
float ao(vec3 p, vec3 n) {
  float occ = 0., s = 1.;
  for (int i = 0; i < 5; i++) { float h = 0.02 + 0.12 * float(i); occ += (h - map(p + h * n).x) * s; s *= 0.9; }
  return clamp(1. - 2.4 * occ, 0., 1.);
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  float s = uSeed;
  P0 = vec3(-0.9 + 0.6 * sin(s * 3.), 1.25, 3.2);
  P1 = vec3(1.0 + 0.4 * cos(s * 2.), 0.15, 5.5);
  P2 = vec3(1.6 + 0.3 * sin(s * 5.), 1.7, 1.3);
  P3 = vec3(-0.5 + 0.7 * cos(s * 7.), 0.42, -0.6);
  vec3 ro = vec3(0., 1.5, -5.);
  vec3 rd = ray(fc, normalize(vec3(0., -0.05, 1.)), 1.7, horizonFor(0.18) * 0.4);
  vec3 key = normalize(vec3(-0.6 + 0.4 * sin(s), 0.75, -0.35));
  vec3 bgTop = lin(uC1) * 0.9, bgLow = lin(mix(uC1, uC2, 0.5)) * 1.1;
  vec3 col = mix(bgLow, bgTop, smoothstep(-0.3, 0.6, rd.y));
  float t = 0.; vec2 h = vec2(0);
  for (int i = 0; i < 160; i++) { h = map(ro + rd * t); if (h.x < 0.0005 * t || t > 40.) break; t += h.x; }
  if (t < 40.) {
    vec3 p = ro + rd * t, n = normalAt(p);
    vec3 mat = h.y < 0.5 ? lin(mix(uC1, uC2, 0.35)) * 1.1 : h.y < 1.5 ? lin(uAcc) : h.y < 2.5 ? lin(uC3) : h.y < 3.5 ? lin(uC2) * 1.2 : lin(mix(uC3, vec3(1), 0.6));
    float gloss = h.y < 0.5 ? 0.15 : h.y < 1.5 ? 1. : h.y < 2.5 ? 0.5 : h.y < 3.5 ? 0.25 : 0.9;
    float dif = clamp(dot(n, key), 0., 1.) * shadow(p + n * 0.003, key);
    float occ = ao(p, n);
    vec3 r = reflect(rd, n);
    float spec = pow(clamp(dot(r, key), 0., 1.), 40. + 160. * gloss) * gloss;
    float fre = pow(clamp(1. + dot(n, rd), 0., 1.), 4.);
    vec3 env = mix(bgLow, bgTop, smoothstep(-0.2, 0.7, r.y));
    col = mat * (dif * 2.4 * lin(mix(uC3, vec3(1), 0.7)) + occ * (0.35 + 0.25 * n.y) * env * 1.4);
    col += spec * 3. * lin(mix(uC3, vec3(1), 0.8));
    col += fre * env * gloss * occ * 0.8;
    // the floor melts into the backdrop (an endless studio sweep)
    col = mix(col, mix(bgLow, bgTop, smoothstep(-0.3, 0.6, rd.y)), smoothstep(9., 26., t));
  } else t = 1e5;
  emit(col * 1.25, t, fc);
}
`;

/* ───────────── ringed planet ───────────── */
const PLANET = COMMON + /* glsl */ `
vec2 sphere(vec3 ro, vec3 rd, vec3 c, float r) {
  vec3 oc = ro - c; float b = dot(oc, rd), q = dot(oc, oc) - r * r, h = b * b - q;
  if (h < 0.) return vec2(-1.); h = sqrt(h); return vec2(-b - h, -b + h);
}
void main() {
  vec2 fc = gl_FragCoord.xy;
  float s = uSeed;
  vec3 ro = vec3(0.);
  vec3 rd = ray(fc, vec3(0, 0, 1), 1.6, 0.);
  vec3 C = vec3(1.3 * sign(sin(s * 4.) + 0.2), 2. * (0.5 - uFocus) - 0.9, 10.);
  float R = 3.1;
  vec3 sun = normalize(vec3(-sign(C.x) * 0.9, 0.35, -0.25));
  vec3 ringN = normalize(vec3(0.15 * sin(s * 3.), 1., -0.42));
  // space
  vec3 col = lin(uC0) * 0.08 + stars(rd) * 0.9;
  col += lin(mix(uC1, uC2, 0.5)) * pow(fbm(rd.xy * 3. + s, 5), 3.) * 0.5;
  float t = 1e5, front = 0.;
  vec3 frontCol = vec3(0);
  vec2 hit = sphere(ro, rd, C, R);
  // atmosphere halo round the limb
  vec3 oc = C - ro; float closest = length(cross(oc, rd)) - R;
  col += lin(uC3) * exp(-max(closest, 0.) * 5.) * 0.55 * clamp(dot(normalize(ro + rd * dot(oc, rd) - C), sun) + 0.4, 0., 1.);
  float tP = hit.x > 0. ? hit.x : 1e5;
  if (tP < 1e5) {
    vec3 p = ro + rd * tP, n = normalize(p - C);
    vec3 q = n;
    float lat = q.y + 0.08 * fbm(q.xz * 5. + s, 5);
    float bands = 0.5 + 0.25 * sin(lat * 11. + s) + 0.15 * sin(lat * 27. + 2. * s) + 0.1 * (fbm(vec2(lat * 30., q.x * 2.) + s, 4) - 0.5) * 2.;
    vec3 surf = mix(lin(mix(uC1, uC2, 0.4)), lin(mix(uC3, vec3(1), 0.15)), smoothstep(0.2, 0.85, bands));
    surf = mix(surf, lin(uAcc), smoothstep(0.62, 0.7, fbm(q.zy * 3. + s * 2., 4)) * 0.25);
    float dif = clamp(dot(n, sun), 0., 1.);
    float term = smoothstep(-0.1, 0.25, dot(n, sun));
    float rim = pow(1. - clamp(dot(n, -rd), 0., 1.), 3.);
    col = surf * (dif * 2.2 + 0.03) * term + lin(uC3) * rim * 0.8 * term + lin(uC2) * rim * 0.15;
    t = tP;
  }
  // rings: a banded disc through the planet's centre, shadowed by the planet
  float dn = dot(rd, ringN);
  if (abs(dn) > 1e-4) {
    float tr = dot(C - ro, ringN) / dn;
    if (tr > 0.) {
      vec3 p = ro + rd * tr; float r = length(p - C) / R;
      if (r > 1.35 && r < 2.35) {
        float band = noise(vec2(r * 42., s)) * 0.6 + noise(vec2(r * 9., s + 3.)) * 0.4;
        float a = smoothstep(1.35, 1.45, r) * smoothstep(2.35, 2.2, r) * (0.25 + 0.75 * band);
        a *= 1. - 0.6 * smoothstep(1.8, 1.85, r) * smoothstep(1.92, 1.87, r);   // a gap
        vec2 sh = sphere(p, sun, C, R);
        float lit = sh.x > 0. ? 0.15 : 1.;
        vec3 rc = mix(lin(uC3), lin(uAcc), band) * (0.5 + 1.6 * lit) * (0.6 + 0.4 * abs(dot(ringN, sun)));
        if (tr < tP) {
          col = mix(col, rc, a);
          front = max(front, a);
          t = min(t, tr);
        } else if (tP >= 1e5) col = mix(col, rc, a);
      }
    }
  }
  // depth: the planet, or the rings where they're dense enough to hide what's behind
  float td = front > 0.45 ? min(t, tP) : tP;
  vec3 c = aces(col); c = pow(c, vec3(1. / 2.2));
  vec2 qv = fc / uRes;
  c *= 0.6 + 0.4 * pow(16. * qv.x * qv.y * (1. - qv.x) * (1. - qv.y), 0.18);
  c += (hash12(fc + s * 13.1) - 0.5) / 48.;
  fragColor = vec4(c, depthCode(td));
}
`;

export const GPU_SCENES = {
  peaks: { name: "Peaks", src: PEAKS, near: 3, far: 40, depth: 0.62, fallback: "pines", dark: true },
  ocean: { name: "Ocean", src: OCEAN, near: 1e4, far: 1e4, depth: 0.5, horizon: 0.1, fallback: "sea", dark: true },
  dunes: { name: "Dunes", src: DUNES, near: 2, far: 30, depth: 0.72, fallback: "retro", dark: true },
  clouds: { name: "Cloud sea", src: CLOUDS, near: 3, far: 50, depth: 0.72, fallback: "borealis", dark: true },
  sculpture: { name: "Sculpture", src: SCULPTURE, near: 4, far: 11, depth: 0.55, fallback: "bloom" },
  planet: { name: "Ringed planet", src: PLANET, near: 4, far: 9, depth: 0.6, fallback: "star", dark: true },
};

/* ───────────── WebGL plumbing ───────────── */
let gl = null, glCanvas = null, failed = false;
const programs = new Map();
const VERT = `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }`;

function context() {
  if (failed) return null;
  if (gl && !gl.isContextLost()) return gl;
  try {
    glCanvas = document.createElement("canvas");
    gl = glCanvas.getContext("webgl2", { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, alpha: true, powerPreference: "high-performance" });
    if (!gl) { failed = true; return null; }
    glCanvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); programs.clear(); gl = null; });
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    programs.clear();
    return gl;
  } catch { failed = true; return null; }
}

function program(id) {
  if (programs.has(id)) return programs.get(id);
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${id}: ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, GPU_SCENES[id].src));
  gl.bindAttribLocation(p, 0, "a");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`${id}: ${gl.getProgramInfoLog(p)}`);
  const u = {};
  for (const name of ["uRes", "uSeed", "uC0", "uC1", "uC2", "uC3", "uAcc", "uClock", "uFocus", "uTime"]) u[name] = gl.getUniformLocation(p, name);
  const entry = { p, u };
  programs.set(id, entry);
  return entry;
}

export const gpuAvailable = () => !!context();
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/** Distance (scene units) ↔ the 0–255 depth code the shaders write. */
export const depthCode = (t) => Math.round(Math.min(0.996, Math.max(0, Math.log(Math.max(t, 0.05) / 0.05) / Math.log(4000))) * 255);
export const depthDistance = (code) => 0.05 * Math.pow(4000, code / 255);

/**
 * Renders a GPU scene at w×h. Returns { back, small, depth, rw, rh }: the back layer, the same at render size, and a
 * per-pixel depth map (render size) that front layers are cut from,
 * or null when WebGL2 isn't available (callers then use the 2D fallback scene).
 * opts: { pal, seedValue (0–100), focus (0–1 from top), depth (0–1), time (s) }
 */
export function renderGpu(id, w, h, opts, makeCanvas) {
  const sc = GPU_SCENES[id];
  if (!sc || !context()) return null;
  let entry;
  try { entry = program(id); } catch (e) { console.error(e); return null; }
  // stay inside the GPU's limits; larger sizes are drawn smaller and scaled up
  const max = Math.min(gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0], gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1], 4096);
  const k = Math.min(1, max / Math.max(w, h));
  const rw = Math.max(2, Math.round(w * k)), rh = Math.max(2, Math.round(h * k));
  glCanvas.width = rw; glCanvas.height = rh;
  gl.viewport(0, 0, rw, rh);
  gl.useProgram(entry.p);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const { u } = entry, p = opts.pal;
  gl.uniform2f(u.uRes, rw, rh);
  gl.uniform1f(u.uSeed, opts.seedValue);
  gl.uniform3fv(u.uC0, rgb(p.bg[0])); gl.uniform3fv(u.uC1, rgb(p.bg[1])); gl.uniform3fv(u.uC2, rgb(p.bg[2])); gl.uniform3fv(u.uC3, rgb(p.bg[3]));
  gl.uniform3fv(u.uAcc, rgb(p.accent));
  const d = opts.depth ?? sc.depth;
  gl.uniform1f(u.uClock, sc.near * Math.pow(sc.far / sc.near, d));
  gl.uniform1f(u.uFocus, opts.focus);
  gl.uniform1f(u.uTime, opts.time ?? 0);
  // drawn in strips so no single draw runs long enough to trip the GPU watchdog on phones
  gl.enable(gl.SCISSOR_TEST);
  const strip = Math.max(64, Math.ceil(rh / Math.ceil((rw * rh) / 400000)));
  for (let y = 0; y < rh; y += strip) {
    gl.scissor(0, y, rw, Math.min(strip, rh - y));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.flush();
  }
  gl.disable(gl.SCISSOR_TEST);
  if (gl.isContextLost()) return null;
  // read once: colour becomes the back layer, alpha is the depth map the front layer is cut from
  const px = new Uint8Array(rw * rh * 4);
  gl.readPixels(0, 0, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const img = new ImageData(rw, rh);
  const depth = new Uint8Array(rw * rh);
  const row = rw * 4;
  for (let y = 0; y < rh; y++) img.data.set(px.subarray((rh - 1 - y) * row, (rh - y) * row), y * row);
  const pd = img.data;
  for (let i = 0, j = 0; i < pd.length; i += 4, j++) { depth[j] = pd[i + 3]; pd[i + 3] = 255; }
  const small = makeCanvas(rw, rh);
  small.getContext("2d").putImageData(img, 0, 0);
  let back = small;
  if (rw !== w || rh !== h) {
    back = makeCanvas(w, h);
    const bx = back.getContext("2d");
    bx.imageSmoothingQuality = "high";
    bx.drawImage(small, 0, 0, w, h);
  }
  return { back, small, depth, rw, rh };
}
