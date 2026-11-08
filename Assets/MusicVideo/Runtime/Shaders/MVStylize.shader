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
            // Looks from the style library. All 0 by default, so a video that does not use them is unchanged.
            float _MV_Vhs, _MV_Split, _MV_Lift, _MV_Halation, _MV_Paper, _MV_Flicker, _MV_Weave, _MV_InkWidth, _MV_Aspect, _MV_SceneTime;
            float4 _MV_SplitA, _MV_SplitB;
            // Air and film, for daylight looks. All 0 by default too. Haze, veil and dust read the sky's sun, set with the sky cue.
            float _MV_Haze, _MV_Veil, _MV_Leak, _MV_Dust, _MV_Curve;
            float4 _MV_SunDirW, _MV_SunCol;
            float _MV_InsertMix, _MV_InsertScale, _MV_Bars, _MV_InsertGray;
            float4 _MV_Jolt; // x,y screen shake on footage, z punch zoom
            TEXTURE2D(_MV_Insert);
            // The epic toolkit (MVEpicFx.cs; all 0 by default, so nothing below runs for a video that doesn't ask).
            float _MV_Lines, _MV_Impact;
            float4 _MV_LinesP;      // x 0 radial / 1 parallel, y angle (radians), z ink (black lines), w seed (a new set every step)
            float4 _MV_LinesQ;      // x density, y clear radius round the centre, z width (share of a bin), w count
            float4 _MV_LinesAt;     // xyz world point (w 1) or screen point xy (w 2), else the screen centre
            float4 _MV_ImpactP;     // x invert, y depth cut (subject = nearer than its depth times this; negative: a luminance cut), z radial lines, w seed
            float4 _MV_ImpactAt;    // xyz the subject in the world, w 1 when given
            float4 _MV_ImpactAccent;// rgb tints the paper, a how much
            float4 _MV_ShockW;      // xyz centre, w radius (world)
            float4 _MV_ShockP;      // x strength, y width (share of the radius), z glow

            float H(float2 p) { return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }

            // A world point on screen (0..1, the same flip as the blit) and its eye depth; depth <= 0 behind the camera.
            float2 ScreenOf(float3 w, out float depth)
            {
                float4 cs = mul(UNITY_MATRIX_VP, float4(w, 1));
                depth = cs.w;
                float2 ndc = cs.xy / max(abs(cs.w), 1e-5);
            #if UNITY_UV_STARTS_AT_TOP
                ndc.y = -ndc.y;
            #endif
                return ndc * .5 + .5;
            }
            float2 CentreOf(float4 at)
            {
                if (at.w > 1.5) return at.xy;
                if (at.w > .5) { float d; float2 s = ScreenOf(at.xyz, d); if (d > 0) return s; }
                return float2(.5, .5);
            }
            // Speed lines, hand-drawn style: radial focus lines (thin wedges of random length round a clear centre) or parallel streaks,
            // each set drawn from `seed`, so a new seed every step redraws them all, as on 2s.
            float SpeedLines(float2 uv, float2 ctr, float mode, float angle, float seed, float density, float clear, float width, float count)
            {
                float asp = _ScreenParams.x / _ScreenParams.y;
                if (mode < .5)
                {
                    float2 d = (uv - ctr) * float2(asp, 1);
                    float r = length(d), a = atan2(d.y, d.x) / TWO_PI + .5;
                    float x = a * count, id = floor(x), f = frac(x);
                    float h1 = H(float2(id, seed)), h2 = H(float2(id * 1.7 + 3, seed + 5.1)), h3 = H(float2(id * .37 + 9, seed + 2.3));
                    float on = step(1 - density, h1);
                    float w = width * (.25 + h2) * .5;
                    float ln = smoothstep(w, w * .35, abs(f - (.25 + .5 * h3)));
                    float r0 = clear * (1 + 1.8 * h2);
                    return on * ln * smoothstep(r0, r0 + .06 + .1 * h3, r);
                }
                float2 dir = float2(cos(angle), sin(angle));
                float2 p = (uv - .5) * float2(asp, 1);
                float along = dot(p, dir), across = dot(p, float2(-dir.y, dir.x));
                float y = (across + 1) * count * .5, id = floor(y), f = frac(y);
                float h1 = H(float2(id, seed)), h2 = H(float2(id * 1.3 + 7, seed + 1.9)), h3 = H(float2(id * .71 + 2, seed + 4.4));
                float on = step(1 - density, h1);
                float w = width * (.25 + h2) * .5;
                float ln = smoothstep(w, w * .35, abs(f - .5));
                float s0 = (h2 - .6) * 2.2 * asp, len = .25 + h3 * 1.1;
                float seg = smoothstep(s0, s0 + .04, along) * smoothstep(s0 + len, s0 + len - .2, along);
                float2 dc = (uv - ctr) * float2(asp, 1);
                return on * ln * seg * smoothstep(clear * .5, clear, length(dc));
            }
            // The shock ring on screen: its centre, radius (in frame heights) and the signed distance across the ring in widths.
            bool ShockRing(float2 uv, out float2 dirN, out float x, out float rr)
            {
                dirN = 0; x = 9; rr = 0;
                if (_MV_ShockP.x <= 0 && _MV_ShockP.z <= 0) return false;
                float d0, d1; float2 c = ScreenOf(_MV_ShockW.xyz, d0);
                if (d0 <= 0) return false;
                float2 e = ScreenOf(_MV_ShockW.xyz + UNITY_MATRIX_V[0].xyz * _MV_ShockW.w, d1);
                float asp = _ScreenParams.x / _ScreenParams.y;
                rr = length((e - c) * float2(asp, 1));
                float2 d = (uv - c) * float2(asp, 1); float r = length(d) + 1e-5;
                dirN = d / r;
                x = (r - rr) / max(rr * _MV_ShockP.y * 1.5, .004);
                return true;
            }

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

            float3 H3(float3 p) { p = frac(p * float3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return frac((p.xxy + p.yxx) * p.zyx); }

            // Motes hanging in the air: a walk through a world-fixed grid along the view ray, one mote a cell at most. Same place from any camera, drifting on scene time.
            float DustMotes(float3 ro, float3 rd, float maxD)
            {
                const float cell = .6;
                rd += 1e-4;
                float3 p = ro / cell, ip = floor(p), st = sign(rd), td = abs(1 / rd), tm = (ip + max(st, 0) - p) / rd;
                float acc = 0;
                for (int k = 0; k < 16; k++)
                {
                    float3 h = H3(ip + 311);
                    if (h.x < .5)
                    {
                        float3 m = ip + .25 + .5 * h.yzx + .22 * sin(_MV_SceneTime * (.13 + .2 * h) + h * 6.28);
                        float3 oc = m - p;
                        float t = dot(oc, rd) * cell;
                        if (t > .35 && t < maxD)
                        {
                            float d = length(oc - rd * dot(oc, rd)) * cell, r = max(.0028 + .0042 * h.z, t * .00115), e = .0028 / r;
                            acc += smoothstep(r, r * .15, d) * (.35 + .65 * h.y) * saturate(e * 1.4) * saturate((t - .35) * 3);
                        }
                    }
                    float3 c0 = step(tm, tm.yzx) * step(tm, tm.zxy);
                    ip += c0 * st; tm += c0 * td;
                }
                return acc;
            }

            float2 Warp(float2 uv)
            {
                float asp = _ScreenParams.x / _ScreenParams.y;
                if (_MV_Weave > 0)
                {
                    float fr = floor(_MV_SceneTime * 48);
                    uv += (float2(H(float2(fr, 3.1)), H(float2(fr, 7.7))) - .5) * .0035 * _MV_Weave;
                }
                if (_MV_Vhs > 0)
                {
                    float y = uv.y, tt = _MV_Time;
                    float wob = sin(y * 7 + tt * 1.3) * .5 + sin(y * 23 - tt * 2.1) * .3 + (H(float2(floor(y * 240), floor(tt * 30))) - .5) * .35;
                    uv.x += wob * .0016 * _MV_Vhs;
                    float head = smoothstep(.045, .012, y);                     // the head-switching band at the bottom
                    uv.x += head * (.04 + (H(float2(floor(y * 240), floor(tt * 30) + 9)) - .5) * .03) * _MV_Vhs;
                    float rollY = frac(tt * .07 + .3);
                    uv.x += smoothstep(.02, 0, abs(y - rollY)) * .012 * _MV_Vhs * sin(tt * 40);
                }
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
                if (_MV_ShockP.x > 0)
                {
                    // the shock ring bends what is behind it: out past the ring, in just inside it
                    float2 dn; float x, rr;
                    if (ShockRing(uv, dn, x, rr)) uv -= dn / float2(asp, 1) * (_MV_ShockP.x * .035 * x * exp(-x * x * .9));
                }
                return saturate(uv);
            }

            float4 Frag(Varyings i) : SV_Target
            {
                float2 uv0 = i.texcoord, uv = Warp(uv0);
                float3 c;
                float2 toC = _MV_Center.xy - uv;
                float2 ca = (uv - .5) * _MV_RGB * .05;
                if (_MV_RGB > 0) c = float3(S(uv + ca).r, S(uv).g, S(uv - ca).b); else c = S(uv);

                if (_MV_Vhs > 0)
                {
                    // Tape: soft luma, smeared chroma that lags behind it.
                    const float3x3 toY = float3x3(.299, .587, .114, .596, -.274, -.322, .211, -.523, .312);
                    float3 acc = 0;
                    for (int k = -3; k <= 3; k++) acc += S(uv + float2(k * .00095, 0));
                    float luma = dot(acc / 7, float3(.299, .587, .114));
                    float3 chr = 0;
                    for (int k = -6; k <= 6; k++) chr += S(uv + float2(.0048 + k * .0034, 0));
                    chr /= 13;
                    float3 yiq = mul(toY, chr); yiq.x = luma;
                    float3 tape = float3(yiq.x + .956 * yiq.y + .621 * yiq.z, yiq.x - .272 * yiq.y - .647 * yiq.z, yiq.x - 1.106 * yiq.y + 1.703 * yiq.z);
                    c = lerp(c, tape, _MV_Vhs);
                }
                if (_MV_Halation > 0)
                {
                    // Film: bright edges bleed red-orange into the emulsion.
                    float3 acc = 0;
                    for (int k = 0; k < 10; k++) { float a = k * 2.399; float q = sqrt((k + .5) / 10) * .011; float3 x = S(uv + float2(cos(a) / (_ScreenParams.x / _ScreenParams.y), sin(a)) * q); acc += max(x - .72, 0); }
                    c += acc / 10 * float3(1.5, .5, .2) * _MV_Halation;
                }

                if (_MV_Haze > 0 || _MV_Veil > 0 || _MV_Dust > 0)
                {
                    // Air: distance goes to a cool sky colour, warmer toward the sun. The sky itself keeps its own haze.
                    float raw = SampleSceneDepth(uv);
                #if !UNITY_REVERSED_Z
                    raw = lerp(UNITY_NEAR_CLIP_VALUE, 1, raw);
                    bool isSky = raw >= .99999;
                #else
                    bool isSky = raw <= .00001;
                #endif
                    float3 wp = ComputeWorldSpacePosition(uv, raw, UNITY_MATRIX_I_VP), ray = wp - _WorldSpaceCameraPos;
                    float dist = isSky ? 60 : length(ray); ray = normalize(ray);
                    float mu = saturate(dot(ray, _MV_SunDirW.xyz));
                    float3 sunC = _MV_SunCol.rgb;
                    if (_MV_Haze > 0 && !isSky)
                    {
                        float fog = 1 - exp(-dist * _MV_Haze * .018);
                        c = lerp(c, lerp(float3(.74, .76, .82), sunC, pow(mu, 3) * .85 + .15), fog);
                    }
                    if (_MV_Dust > 0) c += sunC * DustMotes(_WorldSpaceCameraPos, ray, min(dist, 9)) * (.22 + pow(mu * .5 + .5, 5) * 1.3) * _MV_Dust;
                    if (_MV_Veil > 0)
                    {
                        float v = (pow(mu, 7) * .3 + pow(mu, 60) * .55) * _MV_Veil;
                        c = 1 - (1 - saturate(c)) * (1 - saturate(v * sunC));
                    }
                }
                if (_MV_Leak > 0)
                {
                    // A light leak from the side the sun is on, on the lens, moving slowly.
                    float side = dot(UNITY_MATRIX_V[0].xyz, _MV_SunDirW.xyz) > 0 ? 1 - uv.x : uv.x;
                    float q = side + (uv.y - .5) * .28 + .05 * sin(_MV_SceneTime * .7);
                    float l = pow(saturate(1 - q / .75), 2.2);
                    c = 1 - (1 - saturate(c)) * (1 - saturate(l * lerp(float3(1, .44, .18), float3(1, .82, .52), l) * _MV_Leak));
                }

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
                    float2 px = max(_MV_InkWidth, 1.5) / _ScreenParams.xy;
                    float dc = LinearEyeDepth(SampleSceneDepth(uv), _ZBufferParams);
                    float e = 0, lc = dot(c, float3(.3, .6, .1));
                    float2 o[4] = { float2(px.x, 0), float2(-px.x, 0), float2(0, px.y), float2(0, -px.y) };
                    for (int k = 0; k < 4; k++)
                    {
                        float d2 = LinearEyeDepth(SampleSceneDepth(uv + o[k]), _ZBufferParams);
                        if (_MV_InkWidth > 0) e += saturate((abs(d2 - dc) - dc * .06) / (dc * .05 + .02)); // a drawn line: silhouettes only, however thick
                        else e += saturate(abs(d2 - dc) / (dc * .02 + .02)) + saturate(abs(dot(S(uv + o[k]), float3(.3, .6, .1)) - lc) * 4) * .35;
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
                if (_MV_Paper > 0)
                {
                    // Printed on stock: colour sits in the paper, whites go cream, fibres show.
                    float fib = H(floor(uv0 * _ScreenParams.xy / 2)) * .6 + H(floor(uv0 * _ScreenParams.xy / float2(9, 2))) * .4;
                    float3 stock = float3(.97, .93, .82) * (.95 + .07 * fib);
                    c = lerp(c, saturate(c) * stock + (1 - saturate(c)) * float3(.05, .04, .06), _MV_Paper);
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
                if (_MV_Split > 0)
                {
                    float l = saturate(dot(saturate(c), float3(.3, .6, .1)));
                    float3 toned = c + (_MV_SplitA.rgb - .5) * (1 - l) * (1 - l) * .28 + (_MV_SplitB.rgb - .5) * l * l * .7;
                    c = lerp(c, toned, _MV_Split);
                }
                if (_MV_Curve > 0)
                {
                    // A film curve over the tonemap: a soft S, creamy highlights, and neon greens pulled to olive.
                    float3 k = saturate(c);
                    float l = dot(k, float3(.3, .6, .1)), green = saturate((k.g - max(k.r, k.b)) * 3.5);
                    k.g -= green * .055; k.r += green * .03; k.b *= 1 - green * .15;
                    k = lerp(k, k * k * (3 - 2 * k), .38);
                    k = lerp(k, l * float3(1.03, 1, .94), smoothstep(.72, 1, l) * .4);
                    c = lerp(c, k, _MV_Curve);
                }
                if (_MV_Lift != 0) c = c * (1 - _MV_Lift) + _MV_Lift * .5;
                if (_MV_Flicker > 0) c *= 1 + (H(float2(floor(_MV_SceneTime * 48), 2.3)) - .5) * .09 * _MV_Flicker;
                if (_MV_Vhs > 0)
                {
                    float2 sg = float2(floor(uv0.x * 360), floor(uv0.y * 240));
                    float tt = floor(_MV_Time * 30);
                    c += (H(sg + tt * float2(1.3, 2.1)) - .5) * .05 * _MV_Vhs;
                    float band = floor(uv0.y * 240);
                    float drop = step(.9965, H(float2(band, tt))) * step(.72, H(float2(floor(uv0.x * 30 + H(float2(band, tt)) * 30), tt + band)));
                    c = lerp(c, float3(.95, .95, 1), drop * _MV_Vhs);
                    c *= 1 - _MV_Vhs * .1 * (.5 + .5 * sin(uv0.y * 240 * 6.283));
                    c = lerp(c, 0, smoothstep(.03, .008, uv0.y) * .5 * _MV_Vhs);
                }
                if (_MV_ShockP.z > 0) { float2 dn; float x, rr; if (ShockRing(uv0, dn, x, rr)) c += exp(-x * x * 3) * _MV_ShockP.z; }
                if (_MV_Lines > 0)
                {
                    float2 ctr = CentreOf(_MV_LinesAt);
                    float m = SpeedLines(uv0, ctr, _MV_LinesP.x, _MV_LinesP.y, _MV_LinesP.w, _MV_LinesQ.x, _MV_LinesQ.y, _MV_LinesQ.z, max(_MV_LinesQ.w, 8)) * saturate(_MV_Lines);
                    c = lerp(c, _MV_LinesP.z > .5 ? float3(0, 0, 0) : float3(1, 1, 1) * max(1, dot(c, float3(.3, .6, .1))), m);
                }
                if (_MV_Impact > 0)
                {
                    // The impact frame: two tones. The subject (nearer than its own depth times the cut, or bright, for a luminance cut) goes black on white
                    // paper; its own highlights stay white as interior shapes; silhouettes get a drawn edge; radial lines from the subject; a rough edge.
                    float lum = dot(saturate(c), float3(.3, .6, .1));
                    float rough = (H(floor(uv0 * _ScreenParams.xy / 3) + _MV_ImpactP.w) - .5);
                    float de = LinearEyeDepth(SampleSceneDepth(uv0), _ZBufferParams);
                    float ink;
                    if (_MV_ImpactP.y > 0 && _MV_ImpactAt.w > .5) { float sd; ScreenOf(_MV_ImpactAt.xyz, sd); ink = step(de, max(sd, .01) * _MV_ImpactP.y * (1 + rough * .04)); ink *= 1 - step(.82 + rough * .1, lum); }
                    else ink = step((_MV_ImpactP.y > 0 ? .3 : -_MV_ImpactP.y) + rough * .08, lum);
                    float2 px = 2 / _ScreenParams.xy; float e = 0;
                    float2 o[4] = { float2(px.x, 0), float2(-px.x, 0), float2(0, px.y), float2(0, -px.y) };
                    for (int k = 0; k < 4; k++) { float d2 = LinearEyeDepth(SampleSceneDepth(uv0 + o[k]), _ZBufferParams); e += saturate((abs(d2 - de) - de * .04) / (de * .04 + .02)); }
                    ink = saturate(ink + step(.5, e));
                    if (_MV_ImpactP.z > 0) ink = saturate(ink + SpeedLines(uv0, CentreOf(_MV_ImpactAt), 0, 0, _MV_ImpactP.w + 7, .7, .26, .2, 120) * .95);
                    float3 paper = lerp(float3(1, 1, 1), _MV_ImpactAccent.rgb, _MV_ImpactAccent.a);
                    float3 two = ink > .5 ? float3(0, 0, 0) : paper;
                    if (_MV_ImpactP.x > .5) two = ink > .5 ? paper : float3(0, 0, 0);
                    c = lerp(c, two, saturate(_MV_Impact));
                }
                if (abs(uv0.y - .5) > .5 - _MV_Bars) c = 0;
                if (_MV_Aspect > 0)
                {
                    float now = _ScreenParams.x / _ScreenParams.y;
                    if (now > _MV_Aspect && abs(uv0.x - .5) > .5 * _MV_Aspect / now) c = 0;
                    if (now < _MV_Aspect && abs(uv0.y - .5) > .5 * now / _MV_Aspect) c = 0;
                }
                return float4(c, 1);
            }
            ENDHLSL
        }
    }
}
