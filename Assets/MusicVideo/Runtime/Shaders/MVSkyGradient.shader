Shader "MV/SkyGradient"
{
    // The sky of every video. With clouds, sun and stars at 0 it is the plain gradient TK Shock was lit with.
    // All of it is drawn from the direction and _MV_SceneTime, so clouds drift the same forward, backward and on any frame.
    Properties
    {
        _Top ("Top", Color) = (0.05,0.06,0.12,1)
        _Mid ("Horizon", Color) = (0.2,0.15,0.25,1)
        _Bot ("Bottom", Color) = (0.02,0.02,0.03,1)
        _SunDir ("To the sun", Vector) = (0.4,0.5,0.6,0)
        _Sun ("Sun", Color) = (0,0,0,1)
        _SunSize ("Sun size", Float) = 0.03
        _Haze ("Haze", Float) = 0
        _Clouds ("Clouds", Float) = 0
        _CloudColor ("Cloud light", Color) = (1,0.98,0.94,1)
        _CloudShade ("Cloud shade", Color) = (0.5,0.56,0.68,1)
        _CloudScale ("Cloud scale", Float) = 1
        _CloudSpeed ("Cloud speed", Float) = 0.012
        _CloudSoft ("Cloud softness", Float) = 0.2
        _Stars ("Stars", Float) = 0
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
            #pragma target 3.5
            #include "UnityCG.cginc"
            fixed4 _Top, _Mid, _Bot;
            float4 _SunDir, _Sun, _CloudColor, _CloudShade;
            float _SunSize, _Haze, _Clouds, _CloudScale, _CloudSpeed, _CloudSoft, _Stars, _MV_SceneTime;
            struct v2f { float4 pos : SV_POSITION; float3 dir : TEXCOORD0; };
            v2f vert (appdata_base v) { v2f o; o.pos = UnityObjectToClipPos(v.vertex); o.dir = v.vertex.xyz; return o; }

            float H(float2 p) { return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
            float N(float2 p)
            {
                float2 i = floor(p), f = frac(p); f = f * f * (3 - 2 * f);
                return lerp(lerp(H(i), H(i + float2(1, 0)), f.x), lerp(H(i + float2(0, 1)), H(i + float2(1, 1)), f.x), f.y);
            }
            float Fbm(float2 p)
            {
                float a = .5, s = 0;
                for (int k = 0; k < 6; k++) { s += a * N(p); p = mul(float2x2(1.62, 1.18, -1.18, 1.62), p) + 11.3; a *= .5; }
                return s;
            }
            float Density(float2 uv, float cover)
            {
                float2 w = float2(Fbm(uv * .6 + 4.1), Fbm(uv * .6 + 9.7)) - .5;
                float f = Fbm(uv + w * 1.1);
                return saturate((f - (1 - cover * .7) * .7) / max(_CloudSoft, .02));
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float3 d = normalize(i.dir);
                float y = d.y;
                float3 c = y > 0 ? lerp(_Mid.rgb, _Top.rgb, pow(saturate(y), 0.55)) : lerp(_Mid.rgb, _Bot.rgb, pow(saturate(-y), 0.45));
                float3 sd = normalize(_SunDir.xyz);
                float mu = saturate(dot(d, sd));
                if (_Haze > 0) c += _Sun.rgb * _Haze * (pow(mu, 6) * .14 + pow(mu, 48) * .3) * saturate(1 - abs(y) * .8);
                if (_Stars > 0 && y > 0)
                {
                    float2 q = d.xz / (abs(y) + .35) * 150;
                    float s = H(floor(q)), tw = N(floor(q) * .37 + _MV_SceneTime * 1.5);
                    c += step(.9975, s) * saturate(1.3 - length(frac(q) - .5) * 3) * _Stars * (.5 + .5 * tw) * saturate(y * 4);
                }
                float sunDisc = smoothstep(1 - _SunSize * _SunSize * .5, 1 - _SunSize * _SunSize * .35, mu);
                c += _Sun.rgb * sunDisc * 12;
                if (_Clouds > 0 && y > -.02)
                {
                    float2 uv = d.xz / (max(y, 0) + .14) * 1.25 * _CloudScale + _MV_SceneTime * _CloudSpeed * float2(1, .35);
                    float den = Density(uv, _Clouds);
                    if (den > 0)
                    {
                        // One look toward the sun: thick cloud shades itself, thin edges catch the light.
                        float2 toSun = sd.xz / (abs(sd.y) + .3) * .16;
                        float shade = Density(uv + toSun, _Clouds) * .75 + Density(uv + toSun * 2.2, _Clouds) * .45;
                        float light = saturate(1 - shade);
                        float3 cc = lerp(_CloudShade.rgb, _CloudColor.rgb, light);
                        cc += _Sun.rgb * pow(mu, 12) * (1 - den) * .55;
                        float fade = saturate((y + .02) * 7);
                        c = lerp(c, cc, saturate(den * 1.5) * fade);
                    }
                }
                return fixed4(c, 1);
            }
            ENDCG
        }
    }
}
