import { useEffect, useRef } from "react";

/**
 * The dark theme's living backdrop: deep space with drifting, twinkling stars, the Earth turning slowly (the day side in muted blues,
 * the night side lit by its cities, a blue atmosphere around it) and two orbits of light, each with a spark running along it, like the
 * menu backgrounds of a space strategy game. OneTrack's icon flies round the Earth on the blue orbit, in perspective. The globe leans a little toward the pointer (parallax) on a computer.
 *
 * Everything is drawn by one small WebGL fragment shader on a single canvas (no 3D library): a ray hits a sphere per pixel and reads
 * NASA's public-domain day and night textures (public/backgrounds/earth-*.jpg), wrapped around it and turned with time. It runs at a
 * low frame rate and resolution (lower on a phone), stops while the tab is hidden, and is a still picture for anyone who asked their
 * device for less motion. Without WebGL it draws nothing and the dark wallpaper under it stays.
 */

const VERTEX = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uParallax;
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uIcon;

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
  for (int k = 0; k < 5; k++) {
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
  float spark = exp(-behind * 3.5) * (exp(-pow(sd / 0.003, 2.0)) * 1.6 + exp(-sd / 0.02) * 0.45);
  spark += exp(-behind * 60.0) * exp(-sd / 0.01) * 1.4;
  vec3 light = color * line + sparkColor * spark;
  return vec4(light, q.y < 0.0 ? 1.0 : 0.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;

  // Where the globe sits: right of centre on a wide screen (the menu and the cards are on the left), lower and smaller on a phone.
  // Framed as in OneTrack's wallpaper: a big globe a little right of centre, almost the height of the screen.
  vec2 c = aspect > 1.0 ? vec2(0.158 * aspect, 0.014) : vec2(0.12 * aspect, -0.06);
  float r = aspect > 1.0 ? 0.48 : 0.30;
  c += uParallax;

  // Deep space: a blue glow around the planet, a violet haze in the far corner, and three layers of stars.
  vec3 col = vec3(0.006, 0.010, 0.028);
  col += vec3(0.02, 0.06, 0.16) * exp(-length(uv - c) * 1.6);
  col += vec3(0.05, 0.02, 0.09) * exp(-length(uv - vec2(-0.9 * aspect, -0.6)) * 2.2);
  vec2 sp = uv - uParallax * 0.4;
  col += stars(sp, 38.0, 0.010, 0.86) * 0.9;
  col += stars(sp, 70.0, 0.006, 0.90) * 0.6;
  col += stars(sp, 120.0, 0.003, 0.93) * 0.45;

  vec2 p = (uv - c) / r;
  float d = length(p);
  float px = 1.5 / (r * uRes.y);

  // The wallpaper's two orbits: a blue one, wide and nearly level, rising a little to the right; and a larger, steeper one whose
  // faint line carries the amber streaks.
  // The blue orbit; OneTrack's icon rides it (see below), so its centre, size, tilt and speed are named here once.
  vec2 o1c = c + vec2(-0.19, 0.07) * r * 2.0;
  float o1r = r * 1.59, o1flat = 0.36, o1angle = 0.08, o1speed = 0.16;
  vec4 o1 = orbit(uv, o1c, o1r, o1flat, o1angle, o1speed, 0.0, vec3(0.25, 0.55, 1.0), vec3(0.65, 0.85, 1.0));
  vec4 o2 = orbit(uv, c + vec2(-0.05, -0.02), r * 2.05, 0.42, 0.30, -0.11, 2.4, vec3(1.0, 0.55, 0.22) * 0.45, vec3(1.0, 0.60, 0.25));

  // The far halves of the orbits pass behind the planet (drawn now, then covered by it); the near halves come after it.
  float outside = smoothstep(1.0 - px, 1.0 + px, d);
  col += o1.rgb * (1.0 - o1.a) * outside;
  col += o2.rgb * (1.0 - o2.a) * outside;

  // The atmosphere outside the disc: a tight bright rim and a wide soft halo.
  if (d > 1.0) {
    col += vec3(0.18, 0.48, 1.0) * (exp(-(d - 1.0) * 18.0) * 0.6 + exp(-(d - 1.0) * 3.5) * 0.10);
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
    float cloud = smoothstep(0.55, 0.82, fbm(e * vec3(5.5, 9.0, 5.5)));
    vec3 planet = mix(base, sunlit, dayAmount * 0.65) + cities * (1.0 - 0.7 * dayAmount) * (1.0 - 0.7 * cloud);
    planet = mix(planet, vec3(0.72, 0.82, 0.98) * (0.22 + 0.55 * dayAmount), cloud * 0.6);
    // Limb: the atmosphere thickens toward the edge of the disc.
    float rim = pow(1.0 - z, 2.6);
    planet += vec3(0.15, 0.55, 1.0) * rim * 0.9;
    float edge = 1.0 - smoothstep(1.0 - px, 1.0 + px, d);
    col = mix(col, planet, edge);
  }

  // The near halves of the orbits run in front of the planet.
  col += o1.rgb * o1.a + o2.rgb * o2.a;

  // OneTrack's icon flying round the Earth on the blue orbit, at the head of its spark. Seen in perspective: big as it passes in
  // front (the lower half of the ellipse), small and a little dimmer as it goes round the back, where the planet hides it.
  float t1 = mod(uTime * o1speed, 2.0 * PI);
  vec2 onOrbit = vec2(cos(t1), sin(t1) * o1flat) * o1r;
  vec2 ip = o1c + vec2(onOrbit.x * cos(o1angle) - onOrbit.y * sin(o1angle), onOrbit.x * sin(o1angle) + onOrbit.y * cos(o1angle));
  float near = 0.5 - 0.5 * sin(t1);
  float iconHalf = r * mix(0.045, 0.15, near * near);
  float hidden = sin(t1) > 0.0 ? 1.0 - smoothstep(1.0 - px, 1.0 + px, length((uv - c) / r)) : 0.0;
  float glow = exp(-length(uv - ip) / (iconHalf * 0.9)) * 0.35 * (1.0 - hidden);
  col += vec3(0.30, 0.55, 1.0) * glow;
  vec2 ls = (uv - ip) / iconHalf;
  if (abs(ls.x) < 1.0 && abs(ls.y) < 1.0) {
    vec4 icon = texture2D(uIcon, vec2(ls.x * 0.5 + 0.5, 0.5 - ls.y * 0.5));
    col = mix(col, icon.rgb * mix(0.6, 1.1, near), icon.a * (1.0 - hidden));
  }

  // Dark edges, so the scene sinks into the frame.
  col *= 1.0 - 0.35 * smoothstep(0.55, 1.25, length(uv * vec2(0.8, 1.0)));
  gl_FragColor = vec4(col, 1.0);
}
`;

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

function loadTexture(gl: WebGLRenderingContext, unit: number, url: string, onReady: () => void, square = false): WebGLTexture | null {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Black until the picture arrives.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  const image = new Image();
  image.onload = () => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (square) {
      // The icon: centred on a transparent 512 × 512 canvas (a power of two, for mipmaps), with its transparency. 512 keeps it crisp
      // when it passes close in front on a dense phone screen.
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      const k = size / Math.max(image.width, image.height);
      if (ctx) {
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, (size - image.width * k) / 2, (size - image.height * k) / 2, image.width * k, image.height * k);
      }
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    }
    // 2048 × 1024: powers of two, so it can repeat round the globe and have mipmaps (no shimmer when it is drawn small).
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    onReady();
  };
  image.src = url;
  return texture;
}

export function SpaceBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!canvas || !gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[backdrop]", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uParallax = gl.getUniformLocation(program, "uParallax");
    gl.uniform1i(gl.getUniformLocation(program, "uDay"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "uNight"), 1);
    gl.uniform1i(gl.getUniformLocation(program, "uIcon"), 2);

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    // Pixels drawn per CSS pixel. A phone or tablet screen packs 2-3 device pixels into each CSS pixel, so drawing fewer than one
    // per CSS pixel (as it did) left the planet and the icon blurred there: it draws about 1.6 per CSS pixel instead (capped at 2×
    // the screen's density, never more than the screen has), still under the screen's full resolution so it stays light. A computer
    // looks sharp with a little over one.
    const dpr = window.devicePixelRatio || 1;
    const scale = phone ? Math.min(dpr, 2) * 0.8 : Math.min(dpr, 1.5) * 0.85;
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

    const start = performance.now();
    let frame = 0;
    let last = 0;
    const draw = (now: number) => {
      resize();
      parallax.x += (target.x - parallax.x) * 0.04;
      parallax.y += (target.y - parallax.y) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, still ? 40 : (now - start) / 1000);
      gl.uniform2f(uParallax, parallax.x, parallax.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (now - last < frameMs) return;
      last = now;
      draw(now);
    };
    const redraw = () => requestAnimationFrame(draw);

    loadTexture(gl, 0, "/backgrounds/earth-day.jpg", redraw);
    loadTexture(gl, 1, "/backgrounds/earth-night.jpg", redraw);
    loadTexture(gl, 2, "/logos/onetrack-symbol.png", redraw, true);

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
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full" />;
}
