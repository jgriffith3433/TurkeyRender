Shader "MV/Grass"
{
    // Blades built in the vertex shader, shaded through the same MVPBR as everything else, so toon, ink and the warps work on them.
    Properties
    {
        _Dark ("Root", Color) = (0.035, 0.075, 0.018, 1)
        _Mid ("Middle", Color) = (0.11, 0.235, 0.04, 1)
        _Tip ("Tip", Color) = (0.27, 0.43, 0.09, 1)
        _Dry ("Dry", Color) = (0.46, 0.42, 0.16, 1)
        _Soil ("Soil", Color) = (0.05, 0.04, 0.022, 1)
        _FlowerA ("Flower", Color) = (0.95, 0.92, 0.82, 1)
        _FlowerB ("Flower 2", Color) = (0.9, 0.66, 0.12, 1)
        _Wind ("Wind", Float) = 0.45
        _WindAngle ("Wind angle", Float) = 0.6
        _WindScale ("Wind scale", Float) = 0.9
        _Lean ("Lean", Float) = 0.8
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Cull Off
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
            #pragma multi_compile_fragment _ _ADDITIONAL_LIGHT_SHADOWS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile_fragment _ _SCREEN_SPACE_OCCLUSION
            #pragma multi_compile_fragment _ _LIGHT_COOKIES
            #pragma multi_compile _ _CLUSTER_LIGHT_LOOP
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "MVGrass.hlsl"
            struct V2F { float4 pos : SV_POSITION; float3 ws : TEXCOORD0; float3 n : TEXCOORD1; float4 uv : TEXCOORD2; float h : TEXCOORD3; float fog : TEXCOORD4; };

            V2F Vert(GrassIn v)
            {
                V2F o; float along;
                GrassPoint(v, o.ws, o.n, along);
                o.pos = TransformWorldToHClip(o.ws); o.uv = v.uv; o.h = v.shape.z;
                o.fog = ComputeFogFactor(o.pos.z);
                return o;
            }

            half4 Frag(V2F i, bool front : SV_IsFrontFace) : SV_Target
            {
                float along = i.uv.y, rnd = i.uv.z, rnd2 = i.uv.w;
                float3 n = normalize(i.n) * (front ? 1 : -1);
                float patch = GFbm(i.ws.xz * .55), fine = GFbm(i.ws.xz * 3.1);
                // A lawn is not one green: broad warm dry drifts, and darker cooler clumps of clover.
                float drift = smoothstep(.42, .66, GFbm(i.ws.xz * .21 + 5.3)), clump = smoothstep(.54, .68, GFbm(i.ws.xz * 1.15 + 9.1));
                float3 alb; float smooth = .42, ao = 1;
                if (along < 0)
                {
                    // Thatch and soil between blades. Far away the blades thin out and this has to read as lawn.
                    float dist = length(i.ws - _WorldSpaceCameraPos);
                    float thatch = GFbm(i.ws.xz * 42) * .7 + GFbm(i.ws.xz * float2(120, 60)) * .3;
                    float3 close = lerp(_Soil.rgb, _Dark.rgb * 1.3, thatch);
                    float3 far = lerp(_Mid.rgb, _Tip.rgb, .22 + .4 * patch) * (.8 + .4 * fine);
                    far = lerp(far, _Dry.rgb * .8, drift * .4) * (1 - clump * .35);
                    alb = lerp(close, far, saturate((dist - 1.5) / 7)); smooth = .1; ao = lerp(.55, 1, saturate(dist / 8));
                }
                else if (i.uv.y > 1.05)
                {
                    // A flower: a yellow eye in five petals, darker at the throat.
                    float rr = length(float2(i.uv.x, i.uv.y - 2));
                    float3 pet = rnd > .62 ? _FlowerB.rgb : _FlowerA.rgb;
                    alb = lerp(float3(.72, .46, .05), pet * (.82 + .18 * smoothstep(.3, 1, rr)), smoothstep(.2, .3, rr));
                    smooth = .25;
                }
                else
                {
                    float hue = rnd * .6 + patch * .7 - .25;
                    float3 mid = lerp(_Mid.rgb, _Tip.rgb * .8, saturate(hue));
                    alb = along < .45 ? lerp(_Dark.rgb, mid, along / .45) : lerp(mid, lerp(_Tip.rgb, mid, rnd2 * .6), (along - .45) / .55);
                    float dry = smoothstep(.72, .96, rnd * .55 + fine * .6) * smoothstep(.4, 1, along);
                    alb = lerp(alb, _Dry.rgb, dry * .75);
                    alb = lerp(alb, lerp(alb, _Dry.rgb, .55), drift * smoothstep(.15, .8, along) * (.5 + .5 * rnd2));
                    alb = lerp(alb, alb * float3(.6, .74, .72), clump);
                    alb *= 1 - .22 * smoothstep(.1, 0, abs(i.uv.x));     // the midrib
                    alb *= .92 + .16 * frac(i.uv.x * 3.5 + along * 2);    // long fine veins
                    ao = lerp(.1, 1, pow(saturate(along), .95));
                }

                InputData d = (InputData)0;
                d.positionWS = i.ws; d.positionCS = i.pos; d.normalWS = n; d.viewDirectionWS = SafeNormalize(GetWorldSpaceViewDir(i.ws));
                d.shadowCoord = TransformWorldToShadowCoord(i.ws); d.fogCoord = i.fog;
                d.bakedGI = SampleSH(n); d.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(i.pos); d.shadowMask = 1;
                SurfaceData s = (SurfaceData)0;
                s.albedo = alb; s.alpha = 1; s.metallic = 0; s.specular = 0; s.smoothness = smooth; s.occlusion = ao; s.normalTS = float3(0, 0, 1);

                // Light through the blade: what makes a lawn glow against the sun.
                if (along >= 0 && i.uv.y < 1.05)
                {
                    Light L = GetMainLight(d.shadowCoord);
                    float back = saturate(dot(-n, L.direction)) * .75 + pow(saturate(dot(d.viewDirectionWS, -L.direction)), 4) * .9;
                    s.emission = alb * float3(1.3, 1.22, .5) * L.color * L.shadowAttenuation * (back + .3 * smoothstep(.55, 1, along)) * ao * .6;   // tips catch the sun
                }
                half4 c = UniversalFragmentPBR(d, s);
                c.rgb = MixFog(c.rgb, i.fog);
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
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "MVGrass.hlsl"
            float3 _LightDirection, _LightPosition;
            float4 Vert(GrassIn v) : SV_POSITION
            {
                float3 ws, n; float along; GrassPoint(v, ws, n, along);
                if (along < 0) return float4(0, 0, -2, 1); // the ground casts nothing
            #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                float3 ld = normalize(_LightPosition - ws);
            #else
                float3 ld = _LightDirection;
            #endif
                float4 p = TransformWorldToHClip(ApplyShadowBias(ws, n, ld));
                p = ApplyShadowClamping(p);
                return p;
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
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "MVGrass.hlsl"
            float4 Vert(GrassIn v) : SV_POSITION { float3 ws, n; float along; GrassPoint(v, ws, n, along); return TransformWorldToHClip(ws); }
            float Frag(float4 p : SV_POSITION) : SV_Target { return p.z; }
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
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "MVGrass.hlsl"
            struct V2F { float4 pos : SV_POSITION; float3 n : TEXCOORD0; };
            V2F Vert(GrassIn v) { V2F o; float3 ws; float along; GrassPoint(v, ws, o.n, along); o.pos = TransformWorldToHClip(ws); return o; }
            float4 Frag(V2F i, bool front : SV_IsFrontFace) : SV_Target { return float4(normalize(i.n) * (front ? 1 : -1), 0); }
            ENDHLSL
        }
    }
}
