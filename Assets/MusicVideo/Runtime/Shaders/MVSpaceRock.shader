Shader "MV/SpaceRock"
{
    // The near layer's solid ground in the space set: ring ice boulders and a moon's regolith (MVSpace.cs builds the meshes).
    // URP lit, so the sun's shadow falls on him and his on it; detail is procedural in world space, so it holds a metre from the lens
    // and at a kilometre. Far boulders dissolve (dithered, no sorting) into the ring the far layer draws, and haze closes the distance.
    Properties
    {
        _Color ("Albedo", Color) = (.8,.82,.86,1)
        _Color2 ("Second albedo", Color) = (.6,.62,.66,1)
        _Ice ("Ice (sparkle and blue in the shade)", Float) = 1
        _Smooth ("Smoothness", Float) = .35
        _Detail ("Detail scale (per metre)", Float) = .7
        _Fade ("Fade start, end (m)", Vector) = (1500, 2200, 0, 0)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        CBUFFER_START(UnityPerMaterial)
        float4 _Color, _Color2, _Fade; float _Ice, _Smooth, _Detail;
        CBUFFER_END
        float Dither(float2 px) { return frac(52.9829189 * frac(dot(px, float2(.06711056, .00583715)))); }
        void FadeClip(float3 ws, float4 cs)
        {
            float d = length(ws - _WorldSpaceCameraPos);
            float k = saturate((d - _Fade.x) / max(_Fade.y - _Fade.x, 1));
            clip(Dither(cs.xy) - k);
        }
        ENDHLSL
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile _ _CLUSTER_LIGHT_LOOP
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "MVSpaceLib.hlsl"
            float4 _SP_NearFog;   // colour (rgb), metres for 63% (a, 0 = none)
            struct A { float4 v : POSITION; float3 n : NORMAL; float4 col : COLOR; };
            struct V { float4 pos : SV_POSITION; float3 ws : TEXCOORD0; float3 n : TEXCOORD1; float4 col : TEXCOORD2; };
            V Vert(A a) { V o; o.ws = TransformObjectToWorld(a.v.xyz); o.n = TransformObjectToWorldNormal(a.n); o.pos = TransformWorldToHClip(o.ws); o.col = a.col; return o; }
            half4 Frag(V i) : SV_Target
            {
                FadeClip(i.ws, i.pos);
                float3 p = i.ws * _Detail + i.col.rgb * 37;
                float dist = length(i.ws - _WorldSpaceCameraPos);
                float fp = dist * .002 * _Detail;
                float n1 = SpFbm(p, SpOct(1, fp)), n2 = SpFbm(p * 6.1, SpOct(6, fp));
                // bump from the noise's gradient
                float e = .06 / _Detail;
                float3 g = float3(SpFbm((i.ws + float3(e, 0, 0)) * _Detail * 3 + 9, 4), SpFbm((i.ws + float3(0, e, 0)) * _Detail * 3 + 9, 4), SpFbm((i.ws + float3(0, 0, e)) * _Detail * 3 + 9, 4)) - SpFbm(i.ws * _Detail * 3 + 9, 4);
                float3 n = normalize(normalize(i.n) - g / e * .12 * saturate(1.5 - fp * 4));
                float3 alb = lerp(_Color.rgb, _Color2.rgb, saturate(n1 * 1.6 + .5)) * (.85 + n2 * .35) * (.85 + i.col.a * .3);
                InputData d = (InputData)0;
                d.positionWS = i.ws; d.positionCS = i.pos; d.normalWS = n; d.viewDirectionWS = SafeNormalize(GetWorldSpaceViewDir(i.ws));
                d.shadowCoord = TransformWorldToShadowCoord(i.ws); d.bakedGI = SampleSH(n); d.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(i.pos); d.shadowMask = 1;
                SurfaceData s = (SurfaceData)0;
                s.albedo = alb; s.alpha = 1; s.smoothness = _Smooth * (.7 + n2 * .6); s.occlusion = 1; s.normalTS = float3(0, 0, 1);
                half4 c = UniversalFragmentPBR(d, s);
                if (_Ice > 0)
                {
                    // ice: glints of the sun in crystal faces, a cold blue where it is shaded
                    Light L = GetMainLight(d.shadowCoord);
                    float3 h = normalize(L.direction + d.viewDirectionWS);
                    float3 cell = floor(i.ws * 9 / max(1, dist * .02));
                    float3 fn = normalize(n + SpHash3(cell) * .35);
                    float spark = pow(saturate(dot(fn, h)), 900) * step(.7, SpHash1(cell)) * 30;
                    c.rgb += L.color * L.shadowAttenuation * spark * _Ice;
                    c.rgb += alb * float3(.05, .09, .16) * (1 - saturate(dot(n, L.direction))) * _Ice;
                }
                if (_SP_NearFog.a > 0) c.rgb = lerp(c.rgb, _SP_NearFog.rgb, 1 - exp(-dist / _SP_NearFog.a));
                return half4(c.rgb, 1);
            }
            ENDHLSL
        }
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode"="ShadowCaster" }
            ZWrite On ColorMask 0
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_vertex _ _CASTING_PUNCTUAL_LIGHT_SHADOW
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"
            float3 _LightDirection, _LightPosition;
            struct A { float4 v : POSITION; float3 n : NORMAL; };
            float4 Vert(A a) : SV_POSITION
            {
                float3 ws = TransformObjectToWorld(a.v.xyz), n = TransformObjectToWorldNormal(a.n);
            #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                float3 ld = normalize(_LightPosition - ws);
            #else
                float3 ld = _LightDirection;
            #endif
                return ApplyShadowClamping(TransformWorldToHClip(ApplyShadowBias(ws, n, ld)));
            }
            half4 Frag() : SV_Target { return 0; }
            ENDHLSL
        }
        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode"="DepthOnly" }
            ZWrite On ColorMask R
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment Frag
            struct A { float4 v : POSITION; };
            struct V { float4 pos : SV_POSITION; float3 ws : TEXCOORD0; };
            V Vert(A a) { V o; o.ws = TransformObjectToWorld(a.v.xyz); o.pos = TransformWorldToHClip(o.ws); return o; }
            float Frag(V i) : SV_Target { FadeClip(i.ws, i.pos); return i.pos.z; }
            ENDHLSL
        }
        Pass
        {
            Name "DepthNormals"
            Tags { "LightMode"="DepthNormals" }
            ZWrite On
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment Frag
            struct A { float4 v : POSITION; float3 n : NORMAL; };
            struct V { float4 pos : SV_POSITION; float3 ws : TEXCOORD0; float3 n : TEXCOORD1; };
            V Vert(A a) { V o; o.ws = TransformObjectToWorld(a.v.xyz); o.n = TransformObjectToWorldNormal(a.n); o.pos = TransformWorldToHClip(o.ws); return o; }
            float4 Frag(V i) : SV_Target { FadeClip(i.ws, i.pos); return float4(normalize(i.n), 0); }
            ENDHLSL
        }
    }
}
