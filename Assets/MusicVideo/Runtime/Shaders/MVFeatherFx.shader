Shader "MV/FeatherFx"
{
    // Loose feathers as a pure function of time: crown splash and streams.
    Properties
    {
        _FeatherTex ("Feather", 2D) = "white" {}
        _ColorA ("Colour", Color) = (.95,.95,.97,1)
        _ColorB ("Colour 2", Color) = (.8,.82,.88,1)
        _Mode ("0 crown, 1 stream", Float) = 0
        _Age ("Age", Float) = 0
        _Dur ("Emit for", Float) = 5
        _P0 ("Source", Vector) = (0,0,0,0)
        _P1 ("Control", Vector) = (0,1,0,0)
        _P2 ("Target", Vector) = (0,2,0,0)
        _Height ("Height", Float) = 10
        _Radius ("Radius", Float) = 6
        _Spread ("Spread", Float) = .2
        _Size ("Size", Float) = .3
        _Life ("Life", Float) = 2
        _Thin ("Light through", Float) = .4
        _Floor ("Floor", Float) = -1000
        _Drag ("Drag", Float) = 1.6
        _Swirl ("Swirl", Float) = 4
        _Water ("Water", Float) = 0
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
            #include "MVFeatherFx.hlsl"
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
            #include "MVFeatherFx.hlsl"
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
            #include "MVFeatherFx.hlsl"
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
            #include "MVFeatherFx.hlsl"
            ENDHLSL
        }
    }
}
