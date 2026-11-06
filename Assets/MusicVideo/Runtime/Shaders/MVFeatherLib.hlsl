#ifndef MV_FEATHER_LIB
#define MV_FEATHER_LIB
// Shared by the feather shaders: cards built in the vertex shader from time and a few numbers, lit like everything else.
// A vertex program includes this, then fills an MVF struct and calls MVFinish.
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
#include "MVWarp.hlsl"

TEXTURE2D(_FeatherTex); SAMPLER(sampler_FeatherTex);

#ifdef MV_SHADOW
float3 _LightDirection; float3 _LightPosition;
#endif

struct MVF
{
    float4 pos : SV_POSITION;
    float2 uv : TEXCOORD0;      // feather texture
    float3 ws : TEXCOORD1;
    float3 nw : TEXCOORD2;
    float4 col : TEXCOORD3;     // albedo, a: root occlusion
    float4 extra : TEXCOORD4;   // per shader
};

float3 MVRawWorld(float3 os) { return mul(GetObjectToWorldMatrix(), float4(os, 1)).xyz; }
float3 MVRawWorldDir(float3 os) { return mul((float3x3)GetObjectToWorldMatrix(), os); }

float MVH2(float2 p) { return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }

float3 MVRot(float3 v, float3 axis, float a)
{
    float s = sin(a), c = cos(a);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1 - c);
}

MVF MVFinish(MVF o, float3 ws, float3 n)
{
    ws = MVWarpWS(ws);
    o.ws = ws; o.nw = n;
#ifdef MV_SHADOW
    #if _CASTING_PUNCTUAL_LIGHT_SHADOW
        float3 L = normalize(_LightPosition - ws);
    #else
        float3 L = _LightDirection;
    #endif
    o.pos = ApplyShadowClamping(TransformWorldToHClip(ApplyShadowBias(ws, n, L)));
#else
    o.pos = TransformWorldToHClip(ws);
#endif
    return o;
}

half4 MVLight(float3 ws, float3 n, float3 albedo, float ao, float thin, float smooth, float4 posCS)
{
    InputData inputData = (InputData)0;
    inputData.positionWS = ws; inputData.normalWS = n; inputData.positionCS = posCS;
    inputData.viewDirectionWS = GetWorldSpaceNormalizeViewDir(ws);
    inputData.shadowCoord = TransformWorldToShadowCoord(ws);
    inputData.fogCoord = ComputeFogFactor(TransformWorldToHClip(ws).z);
    inputData.bakedGI = SampleSHVertex(n);
    inputData.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(posCS);
    inputData.shadowMask = half4(1, 1, 1, 1);
    SurfaceData s = (SurfaceData)0;
    s.albedo = albedo; s.alpha = 1; s.occlusion = ao; s.smoothness = smooth; s.specular = 0; s.metallic = 0;
    half4 c = UniversalFragmentPBR(inputData, s);
    if (thin > 0)
    {
        // Light through the vane: what makes a feather look like a feather against a hard source.
        inputData.normalWS = -n;
        SurfaceData b = s; b.smoothness = 0; b.albedo = albedo * thin;
        c.rgb += UniversalFragmentPBR(inputData, b).rgb;
    }
    c.rgb = MixFog(c.rgb, inputData.fogCoord);
    c.a = 1;
    return c;
}
#endif
