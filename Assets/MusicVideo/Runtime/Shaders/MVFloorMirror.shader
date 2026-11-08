Shader "MV/FloorMirror"
{
    // A polished floor: what the mirrored camera sees, laid over the floor in screen space, stronger at a grazing look, a little soft.
    Properties
    {
        _Portal ("Mirror", 2D) = "black" {}
        _Min ("Straight down", Float) = 0.12
        _Max ("Grazing", Float) = 0.62
        _Soft ("Softness", Float) = 0.0022
    }
    SubShader
    {
        Tags { "RenderType"="Transparent" "Queue"="Transparent-50" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex V
            #pragma fragment F
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_Portal); SAMPLER(sampler_Portal);
            CBUFFER_START(UnityPerMaterial)
            float _Min, _Max, _Soft;
            CBUFFER_END
            struct A { float4 p : POSITION; };
            struct W { float4 p : SV_POSITION; float4 s : TEXCOORD0; float3 w : TEXCOORD1; };
            W V(A i) { W o; o.w = TransformObjectToWorld(i.p.xyz); o.p = TransformWorldToHClip(o.w); o.s = ComputeScreenPos(o.p); return o; }
            float4 F(W i) : SV_Target
            {
                float2 uv = i.s.xy / i.s.w; uv.x = 1 - uv.x;
                float3 v = normalize(_WorldSpaceCameraPos - i.w);
                float f = pow(saturate(1 - abs(v.y)), 3);
                float s = _Soft * (1 + 2 * (1 - f));
                float3 c = SAMPLE_TEXTURE2D(_Portal, sampler_Portal, uv).rgb * .36;
                c += SAMPLE_TEXTURE2D(_Portal, sampler_Portal, uv + float2(s, 0)).rgb * .16;
                c += SAMPLE_TEXTURE2D(_Portal, sampler_Portal, uv - float2(s, 0)).rgb * .16;
                c += SAMPLE_TEXTURE2D(_Portal, sampler_Portal, uv + float2(0, s * 1.8)).rgb * .16;
                c += SAMPLE_TEXTURE2D(_Portal, sampler_Portal, uv - float2(0, s * 1.8)).rgb * .16;
                return float4(c, lerp(_Min, _Max, f));
            }
            ENDHLSL
        }
    }
}
