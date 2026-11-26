import { useEffect, useRef } from "react";

/**
 * The app's living backdrop. In the dark theme: deep space with drifting, twinkling stars, the Earth turning slowly (the day side in muted blues,
 * the night side lit by its cities, a blue atmosphere around it) and two orbits of light, each with a spark running along it, like the
 * menu backgrounds of a space strategy game. OneTrack's arrow, made a small 3D ship with a burning thruster, flies round the Earth on
 * the blue orbit: it weaves a little up and down and side to side, banks into the turn, grows as it passes in front and shrinks as it
 * goes round the back, and shows its tail and engine as it flies away. The globe leans a little toward the pointer (parallax) on a
 * computer. In the light theme the same space holds the Earth by day: vivid true colours, crisp white clouds, the night side with its
 * cities along the lower right edge, a bright blue atmosphere, and the Milky Way across the sky behind it.
 *
 * The scene is one small WebGL fragment shader on a single canvas (no 3D library): a ray hits a sphere per pixel and reads
 * NASA's public-domain day and night textures (public/backgrounds/earth-*.jpg), wrapped around it and turned with time. It runs at a
 * low frame rate and resolution (lower on a phone), stops while the tab is hidden, and is a still picture for anyone who asked their
 * device for less motion. Without WebGL it draws nothing and the dark wallpaper under it stays. The ship is a real model drawn over it
 * (twelve faces, lit like the planet) and its thruster a glow beside it; the planet hides both when the ship is behind it.
 */

const VERTEX = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
#define OCTAVES __OCTAVES__
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uParallax;
uniform vec3 uGlobe;
uniform sampler2D uDay;
uniform sampler2D uNight;
// 1 for the light theme: the Earth by day (with the Milky Way behind it) instead of at night; both in deep space.
uniform float uLight;

const float PI = 3.14159265;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

// Smooth 3D noise and its fractal sum: the cloud cover, worked out on the sphere itself so it has no seam.
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x);
  float b = mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x);
  float c = mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x);
  float d = mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x);
  return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int k = 0; k < OCTAVES; k++) {
    v += a * noise3(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

// One layer of stars: a grid where some cells hold a star, drifting sideways, each twinkling at its own pace.
vec3 stars(vec2 uv, float scale, float drift, float threshold) {
  vec2 g = uv * scale + vec2(uTime * drift, 0.0);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id);
  if (h < threshold) return vec3(0.0);
  vec2 offset = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
  float d = length(f - offset * 0.7);
  float size = 0.04 + 0.06 * hash(id + 1.9);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + 2.0 * hash(id + 5.3)) + h * 6.2831);
  vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.95, 0.85), hash(id + 9.1));
  return tint * (1.0 - smoothstep(0.0, size, d)) * twinkle;
}

// A tilted orbit around the globe: its glowing line, and a spark with a fading tail running along it. Returns the light and whether
// the point is on the near half (drawn over the globe) or the far half (hidden behind it).
vec4 orbit(vec2 uv, vec2 c, float radius, float flatness, float angle, float speed, float phase, vec3 color, vec3 sparkColor) {
  vec2 q = uv - c;
  float s = sin(-angle), co = cos(-angle);
  q = vec2(co * q.x - s * q.y, s * q.x + co * q.y);
  q.y /= flatness;
  float len = length(q);
  float theta = atan(q.y, q.x);
  float sd = abs(len - radius) * length(vec2(cos(theta), flatness * sin(theta)));
  float line = exp(-pow(sd / 0.0022, 2.0)) * 0.55 + exp(-sd / 0.012) * 0.10;
  float head = mod(uTime * speed + phase, 2.0 * PI);
  float behind = mod(head - theta, 2.0 * PI);
  // The tail fades slowly behind the head and the light falls off quickly just ahead of it, so there is no hard edge at the head.
  float ahead = 2.0 * PI - behind;
  float trail = behind < PI ? exp(-behind * 3.5) : exp(-ahead * 60.0);
  float spark = trail * (exp(-pow(sd / 0.003, 2.0)) * 1.6 + exp(-sd / 0.02) * 0.45);
  spark += exp(-min(behind, ahead) * 60.0) * exp(-sd / 0.01) * 1.4;
  vec3 light = color * line + sparkColor * spark;
  return vec4(light, q.y < 0.0 ? 1.0 : 0.0);
}

