Shader "MV/FeatherMound"
{
    // A mountain of feathers: a skin mesh and cards sharing one height function, with drain 0..1 behaving like an hourglass.
    Properties
    {
        _FeatherTex ("Feather", 2D) = "white" {}
        _ColorA ("Colour", Color) = (.93,.94,.97,1)
        _ColorB ("Colour 2", Color) = (.7,.72,.8,1)
        _R ("Radius", Float) = 45
        _H ("Height", Float) = 22
        _Drain ("Drain", Float) = 0
        _FlowT ("Flow time", Float) = 0
        _Card ("Is cards", Float) = 0
        _HoleW ("Hole half width", Float) = 5
        _HoleH ("Hole half height", Float) = 3
        _Dent ("Dent", Vector) = (0,0,3,0)
        _Thin ("Light through", Float) = .35
        _Seed ("Seed", Float) = 1
        _Slope ("Funnel slope", Float) = .8
        _Pattern ("Pattern size", Float) = .5
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="AlphaTest" }
        Cull Off
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment FragForward
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _ADDITIONAL_LIGHT_SHADOWS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile_fragment _ _SCREEN_SPACE_OCCLUSION
            #pragma multi_compile _ _CLUSTER_LIGHT_LOOP
            #pragma multi_compile _ _LIGHT_LAYERS
            #pragma multi_compile_fog
            #include "MVFeatherMound.hlsl"
            ENDHLSL
        }
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode"="ShadowCaster" }
            ZWrite On ZTest LEqual ColorMask 0
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment FragDepth
            #pragma multi_compile_vertex _ _CASTING_PUNCTUAL_LIGHT_SHADOW
            #define MV_SHADOW
            #include "MVFeatherMound.hlsl"
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
            #pragma fragment FragDepth
            #include "MVFeatherMound.hlsl"
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
            #pragma fragment FragNormal
            #include "MVFeatherMound.hlsl"
            ENDHLSL
        }
    }
}
