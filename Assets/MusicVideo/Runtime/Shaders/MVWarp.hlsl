#ifndef MV_WARP_INCLUDED
#define MV_WARP_INCLUDED
// Injected into a copy of URP Lit: every surface in the world bends toward the TV, and the shading can go toon.
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

float3 _MV_SuckPos;
float _MV_Suck, _MV_Twist, _MV_Wave, _MV_Radius, _MV_SceneTime, _MV_Toon, _MV_Stretch, _MV_Clay, _MV_Skin, _MV_SunRim, _MV_FaceFill, _MV_Catch;

// Plasticine: a lumpy skin re-sculpted on every step of stop motion, so surfaces boil like a thing touched between frames.
float MVClayH(float3 p) { return frac(sin(dot(p, float3(127.1, 311.7, 74.7))) * 43758.5453); }
float MVClayN(float3 p)
{
    float3 i = floor(p), f = frac(p); f = f * f * (3 - 2 * f);
    return lerp(lerp(lerp(MVClayH(i), MVClayH(i + float3(1, 0, 0)), f.x), lerp(MVClayH(i + float3(0, 1, 0)), MVClayH(i + float3(1, 1, 0)), f.x), f.y),
                lerp(lerp(MVClayH(i + float3(0, 0, 1)), MVClayH(i + float3(1, 0, 1)), f.x), lerp(MVClayH(i + float3(0, 1, 1)), MVClayH(i + float3(1, 1, 1)), f.x), f.y), f.z);
}

float3 MVWarpWS(float3 p)
{
    if (_MV_Clay > 0)
    {
        float frame = floor(_MV_SceneTime * 48);
        float3 q = p * 13 + float3(0, 0, frac(frame * .137) * 7);
        p += (float3(MVClayN(q), MVClayN(q + 17.3), MVClayN(q + 41.9)) - .5) * .009 * _MV_Clay;
    }
    if (_MV_Suck == 0 && _MV_Twist == 0 && _MV_Wave == 0) return p;
    float3 d = p - _MV_SuckPos;
    float r = length(d) + 0.001;
    float f = saturate(_MV_Radius / r);
    float near = f * f;

    // Rotate around the axis through the TV, harder the closer it is.
    float a = _MV_Twist * near;
    float s = sin(a), c = cos(a);
    d.xy = float2(d.x * c - d.y * s, d.x * s + d.y * c);

    // Pull in, with a stretch that leaves the far end behind.
    float pull = saturate(_MV_Suck * near);
    d *= 1 - pull * (1 - 0.05 * saturate(1 - _MV_Stretch));

    float3 q = _MV_SuckPos + d;
    q += _MV_Wave * float3(sin(p.y * 1.3 + _MV_SceneTime * 2.1), sin(p.x * 1.1 + p.z * .7 + _MV_SceneTime * 1.7), sin(p.z * 1.2 - _MV_SceneTime * 2.4)) * 0.25;
    return q;
}

VertexPositionInputs MVInputs(float3 os)
{
    VertexPositionInputs i;
    i.positionWS = MVWarpWS(TransformObjectToWorld(os));
    i.positionVS = TransformWorldToView(i.positionWS);
    i.positionCS = TransformWorldToHClip(i.positionWS);
    float4 n = i.positionCS * 0.5;
    i.positionNDC.xy = float2(n.x, n.y * _ProjectionParams.x) + n.w;
    i.positionNDC.zw = i.positionCS.zw;
    return i;
}
float4 MVHClip(float3 os) { return TransformWorldToHClip(MVWarpWS(TransformObjectToWorld(os))); }
float3 MVToWorld(float3 os) { return MVWarpWS(mul(GetObjectToWorldMatrix(), float4(os, 1)).xyz); }