// The Milky Way across the upper left of the sky (in the light theme): a soft band of violet, blue and warm haze, mottled with dust,
// with a dense powder of small stars in it.
vec3 milkyWay(vec2 sp, float aspect) {
  vec2 dir = normalize(vec2(1.0, 0.42));
  vec2 origin = vec2(-0.55 * aspect, 0.18);
  float across = dot(sp - origin, vec2(-dir.y, dir.x));
  float along = dot(sp - origin, dir);
  float band = exp(-across * across / 0.035) * smoothstep(-1.2, 0.0, along) * (1.0 - smoothstep(0.4, 1.4, along));
  if (band < 0.002) return vec3(0.0);
  float cloud = fbm(vec3(sp * 3.2, 1.7));
  float dust = smoothstep(0.45, 0.75, fbm(vec3(sp * 7.0, 4.3)));
  vec3 haze = mix(vec3(0.30, 0.22, 0.55), vec3(0.20, 0.38, 0.75), cloud);
  haze = mix(haze, vec3(0.75, 0.60, 0.50), smoothstep(0.55, 0.8, cloud) * 0.5);
  vec3 light = haze * band * (0.45 + 0.95 * cloud) * (1.0 - 0.55 * dust);
  light += stars(sp, 160.0, 0.0, 0.78) * band * 1.1;
  return light;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;

  // Where the globe sits and its radius (see globeFrame), already moved by the parallax.
  vec2 c = uGlobe.xy;
  float r = uGlobe.z;

  // Deep space: a blue glow around the planet, a violet haze in the far corner, and three layers of stars.
  vec3 col;
  // Both themes are set in real space, black with stars; the light theme adds the Milky Way and a brighter blue glow.
  col = vec3(0.006, 0.010, 0.028);
  col += vec3(0.02, 0.06, 0.16) * exp(-length(uv - c) * 1.6) * (1.0 + uLight * 0.6);
  col += vec3(0.05, 0.02, 0.09) * exp(-length(uv - vec2(-0.9 * aspect, -0.6)) * 2.2);
  vec2 sp = uv - uParallax * 0.4;
  col += stars(sp, 38.0, 0.010, 0.86) * 0.9;
  col += stars(sp, 70.0, 0.006, 0.90) * 0.6;
  col += stars(sp, 120.0, 0.003, 0.93) * 0.45;
  if (uLight > 0.5) col += milkyWay(sp, aspect);

  vec2 p = (uv - c) / r;
  float d = length(p);
  float px = 1.5 / (r * uRes.y);

  // The wallpaper's two orbits: a blue one, wide and nearly level, rising a little to the right; and a larger, steeper one whose
  // faint line carries the amber streaks.
  // The blue orbit; OneTrack's ship rides it (worked out again in shipPose below: keep the two in step).
  vec2 o1c = c + vec2(-0.19, 0.07) * r * 2.0;
  float o1r = r * 1.59, o1flat = 0.36, o1angle = 0.08, o1speed = 0.16;
  vec4 o1 = orbit(uv, o1c, o1r, o1flat, o1angle, o1speed, 0.0, vec3(0.25, 0.55, 1.0) * (1.0 + uLight * 0.4), vec3(0.65, 0.85, 1.0));
  vec4 o2 = orbit(uv, c + vec2(-0.05, -0.02), r * 2.05, 0.42, 0.30, -0.11, 2.4, vec3(1.0, 0.55, 0.22) * 0.45, vec3(1.0, 0.60, 0.25));

  // The far halves of the orbits pass behind the planet (drawn now, then covered by it); the near halves come after it.
  float outside = smoothstep(1.0 - px, 1.0 + px, d);
  col += o1.rgb * (1.0 - o1.a) * outside;
  col += o2.rgb * (1.0 - o2.a) * outside;

  // The atmosphere outside the disc: a tight bright rim and a wide soft halo (brighter round the daytime Earth).
  if (d > 1.0) {
    float k = 1.0 + uLight * 0.7;
    col += vec3(0.18, 0.48, 1.0) * (exp(-(d - 1.0) * 18.0) * 0.6 + exp(-(d - 1.0) * 3.5) * 0.10) * k;
  }

  if (d < 1.0 + px) {
    float z = sqrt(max(1.0 - d * d, 0.0));
    vec3 n = vec3(p, z);
    // As in the wallpaper: the Atlantic in the middle, Europe near the top right, South America lower left — the axis turned a
    // little clockwise on screen and the view a little north of the equator. It then turns west to east, slowly (about 9 minutes).
    float roll = -0.32, tx = -0.20;
    vec3 v = vec3(n.x * cos(roll) - n.y * sin(roll), n.x * sin(roll) + n.y * cos(roll), n.z);
    vec3 m = vec3(v.x, v.y * cos(tx) - v.z * sin(tx), v.y * sin(tx) + v.z * cos(tx));
    float lon = atan(m.x, m.z) - 0.30 - uTime * 0.012;
    float lat = asin(clamp(m.y, -1.0, 1.0));
    vec2 tuv = vec2(fract(lon / (2.0 * PI) + 0.5), 0.5 - lat / PI);

    // The wallpaper's colours: the Earth at night in deep navy blue, the land dark with its cities glowing gold, white-blue clouds
    // drifting over it, a soft light toward the upper left where the sun is, and a bright cyan atmosphere at the edge.
    vec3 sun = normalize(vec3(-0.55, 0.65, 0.55));
    float light = dot(n, sun);
    vec3 day = texture2D(uDay, tuv).rgb;
    vec3 night = texture2D(uNight, tuv).rgb;
    float dayAmount = smoothstep(0.2, 0.95, light);
    // The night picture is already the wallpaper's palette (navy seas, blue-grey land): it is the base. Its city lights are the
    // only warm pixels in it (more red than blue), so they are picked out and made to glow gold.
    vec3 base = night * 1.55;
    float cityMask = smoothstep(0.012, 0.16, night.r - night.b * 0.8);
    vec3 cities = vec3(1.0, 0.76, 0.36) * cityMask * 3.6;
    // Toward the sun, in the upper left, the true colours of the ground come through softly (the Sahara turns pale stone).
    float lum = dot(day, vec3(0.30, 0.59, 0.11));
    vec3 sunlit = mix(vec3(lum) * vec3(0.85, 0.88, 0.95), day, 0.35) * 0.8;
    // Clouds that drift a little faster than the ground turns.
    float cl = lon + uTime * 0.004;
    vec3 e = vec3(cos(lat) * sin(cl), sin(lat), cos(lat) * cos(cl));
    // By day the clouds are crisp, scattered white patches, as in the light wallpaper.
    float cloud = uLight > 0.5 ? smoothstep(0.56, 0.72, fbm(e * vec3(5.5, 9.0, 5.5))) : smoothstep(0.55, 0.82, fbm(e * vec3(5.5, 9.0, 5.5)));
    vec3 planet = mix(base, sunlit, dayAmount * 0.65) + cities * (1.0 - 0.7 * dayAmount) * (1.0 - 0.7 * cloud);
    planet = mix(planet, vec3(0.72, 0.82, 0.98) * (0.22 + 0.55 * dayAmount), cloud * 0.6);
    // Limb: the atmosphere thickens toward the edge of the disc.
    float rim = pow(1.0 - z, 2.6);
    planet += vec3(0.15, 0.55, 1.0) * rim * 0.9;
    if (uLight > 0.5) {
      // By day, as in the light wallpaper: a vivid, glossy Earth. NASA's picture has deep navy seas; they are picked out (the pixels
      // much bluer than red or green, in proportion, so the darkest deep sea counts too) and repainted a rich ocean blue, lighter in the shallows. The land keeps its colours,
      // made richer (green forests, pale sand deserts). Lit from the upper left, deepening to a darker blue toward the far edge, with
      // a sun glint on the sea, crisp white clouds and a thin bright atmosphere at the rim.
      float dl = dot(day, vec3(0.30, 0.59, 0.11));
      float ocean = smoothstep(1.15, 1.6, day.b / (max(day.r, day.g) + 0.02));
      vec3 land = clamp(mix(vec3(dl), day, 1.25) * 1.32, 0.0, 1.0);
      // Smooth open sea (the picture's sea-floor relief only faintly), lighter in the shallows along the coasts.
      vec3 sea = mix(vec3(0.04, 0.32, 0.74), vec3(0.14, 0.58, 0.96), smoothstep(0.40, 0.70, day.b + day.g * 0.5) * 0.7);
      // The sun a little further round than at night, so the lower right edge falls into night: there the night side shows, its
      // cities glowing gold, as on a photograph from orbit.
      float sunSide = dot(n, normalize(vec3(-0.6, 0.55, 0.42)));
      float shade = 0.62 + 0.55 * max(sunSide, 0.0);
      vec3 dayside = mix(land, sea, ocean) * shade;
      vec3 glintDir = normalize(sun + vec3(0.0, 0.0, 1.0));
      dayside += vec3(0.75, 0.88, 1.0) * pow(max(dot(n, glintDir), 0.0), 30.0) * 0.35 * ocean;
      dayside = mix(dayside, vec3(1.0) * (0.88 + 0.12 * shade), cloud * 0.95);
      vec3 nightside = base * 0.9 + cities * (1.0 - 0.7 * cloud);
      planet = mix(nightside, dayside, smoothstep(-0.18, 0.22, sunSide));
      planet = mix(planet, vec3(0.02, 0.16, 0.48), smoothstep(0.6, 1.0, d) * 0.3);
      // A blue atmosphere at the rim, bright on the sunlit side.
      planet = mix(planet, vec3(0.45, 0.75, 1.0), pow(1.0 - z, 3.0) * (0.55 + 0.4 * smoothstep(-0.2, 0.4, sunSide)));
    }
    float edge = 1.0 - smoothstep(1.0 - px, 1.0 + px, d);
    col = mix(col, planet, edge);
  }

  // The near halves of the orbits run in front of the planet.
  col += o1.rgb * o1.a + o2.rgb * o2.a;

  // Dark edges, so the scene sinks into the frame.
  col *= 1.0 - 0.35 * smoothstep(0.55, 1.25, length(uv * vec2(0.8, 1.0)));
  gl_FragColor = vec4(col, 1.0);
}
`;

// OneTrack's arrow as a ship: a dart folded along a ridge like a paper plane, with a notched tail where the engine sits. Its own axes:
// x to its right, y up, z forward (the nose).
const NOSE = [0, 0, 1] as const;
const LEFT = [-0.68, 0, -0.6] as const;
const RIGHT = [0.68, 0, -0.6] as const;
const RIDGE = [0, 0.22, -0.32] as const;
const KEEL = [0, -0.09, -0.32] as const;
/** Where the engine burns, in the notch of the tail. */
const NOZZLE: Vec3 = [0, 0.03, -0.34];
// Each face with its kind: 0 the top (OneTrack's blue to violet), 1 the belly, 2 the tail with the engine.
const FACES: [readonly number[], readonly number[], readonly number[], number][] = [
  [NOSE, LEFT, RIDGE, 0],
  [NOSE, RIDGE, RIGHT, 0],
  [NOSE, KEEL, LEFT, 1],
  [NOSE, RIGHT, KEEL, 1],
  [LEFT, KEEL, RIDGE, 2],
  [RIGHT, RIDGE, KEEL, 2],
];

/** The model as the GPU takes it: per corner its position, its face's normal (pointing out, so each face is lit as a flat facet), its
 * kind, and which corner of the face it is (so the shader knows how far a point is from the face's edges, to light them). */
function shipMesh(): Float32Array {
  const middle: Vec3 = [0, 0.02, -0.15];
  const data: number[] = [];
  for (const [a, b, c, kind] of FACES) {
    let n = normalize(cross(sub(b as Vec3, a as Vec3), sub(c as Vec3, a as Vec3)));
    const centroid = scale(add(add(a as Vec3, b as Vec3), c as Vec3), 1 / 3);
    if (dot(n, sub(centroid, middle)) < 0) n = scale(n, -1);
    [a, b, c].forEach((v, i) => data.push(v[0], v[1], v[2], n[0], n[1], n[2], kind, i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0));
  }
  return new Float32Array(data);
}

const SHIP_VERTEX = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute float aFace;
attribute vec3 aCorner;
uniform mat3 uRot;
uniform vec3 uCenter;
uniform float uSize;
uniform float uAspect;
varying vec3 vN;
varying vec3 vLocal;
varying vec3 vWorld;
varying float vFace;
varying vec3 vCorner;
void main() {
  vec3 v = uRot * aPos;
  // A touch of perspective inside the ship itself: the end nearer the eye is drawn a little bigger.
  float persp = 1.0 / (1.0 + v.z * 0.18);
  vec2 s = uCenter.xy + v.xy * uSize * persp;
  vWorld = vec3(s, uCenter.z + v.z * uSize);
  vN = uRot * aNormal;
  vLocal = aPos;
  vFace = aFace;
  vCorner = aCorner;
  gl_Position = vec4(s.x * 2.0 / uAspect, s.y * 2.0, v.z * 0.3, 1.0);
}
`;

