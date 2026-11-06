Shader "MV/Stylize"
{
    // The last thing every frame passes through. All driven from the timeline through the Post track.
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" }
        ZTest Always ZWrite Off Cull Off
        Pass
        {
            Name "Stylize"
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareDepthTexture.hlsl"

            float4 _MV_Center;     // xy: screen position of the TV
            float _MV_Pixel, _MV_Poster, _MV_Halftone, _MV_Ink, _MV_Scan, _MV_RGB, _MV_Swirl, _MV_Radial, _MV_Tear, _MV_Invert;
            float _MV_Kaleido, _MV_Blur, _MV_Duo, _MV_Time, _MV_Beat, _MV_Mirror, _MV_Pinch, _MV_Feedback, _MV_Mask;
            float4 _MV_DuoA, _MV_DuoB, _MV_ChannelMask, _MV_InsertTint, _MV_NeonA, _MV_NeonB;
            float _MV_Neon, _MV_Hatch, _MV_Snow;
            float _MV_InsertMix, _MV_InsertScale, _MV_Bars, _MV_InsertGray;
            float4 _MV_Jolt; // x,y screen shake on footage, z punch zoom
            TEXTURE2D(_MV_Insert);

            float H(float2 p) { return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }

            float3 S(float2 uv)
            {
                float3 c = SAMPLE_TEXTURE2D_X_LOD(_BlitTexture, sampler_LinearClamp, uv, 0).rgb;
                if (_MV_InsertMix > 0)
                {
                    float3 f = SAMPLE_TEXTURE2D_LOD(_MV_Insert, sampler_LinearClamp, .5 + (uv - .5) / max(_MV_InsertScale * (1 - _MV_Jolt.z), .01) + _MV_Jolt.xy, 0).rgb;
                    if (_MV_InsertGray > 0) f = lerp(f, dot(f, float3(.2, .35, .9)).xxx * 1.4, _MV_InsertGray); // relight blue footage with the TV colour
                    c = lerp(c, f * _MV_InsertTint.rgb, _MV_InsertMix);
                }
                return c;
            }

            float2 Warp(float2 uv)
            {
                float asp = _ScreenParams.x / _ScreenParams.y;
                float2 c = _MV_Center.xy;
                float2 d = (uv - c) * float2(asp, 1);
                float r = length(d);
                if (_MV_Swirl != 0) { float a = _MV_Swirl * exp(-r * 2.2); float s = sin(a), k = cos(a); d = float2(d.x * k - d.y * s, d.x * s + d.y * k); }
                if (_MV_Pinch != 0) d *= 1 + _MV_Pinch * exp(-r * 2.5);
                uv = c + d / float2(asp, 1);
                if (_MV_Tear > 0)
                {
                    float band = floor(uv.y * 26 + _MV_Time * 3);
                    float on = step(1 - _MV_Tear * .6, H(float2(band, floor(_MV_Time * 18))));
                    uv.x += on * (H(float2(band * 1.7, floor(_MV_Time * 24))) - .5) * .18 * _MV_Tear;
                    uv.x += sin(uv.y * 80 + _MV_Time * 40) * .002 * _MV_Tear;
                }
                if (_MV_Kaleido > 0.5)
                {
                    float n = round(_MV_Kaleido), ang = atan2(uv.y - .5, (uv.x - .5) * asp), rad = length(float2((uv.x - .5) * asp, uv.y - .5)), seg = TWO_PI / n;
                    ang = abs(fmod(ang + PI * 8, seg) - seg * .5);
                    uv = .5 + float2(cos(ang) * rad / asp, sin(ang) * rad);
                }
                if (_MV_Mirror > 0) uv.x = lerp(uv.x, abs(uv.x - .5) + .5, step(.5, _MV_Mirror));
                if (_MV_Pixel > 1) { float2 g = float2(_ScreenParams.x / _ScreenParams.y, 1) * (1080 / _MV_Pixel); uv = (floor(uv * g) + .5) / g; }
                return saturate(uv);
            }

            float4 Frag(Varyings i) : SV_Target
            {
                float2 uv0 = i.texcoord, uv = Warp(uv0);
                float3 c;
                float2 toC = _MV_Center.xy - uv;
                float2 ca = (uv - .5) * _MV_RGB * .05;
                if (_MV_RGB > 0) c = float3(S(uv + ca).r, S(uv).g, S(uv - ca).b); else c = S(uv);

                if (_MV_Radial > 0)
                {
                    float3 acc = c; float w = 1;
                    for (int k = 1; k <= 10; k++) { float t = k / 10.0; float wi = 1 - t; acc += S(uv + toC * t * _MV_Radial * .4) * wi; w += wi; }
                    c = acc / w;
                }
                if (_MV_Blur > 0)
                {
                    float3 acc = 0; float r = _MV_Blur * .012;
                    for (int k = 0; k < 12; k++) { float a = k * 2.399; float q = sqrt((k + .5) / 12); acc += S(uv + float2(cos(a), sin(a) * _ScreenParams.x / _ScreenParams.y) * q * r); }
                    c = acc / 12;
                }
                if (_MV_Ink > 0 && _MV_InsertMix < .5)
                {
                    float2 px = 1.5 / _ScreenParams.xy;
                    float dc = LinearEyeDepth(SampleSceneDepth(uv), _ZBufferParams);
                    float e = 0, lc = dot(c, float3(.3, .6, .1));
                    float2 o[4] = { float2(px.x, 0), float2(-px.x, 0), float2(0, px.y), float2(0, -px.y) };
                    for (int k = 0; k < 4; k++)
                    {
                        float d2 = LinearEyeDepth(SampleSceneDepth(uv + o[k]), _ZBufferParams);
                        e += saturate(abs(d2 - dc) / (dc * .02 + .02)) + saturate(abs(dot(S(uv + o[k]), float3(.3, .6, .1)) - lc) * 4) * .35;
                    }
                    c = lerp(c, c * (1 - saturate(e * .9)), _MV_Ink);
                }
                if (_MV_Neon > 0)
                {
                    // Only the drawing: depth and light edges as lines on a flat field.
                    float2 px = 1.5 / _ScreenParams.xy;
                    float dc = LinearEyeDepth(SampleSceneDepth(uv), _ZBufferParams);
                    float e = 0, lc = dot(saturate(c), float3(.3, .6, .1));
                    float2 o[4] = { float2(px.x, 0), float2(-px.x, 0), float2(0, px.y), float2(0, -px.y) };
                    for (int k = 0; k < 4; k++)
                    {
                        float d2 = LinearEyeDepth(SampleSceneDepth(uv + o[k]), _ZBufferParams);
                        e += saturate(abs(d2 - dc) / (dc * .03 + .02)) + saturate((abs(dot(saturate(S(uv + o[k])), float3(.3, .6, .1)) - lc) - .05) * 5) * .5; // above the grain
                    }
                    c = lerp(c, lerp(_MV_NeonA.rgb, _MV_NeonB.rgb, saturate(e)), _MV_Neon);
                }
                if (_MV_Hatch > 0)
                {
                    // Pen strokes: the darker the tone, the more line sets cross.
                    float lum = dot(saturate(c), float3(.3, .6, .1));
                    float2 sp = uv * _ScreenParams.xy;
                    float l1 = step(.5, frac((sp.x + sp.y) / 7)), l2 = step(.5, frac((sp.x - sp.y) / 7)), l3 = step(.5, frac(sp.x / 5));
                    float ink = lum < .08 ? 0 : lum < .22 ? l1 * l2 * l3 : lum < .4 ? l1 * l2 : lum < .62 ? l1 : 1;
                    c = lerp(c, c * (.25 + .75 * ink) + ink * .04, _MV_Hatch);
                }
                if (_MV_Poster > 1) c = floor(saturate(c) * _MV_Poster + .5) / _MV_Poster;
                if (_MV_Halftone > 0)
                {
                    float sz = 7, an = .6, s = sin(an), k = cos(an);
                    float2 p = float2(uv.x * k * _ScreenParams.x - uv.y * s * _ScreenParams.y, uv.x * s * _ScreenParams.x + uv.y * k * _ScreenParams.y) / sz;
                    float lum = dot(saturate(c), float3(.3, .6, .1));
                    float dotv = smoothstep(lum * 1.1 + .02, lum * 1.1 - .12, length(frac(p) - .5) * 1.25);
                    c = lerp(c, c * .25 + (1 - dotv) * saturate(c) * 1.5, _MV_Halftone);
                }
                if (_MV_Duo > 0) { float l = saturate(dot(c, float3(.3, .6, .1))); c = lerp(c, lerp(_MV_DuoA.rgb, _MV_DuoB.rgb, l), _MV_Duo); }
                if (_MV_Scan > 0) { c *= 1 - _MV_Scan * .35 * (.5 + .5 * sin(uv0.y * _ScreenParams.y * 1.57)); c += (H(uv0 * 300 + _MV_Time) - .5) * .06 * _MV_Scan; }
                if (_MV_Invert > 0) c = lerp(c, 1 - saturate(c), _MV_Invert);
                if (_MV_Mask > 0) c = lerp(c, c * _MV_ChannelMask.rgb, _MV_Mask);
                if (_MV_Snow > 0)
                {
                    // TV snow between channels: coarse grain with a rolling band.
                    float2 sg = floor(uv0 * float2(420, 240));
                    float sn = H(sg + floor(_MV_Time * 60) * float2(3.1, 1.7));
                    float band = .75 + .25 * sin(uv0.y * 9 + _MV_Time * 14);
                    c = lerp(c, sn.xxx * band * float3(.92, .96, 1), saturate(_MV_Snow));
                }
                if (abs(uv0.y - .5) > .5 - _MV_Bars) c = 0;
                return float4(c, 1);
            }
            ENDHLSL
        }
    }
}
