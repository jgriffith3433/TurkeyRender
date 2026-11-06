#ifndef MV_FEATHER_MOUND
#define MV_FEATHER_MOUND
#include "MVFeatherLib.hlsl"
// The mountain. One height function, used by the skin mesh and every card, so draining is one number and a pure function of it.
CBUFFER_START(UnityPerMaterial)
float4 _ColorA, _ColorB, _Dent;   // dent: x, z, radius, depth
float _R, _H, _Drain, _FlowT, _Card, _HoleW, _HoleH, _Thin, _Seed, _Slope, _Pattern;
CBUFFER_END

float Smin(float a, float b, float k) { float h = saturate(.5 + .5 * (b - a) / k); return lerp(b, a, h) - k * h * (1 - h); }

float Lumps(float2 p, float q)
{
    float s = _Seed;
    float v = sin(p.x * .11 + s) * sin(p.y * .13 + s * 1.7) + .55 * sin(p.x * .27 - p.y * .21 + s * 3.1) + .3 * sin(p.x * .61 + p.y * .53 + s * .7);
    return v * _H * .035 * smoothstep(.04, .3, q) * (1 - q);
}

float Bottom(float d) { return -_H * pow(saturate(d * 1.65), .8); }

float Surface(float2 p)
{
    float r = length(p), q = saturate(r / _R);
    float m = -_H * q * q * (3 - 2 * q) + Lumps(p, q);
    float2 dd = (p - _Dent.xy) / max(_Dent.z, .01);
    m -= _Dent.w * exp(-dot(dd, dd));
    float d = _Drain;
    if (d <= 0) return m;
    // Hourglass: a narrow cone of repose opens at the summit and bites down; the rest of the pile only sinks late.
    float lower = _H * 1.15 * pow(d, 2.6);
    float cone = Bottom(d) + _Slope * r + (1 - saturate(d * 25)) * _H;
    return max(Smin(m - lower, cone, _H * .08), -_H);
}

float EdgeOf(float d) { return _R * saturate(pow(max(d, 0), .62) * 1.04); }

float Hole(float2 p, float d)
{
    float open = smoothstep(.45, .72, d);
    return max(abs(p.x) - _HoleW * open, abs(p.y) - _HoleH * open);   // negative inside the screen
}

struct A
{
    float4 p : POSITION;       // rest x, 0, rest z
    float2 uv : TEXCOORD0;     // card corner, x -1..1, y 0..1
    float4 d : TEXCOORD1;      // x seed, y size, z yaw, w tilt
};

MVF Vert(A i)
{
    MVF o = (MVF)0;
    float2 p = i.p.xz;
    float d = _Drain;
    float keep = 1;
    if (_Card > .5 && d > 0)
    {
        // Inside the crater a card slides down the funnel, spiralling, and starts again at the rim: a loop in flow time, so it scrubs.
        float r0 = length(p), a0 = atan2(p.y, p.x), e = EdgeOf(d);
        float inside = 1 - smoothstep(e * .9, e, r0);
        if (inside > 0)
        {
            float ph = frac(i.d.x * 7.13 + _FlowT * (.6 + .5 * frac(i.d.x * 3.7)));
            float r = lerp(r0, e * (1 - ph), inside);
            float a = a0 + inside * (1.2 / (r / max(e, .01) + .18));
            p = float2(cos(a), sin(a)) * r;
            keep = smoothstep(0, .06, ph) * smoothstep(1, .92, ph);
            // Everything converges here: thin the cards out or the overdraw stalls the GPU.
            keep *= lerp(1, step(frac(i.d.x * 17.3), .25) * saturate(r / max(e, .01) * 4 + .15), inside);
        }
    }
    float y = Surface(p);
    float e2 = max(.05, length(p) * .01);
    float3 nos = normalize(float3(y - Surface(p + float2(e2, 0)), e2, y - Surface(p + float2(0, e2))));
    float thick = y + _H;

    float3 os, nf;
    if (_Card > .5)
    {
        float yaw = i.d.z, seed = i.d.x, size = i.d.y * keep;
        if (d > 0 && (thick < .05 || Hole(p, d) < 0)) size = 0;
        float3 dn = normalize(float3(p.x, 0, p.y) + 1e-3);
        float3 t = normalize(float3(cos(yaw), 0, sin(yaw)) + dn * .9);
        t = normalize(t - nos * dot(t, nos));
        float3 s = cross(nos, t);
        float3 D = normalize(t + nos * i.d.w);
        float3 f = normalize(cross(D, s));
        if (dot(f, nos) < 0) f = -f;
        float u = i.uv.x, v = i.uv.y;
        float bend = v * v * .22;
        os = float3(p.x, y, p.y) + nos * (i.d.w * size * .08) + D * (v * size) + f * (bend * size) + s * (u * size * .24);
        nf = normalize(f - D * bend * .9 + s * u * .3);
        o.uv = float2(u * .5 + .5, v);
        o.col = float4(lerp(_ColorA.rgb, _ColorB.rgb, frac(seed * 11.3)) * (.84 + .16 * frac(seed * 41.7)), lerp(.5, 1, smoothstep(0, .6, v)));
    }
    else
    {
        os = float3(p.x, y, p.y); nf = nos;
        o.uv = p; o.col = float4(_ColorA.rgb, 1);
    }
    o.extra = float4(p, thick, 0);
    return MVFinish(o, MVRawWorld(os), normalize(MVRawWorldDir(nf)));
}