// Both the ship and its flame are hidden where the planet stands in front of them.
const BEHIND_PLANET = `
uniform vec3 uPlanet;
bool behindPlanet(vec2 at, float depth) {
  vec2 d = at - uPlanet.xy;
  float h = uPlanet.z * uPlanet.z - dot(d, d);
  return h > 0.0 && depth > -sqrt(h);
}
`;

const SHIP_FRAGMENT = `
precision highp float;
uniform float uTime;
uniform float uNear;
varying vec3 vN;
varying vec3 vLocal;
varying vec3 vWorld;
varying float vFace;
varying vec3 vCorner;
${BEHIND_PLANET}
void main() {
  if (behindPlanet(vWorld.xy, vWorld.z)) discard;
  vec3 n = normalize(vN);
  // Lit like the planet: the sun up and to the left, the eye looking into the screen.
  vec3 L = normalize(vec3(-0.55, 0.65, -0.55));
  vec3 V = vec3(0.0, 0.0, -1.0);
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 36.0);
  float fres = pow(1.0 - abs(dot(n, V)), 3.0);
  float side = clamp(vLocal.x / 1.36 + 0.5, 0.0, 1.0);
  vec3 base;
  if (vFace < 0.5) {
    // OneTrack's arrow: bright blue on the left wing, violet on the right, turning cyan toward the nose.
    base = mix(vec3(0.22, 0.62, 1.0), vec3(0.52, 0.28, 0.98), side);
    base = mix(base, vec3(0.55, 0.92, 1.0), smoothstep(0.2, 1.0, vLocal.z) * 0.55);
  } else if (vFace < 1.5) {
    base = mix(vec3(0.10, 0.16, 0.45), vec3(0.25, 0.10, 0.50), side);
  } else {
    // The tail: brushed blue steel.
    base = mix(vec3(0.30, 0.38, 0.70), vec3(0.38, 0.28, 0.72), side);
  }
  vec3 col = base * (0.30 + 0.9 * diff) + vec3(0.9, 0.95, 1.0) * spec * 0.8 + vec3(0.30, 0.60, 1.0) * fres * 0.7;
  // Fine glowing edges, as on OneTrack's arrow, so its shape reads even small and against the dark planet.
  float edge = min(min(vCorner.x, vCorner.y), vCorner.z);
  col += vec3(0.55, 0.85, 1.0) * (1.0 - smoothstep(0.0, 0.07, edge)) * 0.55;
  if (vFace > 1.5) {
    // The engine glowing in the notch of the tail: what is seen of the ship as it flies away.
    float e = length(vLocal.xy - vec2(0.0, 0.03));
    float flicker = 0.85 + 0.15 * sin(uTime * 31.0);
    col += vec3(0.55, 0.85, 1.0) * exp(-e * 16.0) * 2.2 * flicker + vec3(0.30, 0.50, 1.0) * exp(-e * 5.0) * 0.4;
  }
  col *= mix(0.7, 1.1, uNear);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FLAME_VERTEX = `
