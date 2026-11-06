Shader "MV/EyeSkin"
{
    // The skin and lids around the macro eye, its lashes and the wet inner corner. uv: rest position on the face; uv2: x wet margin, y lid plate.
    Properties
    {
        _Skin ("Skin", Color) = (.70,.47,.38,1)
        _Margin ("Wet margin", Color) = (.62,.26,.24,1)
        _Hair ("Is hair", Float) = 0
        _Wet ("All wet", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Cull Off
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex V
            #pragma fragment F
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _ADDITIONAL_LIGHT_SHADOWS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile _ _CLUSTER_LIGHT_LOOP
            #include "MVEyeLib.hlsl"
            CBUFFER_START(UnityPerMaterial)
            float4 _Skin, _Margin; float _Hair, _Wet;
            CBUFFER_END
            struct A { float4 p : POSITION; float3 n : NORMAL; float2 uv : TEXCOORD0; float2 w : TEXCOORD1; };
            struct W { float4 p : SV_POSITION; float2 uv : TEXCOORD0; float2 w : TEXCOORD1; float3 ws : TEXCOORD2; float3 nw : TEXCOORD3; };
            W V(A i) { W o; o.p = TransformObjectToHClip(i.p.xyz); o.ws = TransformObjectToWorld(i.p.xyz); o.nw = TransformObjectToWorldNormal(i.n); o.uv = i.uv; o.w = i.w; return o; }

            float Height(float2 p, float plate)
            {
                float pores = pow(1 - Noise(p * 62), 5) * .45 + (1 - abs(Noise(p * 26 + 3) * 2 - 1)) * .08;
                float fine = Noise(float2(p.x * 8, p.y * 58 + Noise(p * 5) * 3)) * lerp(.12, .3, plate);      // fine creases run along the lid
                float crow = Noise(float2((p.y + (p.x + 2) * .3) * 30, p.x * 4)) * .35 * smoothstep(-1.2, -2.2, p.x) * smoothstep(1.4, .3, abs(p.y));
                return pores + fine + crow;
            }

            float4 F(W i, bool face : SV_IsFrontFace) : SV_Target
            {
                float3 n = normalize(i.nw); if (!face) n = -n;
                float3 v = GetWorldSpaceNormalizeViewDir(i.ws);
                if (_Hair > .5)
                {
                    EyeLit h = EyeLights(i.ws, n, v, i.p, .4, 40);
                    return float4(float3(.018, .013, .011) * (h.diff + SampleSH(n)) + h.dry * .15, 1);
                }
                float wet = saturate(i.w.x + _Wet);
                float e = .02;
                float h0 = Height(i.uv, i.w.y), hx = Height(i.uv + float2(e, 0), i.w.y), hy = Height(i.uv + float2(0, e), i.w.y);
                float3 dpx = ddx(i.ws), dpy = ddy(i.ws);
                float3 up = normalize(cross(n, normalize(dpx + 1e-6)));
                float3 rt = cross(up, n);
                float bump = lerp(.09, .012, wet);
                float3 nd = normalize(n - (rt * (hx - h0) + up * (hy - h0)) / e * bump);

                float2 p = i.uv;
                float3 skin = _Skin.rgb * (.9 + .2 * Fbm(p * 3.1)) * (1 - .22 * h0);
                skin = lerp(skin, skin * float3(1.08, .86, .86), saturate(1 - length(p * float2(.5, .8)) * .55));     // redder, thinner skin around the eye
                float veins = pow(1 - abs(Noise(p * float2(5, 11) + Fbm(p * 2) * 1.5) * 2 - 1), 14) * saturate(1.6 - length(p * float2(.5, .7)));
                skin = lerp(skin, float3(.45, .3, .42), veins * .28);
                float under = exp(-pow((p.y + .95 + .1 * p.x * p.x) / .4, 2)) * saturate(1.3 - abs(p.x) * .4);
                skin *= 1 - under * .16;                                                                               // tired, under the eye
                float3 alb = lerp(skin, _Margin.rgb, wet);

                EyeLit L = EyeLights(i.ws, nd, v, i.p, .35, 55);
                EyeLit LS = EyeLights(i.ws, n, v, i.p, 0, 55);
                float3 c = alb * (L.diff + SampleSH(n));
                c += alb * float3(1, .3, .22) * L.red * .5;
                c += L.dry * .05 * (1 - wet);
                c += LS.wet * wet * .9;
                return float4(c, 1);
            }
            ENDHLSL
        }
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode"="ShadowCaster" }
            ZWrite On ZTest LEqual ColorMask 0
            HLSLPROGRAM
            #pragma vertex V
            #pragma fragment F
            #pragma multi_compile_vertex _ _CASTING_PUNCTUAL_LIGHT_SHADOW
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            float3 _LightDirection; float3 _LightPosition;
            float4 V(float4 p : POSITION, float3 n : NORMAL) : SV_POSITION
            {
                float3 ws = TransformObjectToWorld(p.xyz), nw = TransformObjectToWorldNormal(n);
            #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                float3 L = normalize(_LightPosition - ws);
            #else
                float3 L = _LightDirection;
            #endif
                return ApplyShadowClamping(TransformWorldToHClip(ApplyShadowBias(ws, nw, L)));
            }
            float4 F() : SV_Target { return 0; }
            ENDHLSL
        }
        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode"="DepthOnly" }
            ZWrite On ColorMask R
            HLSLPROGRAM
            #pragma vertex V
            #pragma fragment F
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            float4 V(float4 p : POSITION) : SV_POSITION { return TransformObjectToHClip(p.xyz); }
            float4 F(float4 p : SV_POSITION) : SV_Target { return p.z; }
            ENDHLSL
        }
    }
}
