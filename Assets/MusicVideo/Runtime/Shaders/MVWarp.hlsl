#ifndef MV_WARP_INCLUDED
#define MV_WARP_INCLUDED
// Injected into a copy of URP Lit: every surface in the world bends toward the TV, and the shading can go toon.
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

float3 _MV_SuckPos;
float _MV_Suck, _MV_Twist, _MV_Wave, _MV_Radius, _MV_SceneTime, _MV_Toon, _MV_Stretch;

float3 MVWarpWS(float3 p)
{
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

half4 MVPBR(InputData i, SurfaceData s)
{
    half4 c = UniversalFragmentPBR(i, s);
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
