Shader "MV/Eye"
{
    // A real wet eyeball: refraction through the cornea onto a fibred iris, a veined sclera, contact shadow from the lids, and the
    // actual room picture in the tear film. Radius 1, +Z is the front. Also works on a plain sphere without its rig.
    Properties
    {
        _Pupil ("Pupil", Float) = 0.3
        _Iris ("Iris colour", Color) = (.17,.33,.40,1)
        _Iris2 ("Iris inner", Color) = (.62,.45,.2,1)
        _Sclera ("Sclera", Color) = (.84,.77,.73,1)
        _Refl ("Room seen from the eye", 2D) = "black" {}
        _ReflK ("Reflection scale", Float) = 1
        _ReflGain ("Reflection strength", Float) = 1
        _LidU ("Upper lid height", Float) = .5
        _LidL ("Lower lid height", Float) = .44
        _LidClose ("Blink", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex V
            #pragma fragment F
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _ADDITIONAL_LIGHT_SHADOWS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile _ _CLUSTER_LIGHT_LOOP
            #include "MVEyeLib.hlsl"
            TEXTURE2D(_Refl); SAMPLER(sampler_Refl);
            CBUFFER_START(UnityPerMaterial)
            float4 _Iris, _Iris2, _Sclera; float4x4 _RigW2L; float _Pupil, _ReflK, _ReflGain, _LidU, _LidL, _LidClose;
            CBUFFER_END
            float _MV_EyePupil, _MV_EyeTV, _MV_SceneTime;
            float4 _MV_EyeColor;
            struct A { float4 p : POSITION; float3 n : NORMAL; };
            struct W { float4 p : SV_POSITION; float3 os : TEXCOORD0; float3 ws : TEXCOORD1; float3 nw : TEXCOORD2; float3 no : TEXCOORD3; };
            W V(A i) { W o; o.p = TransformObjectToHClip(i.p.xyz); o.os = i.p.xyz; o.ws = TransformObjectToWorld(i.p.xyz); o.nw = TransformObjectToWorldNormal(i.n); o.no = i.n; return o; }

            float Fib(float a, float t)
            {
                float v = 0, s = 1, q = 1;
                for (int k = 0; k < 4; k++) { v += Noise(float2(a * q * 19, t * 2.2 * q + k)) * s; s *= .55; q *= 2.1; }
                return v / 1.9;
            }

            float Veins(float2 p, float seed)
            {
                float w = Fbm(p * 2.1 + seed);
                float v = 1 - abs(Noise(p * 3.1 + w * 1.6 + seed) * 2 - 1);
                float v2 = 1 - abs(Noise(p * 7.3 + w * 2.4 - seed) * 2 - 1);
                return pow(v, 22) + .55 * pow(v2, 26);
            }

            float4 F(W i) : SV_Target
            {
                float3 n = normalize(i.nw), vw = GetWorldSpaceNormalizeViewDir(i.ws);
                float3 no = normalize(i.no);
                float3 vo = normalize(mul((float3x3)UNITY_MATRIX_I_M, vw));
                float3 d = normalize(i.os);
                const float irisZ = .74, irisR = .655;
                float limb = saturate(length(d.xy) / irisR);
                bool front = d.z > 0;

                // The iris sits behind the cornea: bend the view at the surface and find where it lands.
                float3 ray = refract(-vo, no, 1 / 1.376);
                float3 hit = i.os + ray * max(0, i.os.z - irisZ) / max(-ray.z, .08);
                float rr = length(hit.xy) / irisR, a = atan2(hit.y, hit.x);
                float pupil = _MV_EyePupil > 0 ? _MV_EyePupil : _Pupil;

                float t = saturate((rr - pupil) / (1 - pupil));
                float f = Fib(a, t + .3 + sin(a * 3) * .04);
                float crypt = smoothstep(.62, .3, Noise(float2(a * 7, t * 6)) * .6 + f * .6) * smoothstep(.1, .3, t) * smoothstep(.95, .6, t);
                float collar = exp(-pow((t - .3) / .07, 2));
                float3 iris = lerp(_Iris2.rgb * 1.3, _Iris.rgb, smoothstep(.12, .5, t));
                iris *= .3 + 1.5 * pow(f, 1.5);
                iris *= 1 - .7 * crypt;
                iris += _Iris2.rgb * collar * .22 * (f + .3);
                iris *= lerp(1, .1, smoothstep(.8, 1.02, t));              // the dark limbal ring
                float ruff = smoothstep(pupil * 1.1, pupil, rr);           // pupil edge
                iris = lerp(iris, iris * .25, ruff);
                if (rr < pupil) iris = .002;

                float2 sp = d.xy / (1.2 + d.z);
                float side = saturate(abs(d.x) * 1.3 - .25);
                float vein = Veins(sp * 5.2, 3.1) * (.35 + side) * smoothstep(.62, .85, length(d.xy));
                float deep = Fbm(sp * 9) * .5;
                float3 sclera = _Sclera.rgb * (.86 + .28 * deep);
                sclera = lerp(sclera, float3(.86, .5, .42), side * side * .4);      // warmer toward the corners
                sclera = lerp(sclera, float3(.55, .07, .06), saturate(vein));
                float edge = smoothstep(.96, 1.04, rr);

                float3 alb = front ? lerp(iris, sclera, edge) : sclera;
                float3 surfaceN = lerp(n, normalize(TransformObjectToWorldNormal(float3(0, 0, 1))), (1 - edge) * .55);

                EyeLit L = EyeLights(i.ws, surfaceN, vw, i.p, .25, 30);
                EyeLit LN = EyeLights(i.ws, n, vw, i.p, 0, 30);
                float3 amb = SampleSH(n);
                float3 c = alb * (L.diff + amb);

                // Contact shadow: the lids sit on the wet surface and the light dies where they touch.
                float3 pr = mul(_RigW2L, float4(i.ws, 1)).xyz;
                float u = EyeU(pr.x), mid = EyeMid(pr.x);
                float yu = lerp(mid + _LidU * EyeUp(u), mid - _LidL * EyeLo(u) * .82, _LidClose);
                float yl = mid - _LidL * EyeLo(u) * (1 - _LidClose * .18);
                float du = yu - pr.y, dl = pr.y - yl;
                float occ = lerp(.1, 1, smoothstep(0, .34, du)) * lerp(.35, 1, smoothstep(0, .12, dl));
                c *= occ;

                // The wet layer: the actual room, seen from his head, in a small curved reflection.
                float tear = (Noise(i.os.xy * 7 + _MV_SceneTime * .2) - .5) * .012;
                float3 nr = SafeNormalize(mul((float3x3)_RigW2L, normalize(n + float3(tear, -tear, 0))));
                float3 vr = SafeNormalize(mul((float3x3)_RigW2L, vw));
                float3 r = reflect(-vr, nr);
                float nv = saturate(dot(nr, vr));
                float fres = .03 + .97 * pow(1 - nv, 5);
                float3 room = 0;
                if (r.z > .02)
                {
                    float2 uv = .5 + .5 * r.xy / r.z * _ReflK; uv.y = 1 - uv.y; // a cornea shows the room the right way up
                    float2 m = smoothstep(0, .06, uv) * smoothstep(1, .94, uv);
                    room = SAMPLE_TEXTURE2D(_Refl, sampler_Refl, uv).rgb * m.x * m.y;
                }
                float reflOcc = lerp(.25, 1, occ);
                c += room * fres * 8 * _ReflGain * (_MV_EyeTV > 0 ? _MV_EyeTV : 1) * reflOcc;
                c += LN.wet * occ;
                return float4(c, 1);
            }
            ENDHLSL
        }
        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode"="DepthOnly" }
            ZWrite On ColorMask R
            HLSLPROGRAM
            #pragma vertex V
            #pragma fragment F
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            float4 V(float4 p : POSITION) : SV_POSITION { return TransformObjectToHClip(p.xyz); }
            float4 F(float4 p : SV_POSITION) : SV_Target { return p.z; }
            ENDHLSL
        }
    }
}