attribute vec2 aCorner;
uniform vec4 uBox;
uniform float uAspect;
uniform float uZ;
varying vec2 vUv;
void main() {
  vUv = uBox.xy + aCorner * uBox.zw;
  gl_Position = vec4(vUv.x * 2.0 / uAspect, vUv.y * 2.0, uZ, 1.0);
}
`;

// The thruster: a white-hot core at the nozzle, a blue plume that turns violet as it trails off behind the ship, and a soft halo. Seen
// from behind the plume points at the eye and shrinks to a bright round burn.
const FLAME_FRAGMENT = `
precision highp float;
uniform vec2 uTail;
uniform vec2 uDir;
uniform float uSize;
uniform float uTime;
uniform float uDepth;
uniform float uFacing;
uniform float uNear;
varying vec2 vUv;
${BEHIND_PLANET}
void main() {
  if (behindPlanet(vUv, uDepth)) discard;
  vec2 d = vUv - uTail;
  float len = max(length(uDir), 1e-4);
  float h = clamp(dot(d, uDir / len) / len, 0.0, 1.0);
  float ds = length(d - uDir * h);
  float flicker = 0.82 + 0.18 * sin(uTime * 41.0) * sin(uTime * 17.0 + 1.3);
  float w = uSize * (0.15 * (1.0 - 0.75 * h) + 0.012);
  float plume = exp(-ds * ds / (w * w)) * pow(1.0 - h, 1.4) * flicker;
  vec3 plumeColor = mix(vec3(0.85, 0.97, 1.0), mix(vec3(0.25, 0.62, 1.0), vec3(0.55, 0.30, 1.0), h), smoothstep(0.0, 0.45, h));
  float r0 = length(d);
  float core = exp(-r0 / (uSize * 0.06)) * (0.8 + 0.9 * uFacing) * flicker;
  float halo = exp(-r0 / (uSize * 0.22)) * 0.28;
  vec3 col = plumeColor * plume * 2.0 + vec3(0.8, 0.95, 1.0) * core * 1.4 + vec3(0.25, 0.5, 1.0) * halo;
  gl_FragColor = vec4(col * mix(0.7, 1.1, uNear), 1.0);
}
`;

type Vec3 = [number, number, number];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** Where the app's pages are drawn over the backdrop, the sign-in page, or a page filled by a map (only a strip of sky shows above it). */
export type BackdropLayout = "app" | "login" | "map";

/**
 * Where the globe sits (its centre and radius, in the shader's screen units). Framed as in OneTrack's wallpaper: on a wide screen a big
 * globe a little right of centre, almost the height of the screen (the menu and the cards are on the left). On a phone or a tablet held
 * upright it is smaller and a little low in the app; on the sign-in page it goes up behind the logo, so the ship's pass in front of it
 * runs above the sign-in card instead of under it.
 */
function globeFrame(aspect: number, layout: BackdropLayout, parallaxX: number, parallaxY: number): Vec3 {
  // Above a map the Earth is left out (far below the screen, its glow and orbits with it): just stars, no planet cut off by the map.
  if (layout === "map") return [0, -40, 0.3];
  if (aspect > 1) return [0.158 * aspect + parallaxX, 0.014 + parallaxY, 0.48];
  if (layout === "login") return [0.04 * aspect + parallaxX, 0.27 + parallaxY, 0.24];
  return [0.12 * aspect + parallaxX, -0.06 + parallaxY, 0.3];
}

/**
 * Where the ship is and how it is turned, in the shader's screen units (the screen's height is 1, the middle is 0; depth grows into the
 * screen, the planet's centre at 0). The blue orbit is a circle on a tilted plane seen from a little above: its picture is the shader's
 * ellipse, and the ship flies along the circle at the head of the orbit's spark. It weaves a little up and down and in and out, pitches
 * with the weave and banks into the turn.
 */
function shipPose(time: number, planet: Vec3) {
  const r = planet[2];
  // The shader's o1: centre c + (-0.19, 0.07)·2r, radius 1.59r, flatness 0.36, turned 0.08 rad, 0.16 rad a second.
  const orbitCentre: Vec3 = [planet[0] - 0.38 * r, planet[1] + 0.14 * r, 0];
  const radius = r * 1.59;
  const f = 0.36;
  const g = Math.sqrt(1 - f * f);
  const ca = Math.cos(0.08);
  const sa = Math.sin(0.08);
  const e1: Vec3 = [ca, sa, 0];
  const e2: Vec3 = [-f * sa, f * ca, g];
  const up: Vec3 = [-g * sa, g * ca, -f];

  const t = (time * 0.16) % (2 * Math.PI);
  const radial = add(scale(e1, Math.cos(t)), scale(e2, Math.sin(t)));
  const tangent = add(scale(e1, -Math.sin(t)), scale(e2, Math.cos(t)));
  // How close it is to the eye: 1 at the front of the orbit, 0 at the back. It sets its size and brightness, as before.
  const near = 0.5 - 0.5 * Math.sin(t);
  const size = r * (0.06 + 0.11 * near ** 1.5);

  const bob = Math.sin(time * 1.1) * 0.22 * size;
  const sway = Math.sin(time * 0.7) * 0.2 * size;
  const centre = add(add(orbitCentre, scale(radial, radius + sway)), scale(up, bob));
  const pitch = 0.14 * Math.cos(time * 1.1);
  const roll = 0.25 * Math.sin(time * 0.7);
  const forward = normalize(add(scale(tangent, Math.cos(pitch)), scale(up, Math.sin(pitch))));
  let shipUp = normalize(add(scale(up, Math.cos(pitch)), scale(tangent, -Math.sin(pitch))));
  // The orbit is seen from only a little above, which would show the ship edge on as a thin sliver: its back is turned well toward
  // the eye, so its arrow shape reads (as in a game's three-quarter view), then it rocks gently from wing to wing.
  const toEye: Vec3 = [0, 0, -1];
  shipUp = normalize(add(shipUp, scale(sub(toEye, scale(forward, dot(toEye, forward))), 0.9)));
  let right = normalize(cross(shipUp, forward));
  shipUp = normalize(add(scale(shipUp, Math.cos(roll)), scale(right, Math.sin(roll))));
  right = normalize(cross(shipUp, forward));
  shipUp = cross(forward, right);

  const nozzle = add(add(scale(right, NOZZLE[0]), scale(shipUp, NOZZLE[1])), scale(forward, NOZZLE[2]));
  const persp = 1 / (1 + nozzle[2] * 0.18);
  const tail: [number, number] = [centre[0] + nozzle[0] * size * persp, centre[1] + nozzle[1] * size * persp];
  // The plume, on the screen: straight back from the ship, as long as the ship when seen side on, short when it points at the eye.
  const plume: [number, number] = [-forward[0] * size * 2.2 * persp, -forward[1] * size * 2.2 * persp];

  return {
    planet,
    centre,
    size,
    near,
    rotation: new Float32Array([...right, ...shipUp, ...forward]),
    tail,
    plume,
    tailDepth: centre[2] + nozzle[2] * size,
    tailZ: nozzle[2] * 0.3 - 0.04,
    facing: Math.max(forward[2], 0),
  };
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[backdrop]", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function link(gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[backdrop]", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * A picture of the Earth wrapped round the globe, loaded in steps: each of `urls` in turn replaces the one before as it arrives, so a
 * small one shows the planet quickly and a sharp one (4096 × 2048, which a big or dense screen needs not to look pixelated) follows.
 * All are powers of two, so they can repeat round the globe and have mipmaps (no shimmer when drawn small).
 */
function loadTexture(gl: WebGLRenderingContext, unit: number, urls: string[], onReady: () => void): WebGLTexture | null {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Black until the picture arrives.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  let shown = -1;
  urls.forEach((url, step) => {
    const image = new Image();
    image.onload = () => {
      // A sharper picture that came first is not replaced by a smaller one, and nothing is uploaded once the effect is gone.
      if (step < shown || !gl.isTexture(texture)) return;
      shown = step;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      onReady();
    };
    image.src = url;
  });
  return texture;
}

export function SpaceBackdrop({ layout = "app", theme = "dark" }: { layout?: BackdropLayout; theme?: "light" | "dark" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    // Antialiased, so the ship's edges stay clean; the depth buffer lets its near faces hide its far ones and the flame.
    const gl = canvas?.getContext("webgl", { antialias: true, alpha: false, depth: true, powerPreference: "low-power" });
    if (!canvas || !gl) return;

    const overMap = layout === "map";
    // Above a map only a strip of starry sky shows: it is drawn once and held still, leaving the GPU to the map.
    const still = overMap || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const light = theme === "light";

    // A phone's GPU gets one layer less of cloud detail, which nobody sees at that size.
    const scene = link(gl, VERTEX, FRAGMENT.replace("__OCTAVES__", phone ? "4" : "5"));
    if (!scene) return;
    // Without the ship the planet still turns.
    const ship = link(gl, SHIP_VERTEX, SHIP_FRAGMENT);
    const flame = link(gl, FLAME_VERTEX, FLAME_FRAGMENT);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const mesh = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
    const meshData = shipMesh();
    gl.bufferData(gl.ARRAY_BUFFER, meshData, gl.STATIC_DRAW);
    const corners = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const at = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);
    const sceneA = gl.getAttribLocation(scene, "a");
    gl.useProgram(scene);
    gl.uniform1i(at(scene, "uDay"), 0);
    gl.uniform1i(at(scene, "uNight"), 1);
    gl.uniform1f(at(scene, "uLight"), light ? 1 : 0);

    // Pixels drawn per CSS pixel. A phone or tablet screen packs 2-3 device pixels into each CSS pixel: it draws about 2¼ per CSS
    // pixel there (nearly the screen's own sharpness; a little under it, so it stays light), and a computer a little over one.
    const dpr = window.devicePixelRatio || 1;
    const scale = phone ? Math.min(dpr, 2.5) * 0.9 : Math.min(dpr, 1.5) * 0.9;
    const frameMs = phone ? 1000 / 24 : 1000 / 30;

    const resize = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth * scale));
      const height = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const target = { x: 0, y: 0 };
    const parallax = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth - 0.5) * -0.035;
      target.y = (event.clientY / window.innerHeight - 0.5) * 0.025;
    };

    const drawShip = (time: number, aspect: number, globe: Vec3) => {
      if (!ship || !flame) return;
      const pose = shipPose(time, globe);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(ship);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
      const stride = 10 * 4;
      const attributes: [string, number, number][] = [
        ["aPos", 3, 0],
        ["aNormal", 3, 12],
        ["aFace", 1, 24],
        ["aCorner", 3, 28],
      ];
      const used: number[] = [];
      for (const [name, size, offset] of attributes) {
        const location = gl.getAttribLocation(ship, name);
        if (location < 0) continue;
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
        used.push(location);
      }
      gl.uniformMatrix3fv(at(ship, "uRot"), false, pose.rotation);
      gl.uniform3f(at(ship, "uCenter"), pose.centre[0], pose.centre[1], pose.centre[2]);
      gl.uniform1f(at(ship, "uSize"), pose.size);
      gl.uniform1f(at(ship, "uAspect"), aspect);
      gl.uniform3f(at(ship, "uPlanet"), pose.planet[0], pose.planet[1], pose.planet[2]);
      gl.uniform1f(at(ship, "uTime"), time);
      gl.uniform1f(at(ship, "uNear"), pose.near);
      gl.drawArrays(gl.TRIANGLES, 0, meshData.length / 10);
      used.forEach((location) => gl.disableVertexAttribArray(location));

      // The flame adds light, behind whatever part of the ship is nearer the eye.
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(flame);
      gl.bindBuffer(gl.ARRAY_BUFFER, corners);
      const corner = gl.getAttribLocation(flame, "aCorner");
      gl.enableVertexAttribArray(corner);
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
      const margin = pose.size * 0.9;
      gl.uniform4f(
        at(flame, "uBox"),
        pose.tail[0] + pose.plume[0] / 2,
        pose.tail[1] + pose.plume[1] / 2,
        Math.abs(pose.plume[0]) / 2 + margin,
        Math.abs(pose.plume[1]) / 2 + margin,
      );
      gl.uniform1f(at(flame, "uAspect"), aspect);
      gl.uniform1f(at(flame, "uZ"), pose.tailZ);
      gl.uniform2f(at(flame, "uTail"), pose.tail[0], pose.tail[1]);
      gl.uniform2f(at(flame, "uDir"), pose.plume[0], pose.plume[1]);
      gl.uniform1f(at(flame, "uSize"), pose.size);
      gl.uniform1f(at(flame, "uTime"), time);
      gl.uniform1f(at(flame, "uDepth"), pose.tailDepth);
      gl.uniform1f(at(flame, "uFacing"), pose.facing);
      gl.uniform1f(at(flame, "uNear"), pose.near);
      gl.uniform3f(at(flame, "uPlanet"), pose.planet[0], pose.planet[1], pose.planet[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(corner);
      gl.disable(gl.BLEND);
      gl.depthMask(true);
      gl.disable(gl.DEPTH_TEST);
    };

    const start = performance.now();
    let frame = 0;
    let last = 0;
    const draw = (now: number) => {
      resize();
      parallax.x += (target.x - parallax.x) * 0.04;
      parallax.y += (target.y - parallax.y) * 0.04;
      const time = still ? 40 : (now - start) / 1000;
      const aspect = canvas.width / canvas.height;
      gl.useProgram(scene);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(sceneA);
      gl.vertexAttribPointer(sceneA, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(at(scene, "uRes"), canvas.width, canvas.height);
      gl.uniform1f(at(scene, "uTime"), time);
      gl.uniform2f(at(scene, "uParallax"), parallax.x, parallax.y);
      const globe = globeFrame(aspect, layout, parallax.x, parallax.y);
      gl.uniform3f(at(scene, "uGlobe"), globe[0], globe[1], globe[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(sceneA);
      if (!overMap) drawShip(time, aspect, globe);
    };
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < frameMs) return;
      last = now;
      draw(now);
    };
    const redraw = () => requestAnimationFrame(draw);

    // The picture each theme shows in full gets the sharp version: the daytime Earth by day (where the night picture only lights the
    // cities along the dark edge), the night one at night (where the day picture only tints the sunlit corner). A GPU that can't hold 4096-pixel pictures keeps the small ones.
    const sharp = (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) >= 4096;
    // (index.html starts downloading the same pictures before the app's code, so they usually come straight from the cache.)
    // The scene stays hidden, over the wallpaper's plain sky, until the theme's own picture of the Earth is in, then fades in: no
    // blank planet first.
    canvas.style.opacity = "0";
    const reveal = () => {
      redraw();
      requestAnimationFrame(() => requestAnimationFrame(() => (canvas.style.opacity = "1")));
    };
    // (Above a map there is no Earth to wait for.)
    const textures = overMap
      ? []
      : [
          loadTexture(gl, 0, ["/backgrounds/earth-day.jpg", ...(light && sharp ? ["/backgrounds/earth-day-4k.jpg"] : [])], light ? reveal : redraw),
          loadTexture(gl, 1, ["/backgrounds/earth-night.jpg", ...(!light && sharp ? ["/backgrounds/earth-night-4k.jpg"] : [])], light ? redraw : reveal),
        ];
    if (overMap) reveal();

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !still) frame = requestAnimationFrame(loop);
    };
    window.addEventListener("resize", redraw);
    document.addEventListener("visibilitychange", onVisibility);
    if (!phone) window.addEventListener("pointermove", onPointer, { passive: true });
    if (still) redraw();
    else frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", redraw);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      // The context is not thrown away here: a remount on the same canvas (React does one in development) gets it back as it is.
      for (const program of [scene, ship, flame]) if (program) gl.deleteProgram(program);
      for (const buffer of [quad, mesh, corners]) gl.deleteBuffer(buffer);
      for (const texture of textures) gl.deleteTexture(texture);
    };
  }, [layout, theme]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-0 transition-opacity duration-700" />;
}
