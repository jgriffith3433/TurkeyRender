#ifndef MV_EYE_LIB
#define MV_EYE_LIB
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
// The eye's lights, by hand: wrap for skin, two sharp lobes for a wet surface, one rough lobe for dry skin.

struct EyeLit { float3 diff, red, wet, dry; };

void EyeAdd(inout EyeLit e, Light l, float3 n, float3 v, float wrap, float rough)
{
    float3 c = l.color * l.distanceAttenuation * l.shadowAttenuation;
    float nl = dot(n, l.direction);
    e.diff += c * saturate((nl + wrap) / (1 + wrap));
    e.red += c * saturate((nl + .55) / .6) * saturate(.5 - nl);     // the warm line where light turns into shadow on skin
    float3 h = normalize(l.direction + v);
    float nh = saturate(dot(n, h)), lit = saturate(nl * 3 + .3);
    e.wet += c * lit * (pow(nh, 2400) * 40 + pow(nh, 300) * 1.2);
    e.dry += c * lit * pow(nh, rough);
}

EyeLit EyeLights(float3 ws, float3 n, float3 v, float4 posCS, float wrap, float rough)
{
    EyeLit e = (EyeLit)0;
    InputData inputData = (InputData)0;
    inputData.positionWS = ws; inputData.normalWS = n; inputData.viewDirectionWS = v; inputData.positionCS = posCS;
    inputData.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(posCS);
    half4 mask = half4(1, 1, 1, 1);
    EyeAdd(e, GetMainLight(TransformWorldToShadowCoord(ws), ws, mask), n, v, wrap, rough);
#if USE_CLUSTER_LIGHT_LOOP || defined(_ADDITIONAL_LIGHTS)
    uint count = GetAdditionalLightsCount();
    LIGHT_LOOP_BEGIN(count)
        EyeAdd(e, GetAdditionalLight(lightIndex, ws, mask), n, v, wrap, rough);
    LIGHT_LOOP_END
#endif
    return e;
}

float Hash(float2 p) { return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float Noise(float2 p) { float2 i = floor(p), f = frac(p); f = f * f * (3 - 2 * f); return lerp(lerp(Hash(i), Hash(i + float2(1, 0)), f.x), lerp(Hash(i + float2(0, 1)), Hash(i + 1), f.x), f.y); }
float Fbm(float2 p) { float v = 0, a = .5; for (int i = 0; i < 4; i++) { v += Noise(p) * a; p = p * 2.03 + 7.1; a *= .5; } return v; }

// The lid margin. MVEyeRig has the same curves: inner and outer corner, and how high the lids rise between them.
#define EYE_XI 1.02
#define EYE_XO -1.12
#define EYE_YI -.10
#define EYE_YO .06
float EyeU(float x) { return saturate((x - EYE_XO) / (EYE_XI - EYE_XO)); }
float EyeMid(float x) { return lerp(EYE_YO, EYE_YI, EyeU(x)); }
float EyeUp(float u) { return pow(saturate(sin(PI * pow(u, .9))), .75); }
float EyeLo(float u) { return pow(saturate(sin(PI * pow(u, 1.12))), .9); }
#endif
