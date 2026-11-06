Shader "MV/DoorPortal"
{
    // What a door camera sees, laid over the doorway in screen space, so it reads as an opening.
    Properties
    {
        _Portal ("Portal", 2D) = "black" {}
        _Gain ("Gain", Float) = 1
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            Cull Off
            HLSLPROGRAM
            #pragma vertex V
            #pragma fragment F
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_Portal); SAMPLER(sampler_Portal);
            CBUFFER_START(UnityPerMaterial)
            float _Gain;
            CBUFFER_END
            struct A { float4 p : POSITION; };
            struct W { float4 p : SV_POSITION; float4 s : TEXCOORD0; };
            W V(A i) { W o; o.p = TransformObjectToHClip(i.p.xyz); o.s = ComputeScreenPos(o.p); return o; }
            float4 F(W i) : SV_Target
            {
                float2 uv = i.s.xy / i.s.w;
                return float4(SAMPLE_TEXTURE2D(_Portal, sampler_Portal, uv).rgb * _Gain, 1);
            }
            ENDHLSL
        }
    }
}
