#ifndef MV_STRETCH
#define MV_STRETCH
#include "MVFeatherLib.hlsl"
// Spaghettification. Each vertex has an order; when the amount reaches it, that part of him is drawn out along the line from
// his body to the point and pinched thin. Parts not reached yet stay as they are, so what joins them is a long thinning tube.
TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
CBUFFER_START(UnityPerMaterial)
float4 _BaseColor, _To, _Anchor, _Glow, _BaseMap_ST;
float _Amount, _Span, _Lines, _Thin;
CBUFFER_END

struct A
{
    float4 p : POSITION; float3 n : NORMAL;
    float2 uv : TEXCOORD0;
    float2 o : TEXCOORD3;      // x order 0..1, y seed
};

MVF Vert(A i)
{
    MVF o = (MVF)0;
    float3 ws = MVRawWorld(i.p.xyz);
    float3 N = normalize(MVRawWorldDir(i.n));
    float k = saturate((_Amount * (1 + _Span) - i.o.x) / _Span);
    float e = k * k * (3 - 2 * k);
    float3 to = _To.xyz, an = _Anchor.xyz;
    float L = length(to - an) + 1e-3;
    float3 ax = (to - an) / L;
    float3 rel = ws - an;
    float al = dot(rel, ax);
    float3 perp = rel - ax * al;
    float thin = lerp(1, _Thin, pow(e, .7));
    // Stretch along the line: the near end runs ahead, and it all arrives at the point.
    float along = lerp(al, L, pow(e, 2.4));
    float3 p = an + ax * along + perp * thin;
    o.uv = i.uv;
    o.col = float4(1, 1, 1, 1);
    o.extra = float4(e, i.o.y, 0, 0);
    return MVFinish(o, p, N);
}

float Lines(float4 pos, float e, float seed)
{
    // Scan lines on the screen: more of him is gone the further along he is.
    float y = pos.y / _ScreenParams.y * _Lines;
    float id = floor(y), f = y - id;
    float w = lerp(1.01, .42, smoothstep(.02, .7, e));
    return w - abs(f - .5) * 2 + (MVH2(float2(id, floor(seed * 5))) - .5) * .1 * step(.02, e);
}

half4 FragForward(MVF i) : SV_Target
{
    float e = i.extra.x;
    clip(Lines(i.pos, e, i.extra.y));
    half3 alb = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv).rgb * _BaseColor.rgb;
    half4 c = MVLight(i.ws, normalize(i.nw), alb, 1, 0, .3, i.pos);
    float y = floor(i.pos.y / _ScreenParams.y * _Lines);
    float flick = .6 + .8 * MVH2(float2(y, floor(_MV_SceneTime * 24)));
    c.rgb = lerp(c.rgb, c.rgb * .3 + _Glow.rgb * flick, smoothstep(.04, .6, e));
    return c;
}
half4 FragDepth(MVF i) : SV_Target { clip(Lines(i.pos, i.extra.x, i.extra.y)); return i.pos.z; }
half4 FragNormal(MVF i) : SV_Target { clip(Lines(i.pos, i.extra.x, i.extra.y)); return half4(normalize(i.nw), 0); }
#endif