// The far surface: scattered feathers in a stochastic tile, big and small, so the hill reads as feathers from any distance.
float Scatter(float2 uv, float lod, out float2 slope)
{
    float best = 0; slope = 0;
    float2 id = floor(uv);
    for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++)
    {
        float2 c = id + float2(x, y) - .5;
        float h = MVH2(c), a = h * 6.283;
        float2 q = uv - c - float2(MVH2(c + 3.1), MVH2(c + 7.3)) * .6 - .2;
        q = float2(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a));
        float2 f = float2(q.x * 2.6 + .5, q.y * 1.1 + .5);
        if (any(f < 0) || any(f > 1)) continue;
        float4 t = SAMPLE_TEXTURE2D_LOD(_FeatherTex, sampler_FeatherTex, f, lod);
        float v = t.a * (.45 + .55 * t.r) * (.6 + .4 * h);
        if (v > best) { best = v; slope = float2(cos(a), sin(a)) * (f.x - .5); }
    }
    return best;
}

void Cut(MVF i)
{
    if (_Drain > 0) { clip(Hole(i.extra.xy, _Drain) + 1e-3); clip(i.extra.z - .02); }
    if (_Card > .5) clip(SAMPLE_TEXTURE2D(_FeatherTex, sampler_FeatherTex, i.uv).a - .5);
}

half4 FragForward(MVF i, bool front : SV_IsFrontFace) : SV_Target
{
    Cut(i);
    float3 n = normalize(i.nw);
    if (_Card > .5)
    {
        half4 t = SAMPLE_TEXTURE2D(_FeatherTex, sampler_FeatherTex, i.uv);
        if (!front) n = -n;
        return MVLight(i.ws, n, i.col.rgb * t.r, i.col.a, _Thin, .2, i.pos);
    }
    float2 p = i.extra.xy;
    float dist = length(i.ws - GetCameraPositionWS());
    float2 s1, s2;
    float scale = _Pattern;
    float lod1 = clamp(log2(dist * .35 / scale + 1), 0, 6);
    float a = Scatter(p / scale, lod1, s1), b = Scatter(p / (scale * 7) + 3.3, lod1 * .5, s2);
    float h = max(a, b * .85);
    float3 nn = normalize(n + float3(s1.x + s2.x, 0, s1.y + s2.y) * .55);
    float3 alb = lerp(_ColorB.rgb, _ColorA.rgb, .45 + .55 * h) * (.55 + .45 * h);
    return MVLight(i.ws, nn, alb, .55 + .45 * h, 0, .15, i.pos);
}
half4 FragDepth(MVF i) : SV_Target { Cut(i); return i.pos.z; }
half4 FragNormal(MVF i) : SV_Target { Cut(i); return half4(normalize(i.nw), 0); }
#endif
