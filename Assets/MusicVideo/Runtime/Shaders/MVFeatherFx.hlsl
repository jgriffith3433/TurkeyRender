#ifndef MV_FEATHER_FX
#define MV_FEATHER_FX
#include "MVFeatherLib.hlsl"
// Loose feathers. No particle system: each one's position is written down as a function of time, so slow motion and scrubbing are free.
CBUFFER_START(UnityPerMaterial)
float4 _ColorA, _ColorB, _P0, _P1, _P2;
float _Mode, _Age, _Dur, _Height, _Radius, _Spread, _Size, _Life, _Thin, _Floor, _Drag, _Swirl;
CBUFFER_END

struct A { float4 p : POSITION; float2 uv : TEXCOORD0; float4 d : TEXCOORD1; };   // d: four seeds

float3 Bez(float3 a, float3 b, float3 c, float t) { float u = 1 - t; return a * u * u + b * 2 * u * t + c * t * t; }

MVF Vert(A i)
{
    MVF o = (MVF)0;
    float s0 = i.d.x, s1 = i.d.y, s2 = i.d.z, s3 = i.d.w;
    float3 pos; float size = _Size * (.55 + .9 * s1); float vis = 1;
    float t = _Age;
    if (_Mode < .5)
    {
        // Crown: a thin ring thrown up and out. Drag eats the speed fast, then it drifts down, swaying.
        t = max(0, t - s3 * .06);
        float k = _Drag * (.7 + .6 * s2);
        float a = s0 * 6.2832;
        float3 dir = float3(cos(a), 0, sin(a));
        float hgt = _Height * (.25 + .85 * (1 - pow(1 - s2, 2.2)));
        float vr = _Radius * k * (.45 + .75 * s3);
        float drift = 1 - exp(-k * t);
        float fall = .55 + .75 * s3;                               // terminal speed, nearly a float
        float y = hgt * drift - fall * max(0, t - .35 / k);
        float r = .25 * _Radius + vr / k * drift;
        float wob = t * (1.2 + s0 * 1.6) + s1 * 40;
        pos = _P0.xyz + dir * r + float3(sin(wob) * .35, y, cos(wob * .8) * .35) * smoothstep(.2, 1.4, t);
        if (pos.y < _Floor) { size *= saturate(1 - (_Floor - pos.y) * .6); pos.y = _Floor; }
        t *= 2.1;
    }
    else
    {
        // Stream: a path from a source to a point, cards looping along it. It starts at the source and only ends when told to.
        float life = _Life * (.75 + .5 * s2);
        float ph = _Age / life + s0;
        float f = frac(ph);                                        // how far along this card is now
        float born = _Age - f * life;                              // when it left the source
        vis = (born >= 0 && born <= _Dur) ? 1 : 0;
        float e = lerp(f, f * f * (3 - 2 * f), .5);
        float a = s1 * 6.2832 + e * _Swirl;
        float3 c = Bez(_P0.xyz, _P1.xyz, _P2.xyz, e);
        float3 tang = normalize(Bez(_P0.xyz, _P1.xyz, _P2.xyz, e + .02) - c + 1e-4);
        float3 up = normalize(cross(tang, float3(.31, .77, .55)));
        float3 rt = cross(tang, up);
        float rad = _Spread * (.2 + .8 * sqrt(s3)) * sin(saturate(e * 1.3 + .08) * PI * .9 + .15);
        pos = c + (up * cos(a) + rt * sin(a)) * rad;
        size *= smoothstep(0, .06, f) * smoothstep(1, .9, f);
        t = f * life * 3;
    }
    // Each card tumbles on its own axis.
    float3 ax = normalize(float3(s0 - .5, s2 - .5, s3 - .5) + 1e-3);
    float3 ax2 = normalize(cross(ax, float3(.3, .9, .2)));
    float ang = t * (2 + 3 * s1) + s2 * 20;
    float3 D = MVRot(ax2, ax, ang);
    float3 S = normalize(cross(D, ax));
    float3 N = cross(S, D);
    float u = i.uv.x, v = i.uv.y;
    float bend = v * v * .25;
    float3 p = pos + (D * (v - .5) + N * bend + S * (u * .24)) * size * vis;
    o.uv = float2(u * .5 + .5, v);
    o.col = float4(lerp(_ColorA.rgb, _ColorB.rgb, s3) * (.85 + .15 * s2), lerp(.6, 1, v));
    return MVFinish(o, p, normalize(N - D * bend + S * u * .3));
}

half4 FragForward(MVF i, bool front : SV_IsFrontFace) : SV_Target
{
    half4 t = SAMPLE_TEXTURE2D(_FeatherTex, sampler_FeatherTex, i.uv);
    clip(t.a - .5);
    float3 n = normalize(i.nw); if (!front) n = -n;
    return MVLight(i.ws, n, i.col.rgb * t.r, i.col.a, _Thin, .2, i.pos);
}
half4 FragDepth(MVF i) : SV_Target { clip(SAMPLE_TEXTURE2D(_FeatherTex, sampler_FeatherTex, i.uv).a - .5); return i.pos.z; }
half4 FragNormal(MVF i) : SV_Target { clip(SAMPLE_TEXTURE2D(_FeatherTex, sampler_FeatherTex, i.uv).a - .5); return half4(normalize(i.nw), 0); }
#endif
