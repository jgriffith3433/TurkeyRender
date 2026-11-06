Shader "MV/SkyGradient"
{
    Properties
    {
        _Top ("Top", Color) = (0.05,0.06,0.12,1)
        _Mid ("Horizon", Color) = (0.2,0.15,0.25,1)
        _Bot ("Bottom", Color) = (0.02,0.02,0.03,1)
    }
    SubShader
    {
        Tags { "Queue"="Background" "RenderType"="Background" "PreviewType"="Skybox" }
        Cull Off ZWrite Off
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            fixed4 _Top, _Mid, _Bot;
            struct v2f { float4 pos : SV_POSITION; float3 dir : TEXCOORD0; };
            v2f vert (appdata_base v) { v2f o; o.pos = UnityObjectToClipPos(v.vertex); o.dir = v.vertex.xyz; return o; }
            fixed4 frag (v2f i) : SV_Target
            {
                float y = normalize(i.dir).y;
                fixed3 c = y > 0 ? lerp(_Mid.rgb, _Top.rgb, pow(saturate(y), 0.55)) : lerp(_Mid.rgb, _Bot.rgb, pow(saturate(-y), 0.45));
                return fixed4(c, 1);
            }
            ENDCG
        }
    }
}
