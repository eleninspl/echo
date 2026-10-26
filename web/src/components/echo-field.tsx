"use client";

import { useEffect, useRef } from "react";

import { RESULTS_SLOT } from "./show-finder";

export const ECHO_EVENT = "echo-field:echo";
export const ECHO_LIFE = 4;
export type EchoDetail = { x: number; y: number; speed: number };

const CALL_SPEED = 520;
const ECHO_SPEED = 640;

const VERTEX = `#version 300 es
in vec2 corner;
void main() {
  gl_Position = vec4(corner, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 size;
uniform float dpr;
uniform float time;
uniform vec2 you;
uniform vec2 guest;
uniform vec3 call;
uniform vec3 echo;
uniform float born;
uniform vec4 quiet;
uniform float dim;
uniform vec3 fit;
uniform vec3 love;
uniform vec3 reach;
uniform vec3 base;

out vec4 outColor;

const float CELL = 14.0;
const float TAU = 6.2831853;
const float WAVELENGTH = 70.0;
const float WAVE_SPEED = 34.0;
const float CALL_SPEED = ${CALL_SPEED.toFixed(1)};
const float ECHO_SPEED = ${ECHO_SPEED.toFixed(1)};
const float ECHO_LIFE = ${ECHO_LIFE.toFixed(1)};

float ring(float away, float radius, float width) {
  float x = (away - radius) / width;
  return exp(-x * x);
}

float disc(vec2 pixel, vec2 centre, float radius) {
  return clamp((radius - distance(pixel, centre)) * dpr + 0.5, 0.0, 1.0);
}

vec4 over(vec4 top, vec4 under) {
  return top + under * (1.0 - top.a);
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, size.y * dpr - gl_FragCoord.y) / dpr;
  vec2 offset = mod(size, CELL) * 0.5;
  vec2 centre = offset + (floor((pixel - offset) / CELL) + 0.5) * CELL;

  float toYou = distance(centre, you);
  float toGuest = distance(centre, guest);
  float yours = exp(-toYou / 480.0);
  float theirs = 0.85 * exp(-toGuest / 380.0);
  float k = TAU / WAVELENGTH;
  float crest = max(yours * sin(k * (toYou - WAVE_SPEED * time)) + theirs * sin(k * (toGuest - WAVE_SPEED * time)), 0.0);
  vec3 waveTint = mix(fit, love, smoothstep(0.3, 0.7, theirs / (yours + theirs + 0.0001)));
  float waves = 0.45 * crest;

  float callAge = time - call.z;
  float toCall = distance(centre, call.xy);
  float callRadius = CALL_SPEED * callAge;
  float callFront = step(0.0, callAge) * ring(toCall, callRadius, 22.0);
  float callTrail = step(toCall, callRadius) * exp(-(callRadius - toCall) / 120.0) * 0.15;
  float callLife = exp(-callAge / 1.2) * exp(-toCall / 600.0);
  float called = 0.7 * (callFront + callTrail) * callLife;

  float echoAge = time - echo.z;
  float toEcho = distance(centre, echo.xy);
  float echoRadius = ECHO_SPEED * echoAge;
  float echoFront = step(0.0, echoAge) * ring(toEcho, echoRadius, 30.0);
  float echoTrail = step(toEcho, echoRadius) * exp(-(echoRadius - toEcho) / 360.0) * 0.25;
  float echoLife = exp(-echoAge / ECHO_LIFE);
  float burst = step(0.0, echoAge) * exp(-echoAge / 0.4);
  float echoed = (0.65 * echoFront + echoTrail) * echoLife + 0.6 * burst * exp(-pow(toEcho / 50.0, 2.0));

  float light = waves + called + echoed;
  vec3 tint = (waveTint * waves + fit * called + reach * echoed) / max(light, 0.0001);
  float level = clamp(light, 0.0, 1.0);

  vec2 push = normalize(centre - call.xy + 0.001) * callFront * callLife * 1.2
    + normalize(centre - echo.xy + 0.001) * echoFront * echoLife * 1.5;
  float pushed = length(push);
  if (pushed > 1.5) push *= 1.5 / pushed;

  float listener = disc(pixel, centre + push, mix(0.7, 2.6, level));
  float reveal = clamp((CALL_SPEED * (time - born) - toYou) / 160.0, 0.0, 1.0);
  float listenerAlpha = listener * mix(0.12, 0.6, level) * reveal;
  vec4 field = vec4(mix(base, tint, smoothstep(0.0, 0.3, light)) * listenerAlpha, listenerAlpha);

  float breathe = 0.5 + 0.5 * sin(time * 1.6);
  float youHalo = exp(-pow(distance(pixel, you) / 34.0, 2.0)) * (0.14 + 0.06 * breathe);
  float guestHalo = exp(-pow(distance(pixel, guest) / 30.0, 2.0)) * (0.12 + 0.3 * burst);
  vec4 halos = vec4(fit * youHalo + mix(love, reach, burst) * guestHalo, min(youHalo + guestHalo, 1.0));

  vec4 result = over(field, halos);
  result = over(vec4(fit, 1.0) * 0.8 * disc(pixel, you, 3.0), result);
  result = over(vec4(mix(love, reach, burst), 1.0) * 0.8 * disc(pixel, guest, 3.0 + burst), result);

  vec2 room = max(vec2(max(you.x, size.x - you.x), pixel.y < you.y ? you.y : size.y - you.y), vec2(1.0));
  float fade = 1.0 - smoothstep(0.3, 1.0, length((pixel - you) / room));
  vec2 outside = max(max(quiet.xy - pixel, pixel - quiet.zw), 0.0);
  float hush = mix(0.35, 1.0, smoothstep(0.0, 90.0, length(outside)));
  outColor = result * fade * hush * dim;
}`;