// Sunlight the PBR doesn't give us. "skin": light wrapping past the terminator, reddened, the way it scatters under skin, on warm albedos.
// "sunRim": sun on the silhouette, strongest with the sun behind the subject. Both 0 by default. The shadow is read a little toward the sun,
// so a surface's own back doesn't kill the wrap but a house still blocks it.
half3 MVSunSoft(InputData i, SurfaceData s)
{
    Light L0 = GetMainLight();
    float3 ld = L0.direction, n = i.normalWS, v = i.viewDirectionWS, a = s.albedo;
    Light L = GetMainLight(TransformWorldToShadowCoord(i.positionWS + ld * .14 + n * .03));
    float sh = L.shadowAttenuation * L.distanceAttenuation, nl = dot(n, ld);
    float skin = saturate((a.r - a.b * 1.35) / max(a.r, .02) * 2.2) * smoothstep(.06, .2, a.r);
    float band = saturate((nl + .45) / 1.45); band *= band;
    half3 o = a * L0.color * sh * max(0, band - saturate(nl)) * float3(1, .42, .26) * skin * _MV_Skin;
    o += a * i.bakedGI * float3(.35, .12, .06) * skin * _MV_Skin;
    float fres = pow(1 - saturate(dot(n, v)), 3.5), behind = saturate(dot(-v, ld) * .5 + .55);
    o += (a * .6 + .12) * L0.color * sh * fres * (.25 + behind) * saturate(nl * .6 + .5) * _MV_SunRim;
    return o;
}

// Lights that go where the camera goes, because a directional can't. "faceFill": a big soft source at the lens, on warm albedos only, no shadow, so eye sockets never go black.
// "catch": a small softbox above the lens, seen only in wet surfaces (smoothness over .8, the eyes), so they are never dead. Both 0 by default; both pure of the camera and the normal.
half3 MVLens(InputData i, SurfaceData s)
{
    float3 n = i.normalWS, v = i.viewDirectionWS, a = s.albedo;
    float skin = saturate((a.r - a.b * 1.35) / max(a.r, .02) * 2.2) * smoothstep(.06, .2, a.r);
    float f = saturate(dot(n, v));
    half3 o = a * float3(1, .94, .9) * skin * (.35 + .65 * f * f) * _MV_FaceFill;
    float wet = smoothstep(.8, .87, s.smoothness);
    if (wet > 0 && _MV_Catch > 0)
    {
        float3 ld = normalize(v + UNITY_MATRIX_V[1].xyz * .1 + UNITY_MATRIX_V[0].xyz * .07);
        float d = saturate(dot(n, normalize(ld + v)));
        o += float3(1, .98, .95) * wet * _MV_Catch * smoothstep(.9975, .9988, d) * 4;
    }
    return o;
}

half4 MVPBR(InputData i, SurfaceData s)
{
    if (_MV_Clay > 0)
    {
        // Fingerprints and tool marks in the light, not in the texture.
        float3 w = i.positionWS * 95;
        float frame = floor(_MV_SceneTime * 48);
        float3 g = float3(MVClayN(w + 3.1), MVClayN(w + 19.7), MVClayN(w + 37.3)) - .5;
        float3 g2 = float3(MVClayN(w * .22 + frame * .3), MVClayN(w * .22 + 9.1), MVClayN(w * .22 + 27.1)) - .5;
        i.normalWS = normalize(i.normalWS + (g * .42 + g2 * .8) * _MV_Clay);
        s.smoothness = lerp(s.smoothness, .34, _MV_Clay);
    }
    half4 c = UniversalFragmentPBR(i, s);
#ifndef MV_GRASS_INCLUDED
    if (_MV_Skin > 0 || _MV_SunRim > 0) c.rgb += MVSunSoft(i, s);
    if (_MV_FaceFill > 0 || _MV_Catch > 0) c.rgb += MVLens(i, s);
#endif
    if (_MV_Toon > 0)
    {
        half l = max(max(c.r, c.g), c.b) + 1e-4;
        half steps = 4;
        half q = (floor(saturate(l) * steps) + 0.5) / steps;
        half3 toon = c.rgb / l * q + s.emission;
        c.rgb = lerp(c.rgb, toon, _MV_Toon);
    }
    return c;
}

#define GetVertexPositionInputs MVInputs
#define TransformObjectToHClip MVHClip
#define TransformObjectToWorld MVToWorld
#define UniversalFragmentPBR MVPBR
#endif
