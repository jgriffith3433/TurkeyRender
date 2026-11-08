Shader "MV/SpaceGlare"
{
    // The sun on the lens, over everything (near layer included), before the grade. Where the sun is on screen, how much of it
    // the far bodies hide and its colour come from MVSpace.cs per camera. Pure of the camera: the same frame is the same flare.
    SubShader
    {
        Tags { "Queue"="Transparent+450" "RenderType"="Transparent" "RenderPipeline"="UniversalPipeline" "IgnoreProjector"="True" }
        Pass
        {
            Name "Glare"
            Tags { "LightMode"="UniversalForward" }
            ZWrite Off ZTest Always Cull Off Blend One One
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            float4 _SP_GlarePos;   // sun in screen uv (xy), visible 0-1 (z), aspect (w)
            float4 _SP_GlareCol;   // colour (rgb), strength (a)
            struct A { float4 v : POSITION; };
            struct V { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };
            V Vert(A a)
            {
                V o; o.pos = float4(a.v.xy, UNITY_RAW_FAR_CLIP_VALUE, 1);
                o.uv = a.v.xy * .5 + .5;
            #if UNITY_UV_STARTS_AT_TOP
                if (_ProjectionParams.x < 0) o.uv.y = 1 - o.uv.y;
            #endif
                return o;
            }
            float Disc(float2 p, float r, float soft) { return smoothstep(r, r * (1 - soft), length(p)); }
            half4 Frag(V i) : SV_Target
            {
                float vis = _SP_GlarePos.z; if (vis <= 0) return 0;
                float asp = _SP_GlarePos.w;
                float2 s = _SP_GlarePos.xy, uv = i.uv;
                float2 d = (uv - s) * float2(asp, 1);
                float r = length(d), ang = atan2(d.y, d.x);
                float3 c = _SP_GlareCol.rgb;
                float3 o = 0;
                o += c * (exp(-r / .012) * 2.0 + exp(-r / .06) * .35 + exp(-r / .28) * .06);
                // a six-point star from the aperture blades, long and thin
                float star = pow(abs(cos(ang * 3)), 900) * exp(-r / .35) + pow(abs(cos(ang * 3 + .52)), 1600) * exp(-r / .18) * .5;
                o += c * star * 1.4;
                // the anamorphic streak, a little blue
                o += c * float3(.55, .7, 1) * exp(-abs(d.y) / .0028) * exp(-abs(d.x) / .55) * .55;
                // a faint rainbow halo
                float hr = r / .3;
                o += float3(1, .5, .3) * exp(-pow((hr - 1) / .03, 2)) * .02 + float3(.3, .5, 1) * exp(-pow((hr - 1.06) / .03, 2)) * .02;
                // ghosts along the line through the centre of the frame
                float2 axis = (float2(.5, .5) - s);
                [unroll] for (int k = 0; k < 5; k++)
                {
                    float f = k == 0 ? .45 : (k == 1 ? .9 : (k == 2 ? 1.25 : (k == 3 ? 1.6 : 2.1)));
                    float rad = k == 0 ? .02 : (k == 1 ? .055 : (k == 2 ? .03 : (k == 3 ? .09 : .045)));
                    float3 tint = k == 0 ? float3(.5, 1, .6) : (k == 1 ? float3(.4, .5, 1) : (k == 2 ? float3(1, .7, .4) : (k == 3 ? float3(.5, .6, 1) : float3(1, .5, .7))));
                    float2 g = (uv - (s + axis * f)) * float2(asp, 1);
                    o += tint * c * Disc(g, rad, .35) * (k == 3 ? .035 : .06);
                }
                float edge = saturate(1.6 - max(abs(s.x - .5), abs(s.y - .5)) * 2.4);
                return half4(o * vis * _SP_GlareCol.a * edge, 0);
            }
            ENDHLSL
        }
    }
}
