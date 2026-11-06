#ifndef MV_FEATHER_COAT
#define MV_FEATHER_COAT
#include "MVFeatherLib.hlsl"
// The coat: every card is collapsed on one skin point, skinned rigidly, and opened here along the skinned normal and tangent.
CBUFFER_START(UnityPerMaterial)
float4 _ColorA, _ColorB, _StripTo;
float _Amount, _Band, _Lay, _SizeMul, _Strip, _Sway, _Thin, _Curl;
CBUFFER_END

struct A
{
    float4 p : POSITION; float3 n : NORMAL; float4 t : TANGENT;
    float2 uv : TEXCOORD0;   // x across -1..1, y along 0..1
    float4 d : TEXCOORD1;    // x threshold, y seed, z length, w width
    float2 e : TEXCOORD2;    // x seed for tearing off
};

MVF Vert(A i)
{
    MVF o = (MVF)0;
    float3 root = MVRawWorld(i.p.xyz);
    float3 N = normalize(MVRawWorldDir(i.n)), T = MVRawWorldDir(i.t.xyz);
    T = normalize(T - N * dot(T, N));
    float3 S = cross(N, T);

    float g = saturate((_Amount - i.d.x) / max(_Band, 1e-4));
    if (_Amount <= 0 || g <= 0) { o.pos = float4(0, 0, -2, 1); return o; }
    float seed = i.d.y, u = i.uv.x, v = i.uv.y;
    float grow = 1 - pow(1 - g, 3);                       // pushes out quickly, then slows
    float over = sin(saturate(g * 1.3 - .3) * PI) * .1;   // and overshoots a little as it settles
    float L = i.d.z * _SizeMul * (grow + over);
    float wide = i.d.w * _SizeMul * (.1 + .9 * smoothstep(.3, .95, g));   // a quill first, then the vane unfurls
    float lay = lerp(.1, _Lay, smoothstep(.15, 1, g));    // stands out of the skin, then lies down

    float t = _MV_SceneTime * (1.3 + seed) + seed * 40;
    float sway = _Sway * (sin(t) * .6 + sin(t * 2.3 + 1.7) * .4);
    float3 D = normalize(lerp(N, T, lay) + S * (seed - .5) * .5 + N * sway * .25);
    float3 side = normalize(cross(N, D) + S * .001);
    float3 fold = normalize(cross(D, side));
    if (dot(fold, N) < 0) fold = -fold;

    // A feather is curved: it leaves the skin and bends back toward it.
    float bend = _Curl * v * v;
    float3 p = root + D * (L * v) - fold * (bend * L * .35) + side * (u * wide * .5);
    p += N * .002;
    float3 n = normalize(fold + D * (bend * .6) - side * u * .4);

    // Torn off: flies to the point, tumbling, until it is gone.
    float s = saturate((_Strip - i.e.x * .85) / .15);
    if (_Strip > 0 && s > 0)
    {
        float3 ax = normalize(float3(seed - .5, frac(seed * 7.3) - .5, frac(seed * 3.1) - .5) + 1e-3);
        float a = s * (6 + seed * 14);
        float e = s * s * (3 - 2 * s);
        float3 to = _StripTo.xyz;
        float3 mid = lerp(root, to, .5) + ax * length(to - root) * .22;
        float3 path = lerp(lerp(root, mid, e), lerp(mid, to, e), e);
        p = path + MVRot(p - root, ax, a) * (1 - pow(s, 6));
        n = MVRot(n, ax, a);
    }

    o.uv = float2(u * .5 + .5, v);
    o.col = float4(lerp(_ColorA.rgb, _ColorB.rgb, frac(seed * 13.7)) * (.82 + .18 * frac(seed * 29.1)), lerp(.45, 1, smoothstep(0, .55, v)));
    o.extra = float4(seed, 0, 0, 0);
    return MVFinish(o, p, n);
}

half4 FragForward(MVF i, bool front : SV_IsFrontFace) : SV_Target
{
    half4 t = SAMPLE_TEXTURE2D(_FeatherTex, sampler_FeatherTex, i.uv);
    clip(t.a - .5);
    float3 n = normalize(i.nw); if (!front) n = -n;
    return MVLight(i.ws, n, i.col.rgb * t.r, i.col.a, _Thin, .22, i.pos);
}
half4 FragDepth(MVF i) : SV_Target { clip(SAMPLE_TEXTURE2D(_FeatherTex, sampler_FeatherTex, i.uv).a - .5); return i.pos.z; }
half4 FragNormal(MVF i) : SV_Target { clip(SAMPLE_TEXTURE2D(_FeatherTex, sampler_FeatherTex, i.uv).a - .5); return half4(normalize(i.nw), 0); }
#endif
