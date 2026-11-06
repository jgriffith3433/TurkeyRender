Shader "MV/Feather"
{
    // Feathers on a skinned body: cards collapsed on the skin, opened by amount. See MVFeatherCoat.hlsl.
    Properties
    {
        _FeatherTex ("Feather", 2D) = "white" {}
        _ColorA ("Colour", Color) = (.95,.93,.88,1)
        _ColorB ("Colour 2", Color) = (.72,.62,.5,1)
        _Amount ("Amount", Float) = 0
        _Band ("Growth width", Float) = .03
        _Lay ("Lie down", Float) = .86
        _SizeMul ("Size", Float) = 1
        _Strip ("Strip", Float) = 0
        _StripTo ("Strip to", Vector) = (0,0,0,0)
        _Sway ("Sway", Float) = .15
        _Thin ("Light through", Float) = .4
        _Curl ("Curl", Float) = .8
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
            #include "MVFeatherCoat.hlsl"
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
            #include "MVFeatherCoat.hlsl"
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
            #include "MVFeatherCoat.hlsl"
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
            #include "MVFeatherCoat.hlsl"
            ENDHLSL
        }
    }
}
