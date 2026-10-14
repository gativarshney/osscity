/**
 * Building facade shader. Windows are drawn procedurally per instance: a grid over
 * the side faces, each cell lit or not from a hash seeded by the instance and the
 * cell, so that the share of lit windows equals the project's 48 hour reply share.
 *
 * Per-instance attributes:
 *   aLight   share of windows that are lit, 0..1
 *   aWindow  window colour
 *   aState   0 normal, 1 dimmed by a search, 2 highlighted, 3 selected
 *   aSeed    random seed per building
 */

export const buildingVertex = /* glsl */ `
  attribute float aLight;
  attribute vec3 aWindow;
  attribute float aState;
  attribute float aSeed;

  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vFacade;
  varying vec3 vWindow;
  varying float vLight;
  varying float vState;
  varying float vSeed;
  varying float vHeight;
  varying vec3 vWorld;

  #include <fog_pars_vertex>

  void main() {
    // Scale from the instance matrix, so window cells keep a fixed size in metres.
    vec3 scale = vec3(
      length(instanceMatrix[0].xyz),
      length(instanceMatrix[1].xyz),
      length(instanceMatrix[2].xyz)
    );
    vLocal = position * scale;
    vHeight = scale.y;
    vNormal = normalize(mat3(instanceMatrix) * normal);
    #ifdef USE_INSTANCING_COLOR
      vFacade = instanceColor;
    #else
      vFacade = vec3(0.08, 0.1, 0.17);
    #endif
    vWindow = aWindow;
    vLight = aLight;
    vState = aState;
    vSeed = aSeed;

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

export const buildingFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uAccent;
  uniform vec3 uCamera;
  uniform float uDetail;

  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vFacade;
  varying vec3 vWindow;
  varying float vLight;
  varying float vState;
  varying float vSeed;
  varying float vHeight;
  varying vec3 vWorld;

  #include <fog_pars_fragment>

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec3 n = normalize(vNormal);
    float up = step(0.5, n.y);

    // Window grid on the side faces. Cells are 0.32 m wide and 0.42 m tall.
    float along = abs(n.x) > 0.5 ? vLocal.z : vLocal.x;
    float heightM = vLocal.y + vHeight * 0.5;
    vec2 cell = vec2(floor(along / 0.27), floor((heightM - 0.16) / 0.36));
    vec2 f = vec2(fract(along / 0.27), fract((heightM - 0.16) / 0.36));
    float face = abs(n.x) > 0.5 ? sign(n.x) * 3.0 : sign(n.z) * 7.0;
    float h = hash(cell + vec2(vSeed * 97.0 + face, vSeed * 13.0));

    // Inside the pane, leaving a frame.
    float pane = step(0.16, f.x) * step(f.x, 0.84) * step(0.2, f.y) * step(f.y, 0.8);
    // Nothing on the bottom strip or above the roofline.
    pane *= step(0.18, heightM) * step(heightM, vHeight - 0.12);
    float lit = step(h, vLight) * pane * (1.0 - up);

    // Twinkle: a slow pulse per window, and now and then one goes off for a moment.
    float pulse = 0.82 + 0.18 * sin(uTime * 0.7 + h * 40.0);
    float blink = step(0.985, hash(cell + vec2(floor(uTime * 0.25) + vSeed, face))) ;
    lit *= pulse * (1.0 - blink * 0.9);

    // Facade lighting: a little from the sky above, a little bounce from the ground.
    float sky = 0.55 + 0.45 * n.y;
    float bounce = (1.0 - clamp(heightM / 6.0, 0.0, 1.0)) * 0.35;
    vec3 base = vFacade * (0.7 + 0.6 * sky) + uAccent * bounce * 0.14;
    // Roof: slightly lighter, with a thin edge.
    vec3 roof = vFacade * 1.6 + vec3(0.02);
    vec3 colour = mix(base, roof, up);

    // Dark unlit panes, slightly reflective of the sky.
    colour = mix(colour, vFacade * 0.6 + vec3(0.01, 0.015, 0.03), pane * (1.0 - up) * 0.6);

    // Rim light from the camera direction so edges read against the dark.
    vec3 viewDir = normalize(uCamera - vWorld);
    float rim = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);

    float litGain = 1.6;
    if (vState > 2.5) {
      // Selected or current stop: a slow accent pulse, a strong rim, brighter windows.
      float beat = 0.45 + 0.2 * sin(uTime * 2.5);
      colour += uAccent * (beat + rim * 0.9);
      litGain = 2.2;
    } else if (vState > 1.5) {
      // Highlighted by a search or a mode.
      colour += uAccent * (0.14 + rim * 0.5);
      litGain = 1.9;
    } else if (vState > 0.5) {
      // Dimmed: the facade fades and most windows go out.
      colour *= 0.3;
      litGain = 0.25;
    } else {
      colour += uAccent * rim * 0.08;
    }
    colour += vWindow * lit * litGain;

    gl_FragColor = vec4(colour, 1.0);
    #include <fog_fragment>
  }
`;

/** District plates on the ground, with a soft lit edge. */
export const plateVertex = /* glsl */ `
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

export const plateFragment = /* glsl */ `
  uniform vec2 uSize;
  uniform vec3 uColour;
  uniform vec3 uEdge;
  uniform float uGlow;
  uniform float uTime;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    // Distance to the nearest edge in metres.
    vec2 d = min(vUv, 1.0 - vUv) * uSize;
    float edge = min(d.x, d.y);
    float glow = smoothstep(1.4, 0.0, edge) * uGlow;
    float line = smoothstep(0.16, 0.0, edge);
    float drift = 0.85 + 0.15 * sin(uTime * 0.4 + vUv.x * 6.0 + vUv.y * 4.0);
    vec3 colour = uColour + uEdge * (glow * 0.35 * drift + line * 0.9);
    gl_FragColor = vec4(colour, 1.0);
    #include <fog_fragment>
  }
`;

/** Night sky gradient on the inside of a sphere. */
export const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    float t = pow(clamp(h / 1.0, 0.0, 1.0), 0.55);
    vec3 colour = mix(uHorizon, uTop, t);
    // City glow just above the horizon.
    float band = exp(-abs(vDir.y - 0.02) * 14.0);
    colour += uGlow * band * 0.35;
    gl_FragColor = vec4(colour, 1.0);
  }
`;
