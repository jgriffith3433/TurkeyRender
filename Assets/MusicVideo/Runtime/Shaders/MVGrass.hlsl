#ifndef MV_GRASS_INCLUDED
#define MV_GRASS_INCLUDED
// One blade: a constant-curvature arc, so its length never changes however hard the wind or a hand bends it.
// Everything here is a pure function of the root, the blade's numbers and _MV_SceneTime. Nothing remembers a frame.
#include "MVWarp.hlsl"

CBUFFER_START(UnityPerMaterial)
float4 _Dark, _Mid, _Tip, _Dry, _Soil, _FlowerA, _FlowerB;
float _Wind, _WindAngle, _WindScale, _Lean;
CBUFFER_END
float4 _MV_GrassPush[8]; // xyz world, w radius
float _MV_GrassPushN;

struct GrassIn { float3 root : POSITION; float4 shape : TANGENT; float4 uv : TEXCOORD0; };
// shape: xy which way it faces, z height, w width. uv: x across -1..1, y along 0..1 (-1 for the ground), z,w random.
// A flower head rides the tip of its stem: uv.y is 2 + the corner's y and uv.x its x, on a disc of radius w; z,w and the shape match the stem so the wind moves both alike.

float GNoise(float2 p)
{
    float2 i = floor(p), f = frac(p); f = f * f * (3 - 2 * f);
    float2 k = float2(127.1, 311.7);
    float a = frac(sin(dot(i, k)) * 43758.5453), b = frac(sin(dot(i + float2(1, 0), k)) * 43758.5453);
    float c = frac(sin(dot(i + float2(0, 1), k)) * 43758.5453), d = frac(sin(dot(i + float2(1, 1), k)) * 43758.5453);
    return lerp(lerp(a, b, f.x), lerp(c, d, f.x), f.y);
}
float GFbm(float2 p) { return GNoise(p) * .55 + GNoise(p * 2.13 + 3.1) * .3 + GNoise(p * 4.37 + 7.7) * .15; }

// A soft sway: slow swells moving across the lawn, and a small flutter of its own on each blade.
float2 GrassWind(float3 ws, float rnd)
{
    float t = _MV_SceneTime;
    float2 dir = float2(cos(_WindAngle), sin(_WindAngle)), side = float2(-dir.y, dir.x);
    float2 xz = ws.xz * _WindScale;
    float along = dot(xz, dir) * 1.1 - t * 1.3;
    float swell = .5 + .5 * sin(along + 1.7 * sin(dot(xz, side) * .6 + t * .23));
    float gust = .5 + .5 * sin(along * .37 + dot(xz, side) * .3 - t * .41);
    swell = swell * swell * (.45 + .55 * gust);
    float flutter = sin(t * 3.1 + rnd * 40) * .05 + sin(t * 5.3 + rnd * 91) * .025;
    return (dir * (.25 + .75 * swell) + side * flutter * 2) * _Wind + dir * flutter * _Wind;
}

void GrassPoint(GrassIn v, out float3 ws, out float3 n, out float along)
{
    along = v.uv.y;
    bool head = along > 1.05; float hy = along - 2; if (head) along = 1;
    float3 root = mul(GetObjectToWorldMatrix(), float4(v.root, 1)).xyz;
    if (along < 0) { ws = MVWarpWS(root); n = float3(0, 1, 0); return; }
    float2 face = v.shape.xy; float h = v.shape.z, w = v.shape.w, rnd = v.uv.z;

    float2 bend = face * (_Lean * (.35 + 1.1 * v.uv.w)) + GrassWind(root, rnd);
    int pn = (int)_MV_GrassPushN;
    for (int i = 0; i < pn; i++)
    {
        float4 p = _MV_GrassPush[i];
        float2 d = root.xz - p.xz; float dl = length(d) + 1e-4;
        float above = saturate(1.4 - (p.y - root.y - h) / max(p.w, .01));    // only what can reach it
        float f = saturate(1.25 - dl / p.w); f = f * f * above;
        bend += d / dl * f * 2.6;
    }
    float b = max(length(bend), 1e-3);
    float2 dir = bend / b;
    float ang = b * along, sa, ca; sincos(ang, sa, ca);
    float3 D = float3(dir.x, 0, dir.y);
    float3 center = root + D * (h * (1 - ca) / b) + float3(0, h * sa / b, 0);
    float3 T = D * sa + float3(0, ca, 0);
    float3 S = float3(-face.y, 0, face.x); S = normalize(S - T * dot(S, T) + float3(1e-4, 0, 0));
    float3 N = cross(S, T);
    if (head) { float3 up = normalize(float3(0, 1, 0) + T), X = normalize(cross(up, float3(.3, 0, 1))), Y = cross(up, X); ws = MVWarpWS(center + (X * v.uv.x + Y * hy) * w + up * (.004 * (1 - v.uv.x * v.uv.x - hy * hy))); n = up; return; }
    float taper = (1 - pow(abs(along), 3)) * saturate(.55 + along * 3.5);
    float x = v.uv.x;
    float3 p2 = center + S * (x * w * taper) + N * ((1 - abs(x)) * w * taper * .28 - .5 * w * taper * .28); // folded along the midrib
    ws = MVWarpWS(p2);
    n = normalize(N - S * x * .55);
}
#endif
