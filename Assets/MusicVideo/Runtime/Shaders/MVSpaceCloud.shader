Shader "MV/SpaceCloud"
{
    // A gas giant's cloud deck at his scale: the near patch under the focus (MVSpace.cs). Billows are displaced in the vertex shader
    // from the patch's own coordinates and scene time, so they boil the same forward and back; the colour is the far layer's own
    // SpJupiter at that latitude and longitude, so the wall at his palms is the planet behind him. Haze closes the distance to the far deck.
    Properties
    {
        _Amp ("Billow height (m)", Float) = 260
        _Scale ("Billow size (m)", Float) = 2600
        _Boil ("Boil speed", Float) = .02
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "MVSpaceLib.hlsl"
        CBUFFER_START(UnityPerMaterial)
        float _Amp, _Scale, _Boil;
        CBUFFER_END
        float4 _SP_PatchN, _SP_PatchE, _SP_PatchNo;   // body-local up, east, north at the patch origin; w of _SP_PatchN: body radius (m)
        float _MV_SceneTime;
        float _SP_DeckBands;   // how much the band pattern is magnified across the patch, so a few bands cross the view
        float4 _SP_Vortex;     // a storm at his scale: centre x, z (m from the patch origin), radius (m), spin (rad/s at the core); w 0 = none
        // The storm's turn: everything inside `radius` is rotated about the centre, most at the core, with a spiral twist, on scene time.
        float2 Vortex(float2 xz, float t)
        {
            if (_SP_Vortex.z <= 0) return xz;
            float2 d = xz - _SP_Vortex.xy; float r = length(d) / _SP_Vortex.z;
            float core = 1 - smoothstep(0, 1, r);
            float ang = _SP_Vortex.w * t * (core * .85 + .15 * saturate(1.6 - r)) + core * core * 2.6;   // the spin, and the arms wound tighter inward
            float c = cos(ang), sn = sin(ang);
            return _SP_Vortex.xy + float2(d.x * c - d.y * sn, d.x * sn + d.y * c);
        }
        // The deck's height (m) at object-space x, z: a broad swell, swirled by a slow curl, and on it rounded cumulus towers
        // where the tower mask allows. Billow noise (|n|) gives round tops and creased valleys; no fine ripples (that read as sand).
        float2 DeckSwirl(float2 q, float t)
        {
            q = Vortex(q * _Scale, t) / _Scale;
            float b = t * _Boil;
            float2 w = float2(SpFbm(float3(q * .18, b), 4), SpFbm(float3(q * .18 + 5.2, b + 3.1), 4));
            float2 w2 = float2(SpFbm(float3(q * .5 + w * 2, b * 1.7 + 8.3), 3), SpFbm(float3(q * .5 + w * 2 + 3.7, b * 1.7 + 1.9), 3));
            return q + w * 2.2 + w2 * .8;
        }
        float DeckH(float2 xz, float t, float fp)
        {
            float2 q = DeckSwirl(xz / _Scale, t);
            float b = t * _Boil;
            float swell = SpFbm(float3(q * .22, b * .5), 4);
            float mask = smoothstep(-.12, .25, SpFbm(float3(q * .45 + 9.1, b * .6), 3));
            float puffs = 0, a = 1, f = 1;
            [loop] for (int k = 0; k < 7; k++)
            {
                if (fp * f / _Scale > .5) break;
                puffs += SpDomes(float3(q * f * 1.3 + k * 7.3, b * (1 + k * .4) + k)) * a;   // domes on domes: cauliflower
                a *= .5; f *= 2.1;
            }
            return (swell * .9 + mask * puffs * 1.25) * _Amp;
        }
        float3 DeckPos(float3 os, float t, float fp)
        {
            float r2 = dot(os.xz, os.xz);
            // The deck passes through the focus, and the first metres round it are a gentle shelf (the towers start beyond 6 m): a lens
            // 2 m from the wall must not end up inside a billow, where it would see through the back faces to the far layer.
            float shelf = smoothstep(6, 45, sqrt(r2));
            os.y = (DeckH(os.xz, t, fp) - DeckH(float2(0, 0), t, 0)) * shelf - r2 / (2 * max(_SP_PatchN.w, 1));
            return os;
        }
        ENDHLSL
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile _ _CLUSTER_LIGHT_LOOP
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            float4 _SP_NearFog;
            struct A { float4 v : POSITION; };
            struct V { float4 pos : SV_POSITION; float3 ws : TEXCOORD0; float3 os : TEXCOORD1; };
            V Vert(A a)
            {
                V o;
                float3 wsFlat = TransformObjectToWorld(a.v.xyz);
                float fp = length(wsFlat - _WorldSpaceCameraPos) * .002;
                o.os = DeckPos(a.v.xyz, _MV_SceneTime, fp);
                o.ws = TransformObjectToWorld(o.os); o.pos = TransformWorldToHClip(o.ws);
                return o;
            }
            half4 Frag(V i) : SV_Target
            {
                float t = _MV_SceneTime;
                float dist = length(i.ws - _WorldSpaceCameraPos);
                float fp = dist * .0015;
                float e = max(fp * 3, .2);
                float h0 = DeckH(i.os.xz, t, fp), hx = DeckH(i.os.xz + float2(e, 0), t, fp), hz = DeckH(i.os.xz + float2(0, e), t, fp);
                float3 nO = normalize(float3(-(hx - h0) / e, 1, -(hz - h0) / e));
                // cauliflower close up: domes from 6 m down to 25 cm, bent into the normal; their gaps are soft shade, never lines
                float fb = 0, fa = 1, ff = 1, fx = 0, fz = 0;
                [loop] for (int k = 0; k < 5; k++)
                {
                    float sc = 6.0 / ff;
                    if (dist * .0015 > sc * .4) break;
                    float3 q = float3(i.os.xz / sc + k * 5.1, t * .1 * (1 + k) + k);
                    float n0 = SpDomes(q), n1 = SpDomes(q + float3(.04, 0, 0)), n2 = SpDomes(q + float3(0, .04, 0));
                    fb += n0 * fa; fx += (n1 - n0) / .04 * fa; fz += (n2 - n0) / .04 * fa;
                    fa *= .5; ff *= 2.3;
                }
                float near = saturate(1 - dist / 400);
                nO = normalize(nO - float3(fx, 0, fz) * .6 * near);
                // at arm's length the clouds churn: a drift of a few cm/s on scene time, and filaments wound along the local flow
                float2 vx = Vortex(i.os.xz, t);
                float2 dr = float2(t * .03, t * .012);
                float2 fq = vx + dr;
                float2 fw = float2(SpFbm(float3(fq / 6, t * .02), 4), SpFbm(float3(fq / 6 + 9.1, t * .02), 4));
                float fil1 = pow(1 - abs(SpNoise(float3(fq / 2.5 + fw * 1.5, t * .03))), 5);
                float fil2 = pow(1 - abs(SpNoise(float3(fq / .7 + fw * 3 + 4.2, t * .05))), 6);
                float fil3 = pow(1 - abs(SpNoise(float3(fq / .22 + fw * 5 + 8.7, t * .08))), 6) * saturate(1 - dist / 25);
                float fil = saturate(fil1 * .8 + fil2 * .5 + fil3 * .35) * near;
                float cream = pow(1 - abs(SpNoise(float3(fq / 1.6 + fw * 2 + 2.9, t * .04))), 6) * near;
                float stormIn = 0;
                if (_SP_Vortex.z > 0) { float sr = length(i.os.xz - _SP_Vortex.xy) / _SP_Vortex.z; stormIn = 1 - smoothstep(.55, 1.15, sr); }
                float crease = saturate(fb * .7);
                float3 n = normalize(TransformObjectToWorldNormal(nO));
                float rel = saturate(h0 / max(_Amp * 1.6, 1));       // 0 deep in the valleys, 1 on the tallest tops
                float relL = saturate(rel * .7 + crease * .45 * near + (1 - near) * .15);   // the same, down to the puffs at his palms
                // colour: the planet's own bands, magnified so cream zones, ochre and rust belts cross the deck, swirled with the billows
                float R = max(_SP_PatchN.w, 1);
                float2 sw = DeckSwirl(i.os.xz / _Scale, t) * _Scale - i.os.xz;
                float zoom = max(_SP_DeckBands, 1);
                float3 off = (_SP_PatchE.xyz * (i.os.x + sw.x * .6) + _SP_PatchNo.xyz * (i.os.z + sw.y * .6)) * zoom;
                // marbling at his scale: the bands' latitude pushed about by swirling noise, so cream, ochre and rust curl past each other within a few metres
                float2 lq = i.os.xz / 60 + sw / 400;
                float marble = SpFbm(float3(lq + float2(SpFbm(float3(lq * .7, t * .02), 3), SpFbm(float3(lq * .7 + 4.1, t * .02), 3)) * 1.6, t * .03), 5);
                float2 lq2 = i.os.xz / 5 + marble * 2;
                float marble2 = SpFbm(float3(lq2 + float2(SpFbm(float3(lq2 * .6, t * .05), 3), SpFbm(float3(lq2 * .6 + 2.3, t * .05), 3)) * 1.4, t * .04), 4) * near;
                off += _SP_PatchNo.xyz * (marble + marble2 * .7) * R * .22;   // swirls of band colour at 60 m and at 5 m
                float3 bn = normalize(_SP_PatchN.xyz * R + off);
                float3 band = SpJupiter(bn, t, max(fp * zoom / R, 1e-9));
                band = saturate(lerp(dot(band, float3(.3, .55, .15)), band, 1.6));   // the bands' colour, pushed: cream, ochre, rust
                float3 deep = band * float3(.62, .42, .3);                         // rust and brown in the depths
                float3 top = lerp(band, float3(.95, .93, .88), .35);               // white ammonia ice on the high tops
                float3 alb = lerp(deep, band * 1.05, smoothstep(.05, .45, relL));
                // the storm's rust and ochre arms spiral through the cream; filaments carry rust and ochre streaks everywhere near
                float3 rust = band * float3(.6, .36, .24), ochre = band * float3(.88, .7, .45);
                float arms = .5 + .5 * sin(atan2(i.os.z - _SP_Vortex.y, i.os.x - _SP_Vortex.x) * 2 + length(i.os.xz - _SP_Vortex.xy) * .9 + fw.x * 4 - t * _SP_Vortex.w * 2);
                alb = lerp(alb, lerp(ochre, rust, arms), stormIn * (.55 + .3 * arms));
                alb = lerp(alb, rust * .8, fil * .9);
                alb = lerp(alb, ochre, saturate(fil1 - fil2) * .3 * near);
                alb = lerp(alb, float3(.96, .94, .9), cream * .35);
                alb *= lerp(1, .45 + .55 * saturate(fb * 1.3), near);        // the creases between puffs are in shadow (undersides)
                alb *= lerp(1, .62, near);                                      // close, the deck is dense cloud, not a lit white wall
                alb = lerp(alb, top, smoothstep(.6, .95, relL));
                alb *= .82;
                Light L = GetMainLight(TransformWorldToShadowCoord(i.ws));
                float3 v = SafeNormalize(GetWorldSpaceViewDir(i.ws));
                float ndl = dot(n, L.direction);
                // soft, volumetric: wrapped light, a thick cloud's own shadow in the valleys, silver edges against the sun, a cool sky fill
                float wrap = lerp(.35, 1, smoothstep(-.7, .9, ndl)) * lerp(1, .55 + .45 * saturate(fb * 1.2), near);   // light diffuses deep into cloud; close, the puffs shade their own creases
                float occl = lerp(.62, 1, smoothstep(0, .7, relL));
                float powder = 1 - exp(-rel * 3 - .3);
                float3 c = alb * L.color * wrap * lerp(.6, 1, L.shadowAttenuation) * occl * lerp(.75, 1.1, powder);
                c = lerp(c, c * float3(.75, .8, .95), (1 - wrap) * .5);
                float edge = pow(1 - saturate(dot(n, v)), 3);
                c += L.color * lerp(alb, 1, .5) * pow(saturate(dot(v, -L.direction)), 5) * edge * 1.6 * (1 - near * .7);   // silver lining (soft when close)
                c += alb * L.color * edge * saturate(ndl + .3) * .25;                                    // light through thin edges
                c += alb * SampleSH(n) * .5 * occl;
                c *= lerp(.66, .24, near);   // at arm's length the wall is dense cloud in its own shade, far below white
                uint nl = GetAdditionalLightsCount();
                for (uint li = 0; li < nl; li++) { Light a = GetAdditionalLight(li, i.ws); c += alb * a.color * saturate(dot(n, a.direction) * .5 + .5) * a.distanceAttenuation * occl; }
                // depth: haze thickens with distance and fills the valleys first, toward the far deck's own colour
                if (_SP_NearFog.a > 0)
                {
                    float f = 1 - exp(-dist / _SP_NearFog.a);
                    f = saturate(f + (1 - rel) * .12 * saturate(dist / (_Scale * 2)));
                    c = lerp(c, _SP_NearFog.rgb * lerp(1, L.color, .3), f);
                }
                return half4(c, 1);
            }
            ENDHLSL
        }
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode"="ShadowCaster" }
            ZWrite On ColorMask 0
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"
            float3 _LightDirection;
            float4 Vert(float4 v : POSITION) : SV_POSITION
            {
                float3 os = DeckPos(v.xyz, _MV_SceneTime, length(TransformObjectToWorld(v.xyz) - _WorldSpaceCameraPos) * .002);
                float3 ws = TransformObjectToWorld(os);
                return ApplyShadowClamping(TransformWorldToHClip(ApplyShadowBias(ws, _LightDirection, _LightDirection)));
            }
            half4 Frag() : SV_Target { return 0; }
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
            #pragma fragment Frag
            float4 Vert(float4 v : POSITION) : SV_POSITION { float3 os = DeckPos(v.xyz, _MV_SceneTime, length(TransformObjectToWorld(v.xyz) - _WorldSpaceCameraPos) * .002); return TransformObjectToHClip(os); }
            float Frag(float4 p : SV_POSITION) : SV_Target { return p.z; }
            ENDHLSL
        }
    }
}
