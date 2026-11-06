Shader "MV/Glass"
{
    // The picture on a TV: abstract moving light that changes on the cut, driven only by the timeline.
    Properties
    {
        [HDR] _Tint ("Tint", Color) = (1,1,1,1)
        _Bright ("Brightness", Float) = 2
        _Static ("Static", Float) = 0
        _Change ("Picture seed", Float) = 0
        _Motion ("Scene time", Float) = 0
        _Mask ("Channel mask", Color) = (1,1,1,1)
        _Feed ("Feed", 2D) = "black" {}
        _FeedMix ("Feed mix", Float) = 0
        _World ("Drive from the song (for whole surfaces)", Float) = 0
        _UseWall ("Follows the wall level", Float) = 0
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
            #pragma vertex V
            #pragma fragment F
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            TEXTURE2D(_Feed); SAMPLER(sampler_Feed);
            CBUFFER_START(UnityPerMaterial)
            float4 _Tint, _Mask; float _Bright, _Static, _Change, _Motion, _FeedMix, _World, _UseWall;
            CBUFFER_END
            float _MV_SceneTime, _MV_BeatNow, _MV_Wall;
            struct A { float4 p : POSITION; float3 n : NORMAL; float2 uv : TEXCOORD0; float2 g : TEXCOORD1; };
            struct W { float4 p : SV_POSITION; float2 uv : TEXCOORD0; float2 g : TEXCOORD1; float3 ws : TEXCOORD2; float3 nw : TEXCOORD3; };
            W V(A i) { W o; o.p = TransformObjectToHClip(i.p.xyz); o.uv = i.uv; o.g = i.g; o.ws = TransformObjectToWorld(i.p.xyz); o.nw = TransformObjectToWorldNormal(i.n); return o; }
            float H(float2 p) { return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
            float N(float2 p) { float2 i = floor(p), f = frac(p); f = f * f * (3 - 2 * f); return lerp(lerp(H(i), H(i + float2(1, 0)), f.x), lerp(H(i + float2(0, 1)), H(i + 1), f.x), f.y); }
            float3 Hue(float h) { return saturate(abs(frac(h + float3(0, .67, .33)) * 6 - 3) - 1); }
            float4 F(W i) : SV_Target
            {
                clip(i.g.x);
                float change = _World > 0 ? floor(_MV_BeatNow * .5) : _Change;
                float motion = _World > 0 ? _MV_SceneTime : _Motion;
                float2 suv = i.uv;
                if (_World > 0) i.uv = frac(i.uv * _World);
                float s = floor(change);
                float h = H(float2(s, 2.2)), m = H(float2(s, 7.1));
                float2 uv = i.uv * (1.5 + m * 3) + s * 1.37;
                float t = motion * (.4 + m);
                float v = N(uv + float2(t, -t * .6)) * .6 + N(uv * 2.3 - t * .9) * .4;
                float3 c = lerp(Hue(h), Hue(h + .15 + m * .3), v) * (.35 + v * 1.1);
                c += step(.82, frac(uv.y * 2 + t)) * Hue(h + .5) * m;
                if (s == 0 && _World <= 0) c = dot(c, float3(.3, .5, .2)).xxx * float3(.9, 1, 1.15); // no picture chosen: a cold flicker
                else if (_World <= 0)
                {
                    // Every change is a different programme.
                    float pick = floor(H(float2(s, 11.3)) * 5);
                    float2 q = (i.uv - .5) * float2(1.67, 1);
                    float r = length(q);
                    if (pick == 1) c = Hue(floor(i.uv.x * 7) / 7 + h) * (.5 + .9 * step(.25, i.uv.y)); // test card
                    else if (pick == 2) c = Hue(h) * step(.5, frac(r * 7 - t * 2)) * 1.3; // rings
                    else if (pick == 3)
                    {
                        // An eye looking out of the set.
                        float lid = abs(q.y) - .34 * (1 - pow(saturate(abs(q.x) / .72), 2));
                        float white = 1 - smoothstep(0, .012, lid);
                        float iris = 1 - smoothstep(.17, .18, r), pupil = 1 - smoothstep(.08, .09, r);
                        c = lerp(Hue(h) * .08, lerp(float3(1, 1, 1), Hue(h) * 1.2, iris) * (1 - pupil), white);
                    }
                    else if (pick == 4) c = Hue(h) * step(.5, frac((i.uv.x + i.uv.y) * 6 + t)) * 1.2; // stripes
                }
                float grain = H(i.uv * 900 + floor(motion * 30));
                c = lerp(c, grain.xxx, saturate(_Static));
                c *= .86 + .14 * sin(i.uv.y * 640);
                if (_FeedMix > 0) c = lerp(c, SAMPLE_TEXTURE2D(_Feed, sampler_Feed, i.uv).rgb * (1.4 / max(_Bright, 1.4)), _FeedMix); // the picture stays a picture when the set is driven hard
                float2 e = abs(i.uv - .5) * 2;
                c *= 1 - smoothstep(.75, 1.05, max(e.x, e.y)) * .45;
                float3 pic = c * _Tint.rgb * _Mask.rgb * _Bright * (_UseWall > 0 ? _MV_Wall : 1);
                // Stretched glass thins and shines: a hard sheen where it leaves the plane, a bright lip along a tear.
                float3 n = normalize(i.nw), vd = normalize(_WorldSpaceCameraPos - i.ws);
                float bent = saturate(1 - abs(dot(n, normalize(mul((float3x3)UNITY_MATRIX_M, float3(0, 0, 1))))));
                float nv = saturate(abs(dot(n, vd)));
                float spec = pow(saturate(abs(dot(n, normalize(normalize(float3(.2, .7, -.5)) + vd)))), 90);
                pic *= 1 + bent * .6;
                pic += (spec * 1.6 + pow(1 - nv, 4) * 1.1) * saturate(bent * 4) * (float3(.8, .9, 1) + _Tint.rgb * .4);
                pic += exp(-max(i.g.x, 0) * 22) * saturate(i.g.y * 30 + .3) * _Tint.rgb * 1.4;
                return float4(pic, 1);
            }
            ENDHLSL
        }
    }
}