const MAX_DPR = 2;
const CALL_EVERY = 6.5;
const FIRST_CALL = 0.6;
const FOLLOW = 0.3;
const LAYOUT_EVERY = 30;

type Point = [number, number];
type Pulse = [number, number, number];

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function link(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  console.warn(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

function tokens(): Record<"fit" | "love" | "reach" | "base", number[]> {
  const style = getComputedStyle(document.documentElement);
  const probe = document.createElement("canvas").getContext("2d");
  const read = (name: string) => {
    if (!probe) return [1, 1, 1];
    probe.fillStyle = style.getPropertyValue(name).trim() || "#ffffff";
    const hex = String(probe.fillStyle);
    return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
  };
  return { fit: read("--fit"), love: read("--love"), reach: read("--reach"), base: read("--ink-dim") };
}

export function EchoField() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const section = element?.parentElement;
    const gl = element?.getContext("webgl2", { premultipliedAlpha: true, antialias: false });
    if (!element || !section || !gl) return;
    const program = link(gl);
    if (!program) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const corner = gl.getAttribLocation(program, "corner");
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const at = (name: string) => gl.getUniformLocation(program, name);
    const uniform = {
      size: at("size"),
      dpr: at("dpr"),
      time: at("time"),
      you: at("you"),
      guest: at("guest"),
      call: at("call"),
      echo: at("echo"),
      born: at("born"),
      quiet: at("quiet"),
      dim: at("dim"),
      fit: at("fit"),
      love: at("love"),
      reach: at("reach"),
      base: at("base"),
    };

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const slot = document.getElementById(RESULTS_SLOT);
    let width = 0;
    let height = 0;
    let dpr = 1;
    let you: Point = [0, 0];
    let orbit = 120;
    let quiet = [0, 0, 0, 0];
    let guest: Point | null = null;
    let pointer: Point | null = null;
    let call: Pulse = [0, 0, FIRST_CALL - CALL_EVERY];
    let echo: Pulse = [0, 0, -100];
    let echoed = true;
    let dim = 1;

    const paint = () => {
      const colors = tokens();
      gl.uniform3fv(uniform.fit, colors.fit);
      gl.uniform3fv(uniform.love, colors.love);
      gl.uniform3fv(uniform.reach, colors.reach);
      gl.uniform3fv(uniform.base, colors.base);
    };

    const layout = () => {
      const box = element.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      if (box.width !== width || box.height !== height || ratio !== dpr) {
        width = box.width;
        height = box.height;
        dpr = ratio;
        element.width = Math.round(width * dpr);
        element.height = Math.round(height * dpr);
        gl.viewport(0, 0, element.width, element.height);
      }
      const rects = Array.from(section.querySelectorAll("[data-echo-quiet]"), (node) => node.getBoundingClientRect());
      quiet = rects.length
        ? [
            Math.min(...rects.map((rect) => rect.left)) - box.left,
            Math.min(...rects.map((rect) => rect.top)) - box.top,
            Math.max(...rects.map((rect) => rect.right)) - box.left,
            Math.max(...rects.map((rect) => rect.bottom)) - box.top,
          ]
        : [0, 0, 0, 0];
      const room = width - quiet[2];
      you = room >= 240 ? [quiet[2] + room / 2, (quiet[1] + quiet[3]) / 2] : [width * 0.82, height * 0.16];
      orbit = Math.min(Math.max(Math.min(room, height) * 0.34, 70), 230);
    };

    const roam = (time: number): Point => [
      you[0] + Math.cos(time * 0.23) * orbit * 1.15,
      you[1] + Math.sin(time * 0.31) * orbit * 0.8,
    ];

    const draw = (time: number) => {
      gl.uniform2f(uniform.size, width, height);
      gl.uniform1f(uniform.dpr, dpr);
      gl.uniform1f(uniform.time, time);
      gl.uniform2fv(uniform.you, you);
      gl.uniform2fv(uniform.guest, guest ?? roam(time));
      gl.uniform3fv(uniform.call, call);
      gl.uniform3fv(uniform.echo, echo);
      gl.uniform1f(uniform.born, still ? -100 : FIRST_CALL);
      gl.uniform4fv(uniform.quiet, quiet);
      gl.uniform1f(uniform.dim, dim);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const start = performance.now();
    let last = start;
    let frames = 0;
    let frame = 0;
    let running = false;

    const tick = (now: number) => {
      const time = (now - start) / 1000;
      const ease = 1 - Math.exp(-Math.min(now - last, 100) / 1000 / FOLLOW);
      last = now;
      if (++frames % LAYOUT_EVERY === 0) layout();

      const target = pointer ?? roam(time);
      guest = guest ? [guest[0] + (target[0] - guest[0]) * ease, guest[1] + (target[1] - guest[1]) * ease] : target;

      if (time - call[2] >= CALL_EVERY) {
        call = [you[0], you[1], time];
        echoed = false;
      }
      if (!echoed && CALL_SPEED * (time - call[2]) >= Math.hypot(guest[0] - call[0], guest[1] - call[1])) {
        echo = [guest[0], guest[1], time];
        echoed = true;
        const box = element.getBoundingClientRect();
        const detail: EchoDetail = {
          x: box.left + scrollX + guest[0],
          y: box.top + scrollY + guest[1],
          speed: ECHO_SPEED,
        };
        window.dispatchEvent(new CustomEvent(ECHO_EVENT, { detail }));
      }
      dim += ((slot?.childElementCount ? 0.3 : 1) - dim) * ease;

      draw(time);
      frame = requestAnimationFrame(tick);
    };

    const run = (on: boolean) => {
      if (on === running) return;
      running = on;
      if (on) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      } else cancelAnimationFrame(frame);
    };

    const follow = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const box = element.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      pointer = x >= 0 && y >= 0 && x <= box.width && y <= box.height ? [x, y] : null;
    };
    const release = () => {
      pointer = null;
    };

    paint();
    layout();

    const resized = new ResizeObserver(() => {
      layout();
      if (still) draw(0);
    });
    resized.observe(element);
    const themed = new MutationObserver(() => {
      paint();
      if (still) draw(0);
    });
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    if (still) {
      draw(0);
      return () => {
        resized.disconnect();
        themed.disconnect();
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      };
    }

    const seen = new IntersectionObserver(([entry]) => run(entry.isIntersecting));
    seen.observe(element);
    window.addEventListener("pointermove", follow, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);

    return () => {
      run(false);
      seen.disconnect();
      resized.disconnect();
      themed.disconnect();
      window.removeEventListener("pointermove", follow);
      document.documentElement.removeEventListener("pointerleave", release);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+3.5rem)] w-full"
    />
  );
}
