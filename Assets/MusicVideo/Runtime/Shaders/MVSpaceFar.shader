Shader "MV/SpaceFar"
{
    // The far layer of the real-scale space set (MVSpace.cs). Every planet, moon, ring, the sun and the stars at their true size and
    // distance in kilometres, ray-traced per pixel from the near camera's own rays, so the far "camera" has the near camera's rotation
    // and lens exactly. Centres arrive relative to the camera, worked out in double precision on the CPU, so nothing jitters at a
    // million kilometres or a metre above Jupiter. Drawn after the opaque near layer, only where nothing near was drawn, and before
    // anything transparent: characters, boulders and effects sit on top with their own depth.
    // Its maps are global textures, set by MVSpace per camera (Props/Space/*.png).
    SubShader
    {
        Tags { "Queue"="Transparent-499" "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "IgnoreProjector"="True" }
        Pass
        {
            Name "Far"
            Tags { "LightMode"="UniversalForward" }
            ZWrite Off ZTest LEqual Cull Off Blend Off
            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex Vert
            #pragma fragment Frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "MVSpaceLib.hlsl"

            TEXTURE2D(_SP_Rings); SAMPLER(sampler_SP_Rings);
            TEXTURE2D(_SP_EarthDay); SAMPLER(sampler_SP_EarthDay);
            TEXTURE2D(_SP_EarthLights); SAMPLER(sampler_SP_EarthLights);
            TEXTURE2D(_SP_EarthLand); SAMPLER(sampler_SP_EarthLand);
            TEXTURE2D(_SP_Moon); SAMPLER(sampler_SP_Moon);

            float4x4 _SP_Rot;                 // near world direction -> far direction
            float4 _SP_Sun;                   // far direction to the sun (xyz), angular radius (w)
            float4 _SP_SunCol;                // colour * intensity of sunlight on bodies (rgb), disc brightness (a)
            float4 _SP_Misc;                  // pixel angle (rad), scene time, star brightness, exposure of the far layer
            float4 _SP_Haze;                  // the camera is inside an atmosphere: colour (rgb), distance (km) for 63% (a, 0 = none)
            int _SP_N, _SP_NR, _SP_NS;
            float4 _SP_B[8];                  // centre rel. camera (km), radius (km)
            float4 _SP_BH[8];                 // camera altitude above the surface (km, exact), look id, atmosphere height (km), crater body index
            float4 _SP_BX[8], _SP_BY[8], _SP_BZ[8]; // far -> body-local rotation rows
            float4 _SP_BA[8];                 // atmosphere colour (rgb), strength
            float4 _SP_BT[8];                 // tint (rgb), albedo scale
            float4 _SP_BC[8];                 // crater: body-local direction (xyz), angular radius now (w)
            float4 _SP_BC2[8];                // crater: progress 0-1, final angular radius, glow, 0
            float4 _SP_R[4];                  // ring centre rel. camera (km), signed altitude of the camera above its plane (km, exact)
            float4 _SP_RN[4], _SP_RU[4];      // ring normal (xyz) and its own in-plane axis (xyz, w spin angle)
            float4 _SP_RP[4];                 // inner, outer (km), profile start, profile end (km)
            float4 _SP_RK[4];                 // shadowing body index (-1 none), opacity, near fade (km), clumps
            float4 _SP_S[4];                  // speck position rel. camera (km), size (pixels)
            float4 _SP_SC[4];                 // speck colour (rgb, HDR), 0
            float4 _SP_ST[4];                 // speck trail start rel. camera (km), 1 if there is a trail

            struct A { float4 v : POSITION; };
            struct V { float4 pos : SV_POSITION; float3 dir : TEXCOORD0; };

            float4 _SP_CamR, _SP_CamU, _SP_CamF;   // the camera's axes in the FAR frame; w of R: tan(fov/2) * aspect, w of U: tan(fov/2)
            V Vert(A a)
            {
                V o;
                float2 xy = a.v.xy;
                o.pos = float4(xy, UNITY_RAW_FAR_CLIP_VALUE, 1);
                float2 s = xy; if (_ProjectionParams.x < 0) s.y = -s.y;   // drawn into a flipped target, the top of the clip is the bottom of the picture
                o.dir = _SP_CamF.xyz + _SP_CamR.xyz * (s.x * _SP_CamR.w) + _SP_CamU.xyz * (s.y * _SP_CamU.w);
                return o;
            }

            // ------------------------------------------------------------------ geometry
            // Nearest hit of a ray from the camera (origin) along d with the sphere centred c, radius r; h = camera altitude, exact.
            // The near root as q / (b + sqrt(disc)) never subtracts two big numbers, so a metre above Jupiter is still a metre.
            bool Sphere(float3 d, float3 c, float r, float h, out float t)
            {
                float b = dot(d, c), q = h * (2 * r + h);
                float disc = b * b - q;
                t = 0;
                if (disc < 0) return false;
                if (h <= 0) return false;   // the camera is inside it (a world moved over the set): draw nothing of it rather than its inside
                if (b <= 0) return false; t = q / (b + sqrt(disc)); return true;
            }

            float3 Stars(float3 d, float pix)
            {
                float3 col = 0;
                float sig = max(pix * .75, 2e-5);
                [unroll] for (int L = 0; L < 3; L++)
                {
                    float scale = L == 0 ? 90 : (L == 1 ? 260 : 700);
                    float dens = L == 0 ? .06 : (L == 1 ? .05 : .045);
                    float3 g = d * scale, id = floor(g);
                    float3 hh = SpHash3(id + L * 17.3) * .5 + .5;
                    if (hh.x > dens) continue;
                    float3 sp = normalize((id + .2 + SpHash3(id * 1.7 + 3.1) * .3 + .3) / scale);
                    float a = length(cross(d, sp));
                    float mag = pow(hh.y, L == 0 ? 5 : 7) * (L == 0 ? 1.6 : (L == 1 ? .5 : .22));
                    float3 tint = lerp(float3(.62, .74, 1), float3(1, .82, .62), hh.z);
                    tint = lerp(tint, 1, .5);
                    // the flux is fixed and spread over at least a pixel, so a star never sparkles as the camera moves
                    float flux = mag * 6e-6;
                    col += tint * flux / (2 * SP_PI * sig * sig) * exp(-a * a / (2 * sig * sig));
                }
                // the Milky Way: a faint band with dust lanes
                float3 mw = normalize(float3(.42, .75, -.51));
                float band = exp(-pow(dot(d, mw) / .16, 2));
                float dust = SpFbm(d * 7, 5) * .5 + .5;
                col += float3(.55, .58, .7) * band * (.012 + .02 * SpFbm(d * 3 + 2.1, 4)) * smoothstep(.25, .65, dust);
                return col * _SP_Misc.z;
            }

            // A body's surface at local direction n: albedo, emission, smoothness (oceans), and the height used for the normal.
            void Surface(int i, float look, float3 n, float fp, float t, out float3 alb, out float3 emit, out float spec, out float cloud)
            {
                alb = .5; emit = 0; spec = 0; cloud = 0;
                float2 ll = SpLatLon(n); float2 uv = float2(ll.y / (2 * SP_PI) + .5, .5 + ll.x / SP_PI);   // Unity's v runs up: the north is the top row of the PNG
                float lod = max(0, log2(max(fp, 1e-9) * 652 * 1.4));
                if (look < .5)          // rock with the Moon's map
                {
                    alb = SAMPLE_TEXTURE2D_LOD(_SP_Moon, sampler_SP_Moon, uv, lod - 1).r * float3(1, .98, .95);
                    alb *= .9 + SpFbm(n * 60, SpOct(60, fp)) * .3;
                }
                else if (look < 1.5)    // Earth
                {
                    // The maps are about 10 km a texel; below that, everything is procedural and keyed to the map:
                    // a fractal coast pushed about only where the map is near its shoreline, ground texture at every scale, shelves, lights broken into towns.
                    float3 day = SAMPLE_TEXTURE2D_LOD(_SP_EarthDay, sampler_SP_EarthDay, uv, lod).rgb;
                    float landRaw = SAMPLE_TEXTURE2D_LOD(_SP_EarthLand, sampler_SP_EarthLand, uv, lod).r;
                    float coastZone = saturate(landRaw * (1 - landRaw) * 4.5);
                    float cn = SpFbm(n * 700, SpOct(700, fp)) + SpFbm(n * 5200 + 3.3, SpOct(5200, fp)) * .5;
                    float land = smoothstep(.47, .53, landRaw + cn * .8 * (coastZone + .04));
                    float3 ocean = lerp(float3(.012, .045, .11), float3(.035, .15, .2), smoothstep(.08, .48, landRaw + cn * .1));
                    float3 landCol = lerp(float3(.28, .3, .17), day, smoothstep(.25, .75, landRaw));       // the map's ocean colour never shows on land
                    float g1 = SpFbm(n * 260, SpOct(260, fp)), g2 = SpFbm(n * 1900 + 7.1, SpOct(1900, fp)), g3 = SpFbm(n * 14000 + 2.9, SpOct(14000, fp));
                    float ridge = 1 - abs(SpFbm(n * 900 + 5.5, SpOct(900, fp)) * 2);
                    landCol *= .8 + g1 * .45 + g2 * .28 + g3 * .06;
                    landCol = lerp(landCol, landCol * float3(.75, .7, .65), smoothstep(.55, .9, ridge) * .6);       // ridges and valleys
                    float biome = SpFbm(n * 120 + 1.7, SpOct(120, fp)) + g2 * .2;
                    landCol = lerp(landCol, float3(.46, .38, .24), smoothstep(.05, .35, biome) * .55);              // dry ground
                    landCol = lerp(landCol, float3(.1, .17, .07), smoothstep(.1, .4, -biome) * .5);   // dark forest
                    landCol = lerp(landCol, landCol * float3(.85, 1.05, .8), smoothstep(.1, .4, g2) * .25);         // fields
                    day = lerp(ocean, landCol, land);
                    cloud = SpEarthClouds(n, t, fp);
                    float3 cloudCol = lerp(float3(.6, .64, .72), float3(.97, .97, .98), smoothstep(.15, .85, cloud));   // thick cloud is bright, thin cloud shows grey
                    alb = lerp(day, cloudCol, smoothstep(.0, .7, cloud));
                    spec = (1 - land) * (1 - cloud);
                    float lights = SAMPLE_TEXTURE2D_LOD(_SP_EarthLights, sampler_SP_EarthLights, uv, lod).r;
                    float towns = smoothstep(.15, .7, SpFbm(n * 6000, SpOct(6000, fp)) + lights * .6);
                    float streets = smoothstep(.2, .75, SpFbm(n * 60000 + 3.3, SpOct(60000, fp)) + .55) * smoothstep(.1, .6, SpFbm(n * 300000 + 7.7, SpOct(300000, fp)) + .6);
                    lights *= lerp(1, .25 + 1.6 * towns, saturate(1 - lod * .5)) * lerp(1, .3 + 1.2 * streets, saturate(1 - lod)) * land;   // towns, then streets and blocks when close
                    emit = float3(1, .7, .38) * (lights * 1.5 + lights * lights * 5) * (1 - cloud * .7);
                }
                else if (look < 2.5) alb = SpJupiter(n, t, fp);
                else if (look < 3.5) alb = SpSaturn(n, t, fp);
                else                    // a small grey moon, cratered
                {
                    alb = float3(.56, .56, .55) * (.82 + SpFbm(n * 8, SpOct(8, fp)) * .3 + SpFbm(n * 70, SpOct(70, fp) - 2) * .15);
                }
                alb *= _SP_BT[i].rgb * _SP_BT[i].a;
            }

            float Height(int i, float look, float3 n, float fp)
            {
                float h = 0;
                if (look > 3.5) h = SpCraters(n, fp);
                if (_SP_BC2[i].y > 0)
                {
                    float ang = acos(clamp(dot(n, _SP_BC[i].xyz), -1, 1));
                    float a = max(_SP_BC[i].w, 1e-5);
                    h += SpCraterProfile(ang / a) * a * .45 * smoothstep(0, .25, _SP_BC2[i].x);
                }
                return h;
            }

            float RingAlpha(int j, float r, out float3 col)
            {
                float u = (r - _SP_RP[j].z) / (_SP_RP[j].w - _SP_RP[j].z);
                float4 s = SAMPLE_TEXTURE2D_LOD(_SP_Rings, sampler_SP_Rings, float2(saturate(u), .5), 0);
                float inside = step(_SP_RP[j].x, r) * step(r, _SP_RP[j].y) * step(0, u) * step(u, 1);
                col = s.rgb;
                return s.a * inside * _SP_RK[j].y;
            }

            // Shadow of the rings on a point p (rel. camera) lit along L: how much light the ring planes let through.
            float RingShadow(float3 p, float3 L, int body)
            {
                float lit = 1;
                [loop] for (int j = 0; j < _SP_NR; j++)
                {
                    if ((int)_SP_RK[j].x != body) continue;
                    float3 N = _SP_RN[j].xyz; float dl = dot(L, N);
                    if (abs(dl) < 1e-4) continue;
                    float s = dot(_SP_R[j].xyz - p, N) / dl;
                    if (s <= 0) continue;
                    float3 c; float a = RingAlpha(j, length(p + L * s - _SP_R[j].xyz), c);
                    lit *= 1 - a * .85;
                }
                return lit;
            }

            // Shadow of the spheres on a point p (rel. camera): the planet's shadow across its rings, a moon's on its planet.
            float SphereShadow(float3 p, float3 L, int self)
            {
                float lit = 1;
                [loop] for (int k = 0; k < _SP_N; k++)
                {
                    if (k == self) continue;
                    float3 c = _SP_B[k].xyz - p; float r = _SP_B[k].w;
                    float b = dot(L, c); if (b <= 0) continue;
                    float dp = length(cross(L, c));          // distance of the sun ray from its centre; |c|^2 - b^2 loses everything in float
                    float soft = r * .004 + b * _SP_Sun.w;
                    lit *= smoothstep(r - soft, r + soft, dp);
                }
                return lit;
            }

            float3 ShadeBody(int i, float3 d, float t, float pix)
            {
                float3 c = _SP_B[i].xyz; float R = _SP_B[i].w; float look = _SP_BH[i].y;
                float3 p = d * t - c;                         // from the centre, km
                float3 nW = normalize(p);
                float3x3 M = float3x3(_SP_BX[i].xyz, _SP_BY[i].xyz, _SP_BZ[i].xyz);
                float3 n = mul(M, nW);
                float fp = pix * t / R;                       // radii per pixel
                float3 L = _SP_Sun.xyz;
                float3 alb, emit; float spec, cloud;
                Surface(i, look, n, fp, _SP_Misc.y, alb, emit, spec, cloud);
                // normal from the height field (craters), in body space then back to far space
                float3 nn = nW;
                if (look > 3.5 || _SP_BC2[i].y > 0)
                {
                    float e = max(fp * 1.5, 2e-4);
                    float3 tA = normalize(cross(n, abs(n.y) < .9 ? float3(0, 1, 0) : float3(1, 0, 0))), tB = cross(n, tA);
                    float h0 = Height(i, look, n, fp), hA = Height(i, look, normalize(n + tA * e), fp), hB = Height(i, look, normalize(n + tB * e), fp);
                    float3 nl = normalize(n - tA * (hA - h0) / e - tB * (hB - h0) / e);
                    nn = mul(transpose(M), nl);
                }
                float ndl = dot(nn, L), ndlG = dot(nW, L);
                float lit = saturate(ndl);
                float atm = _SP_BH[i].z;
                float3 col;
                float shadow = RingShadow(d * t, L, i) * SphereShadow(d * t, L, i);
                if (look > .5 && look < 3.5 && look != 1)
                {
                    // gas giants: a soft limb-darkened terminator (Minnaert) and a hazy edge
                    float mu0 = saturate(ndlG), mu = saturate(dot(nW, -d));
                    float k = .85;
                    float m = pow(mu0, k) * pow(max(mu, 1e-3), k - 1);
                    m *= smoothstep(-.02, .12, ndlG);
                    col = alb * _SP_SunCol.rgb * m * shadow;
                    col += alb * _SP_SunCol.rgb * .015 * pow(1 - mu, 2);                 // forward-scattered haze at the night limb
                }
                else if (look > .5 && look < 1.5)
                {
                    // Earth: the ground under thin air, the sea's glint, the night lights, the blue limb
                    float wrap = saturate((ndlG + .08) / 1.08);
                    float3 dayLight = _SP_SunCol.rgb * lit;
                    float red = (1 - smoothstep(0, .25, ndlG)) * smoothstep(-.12, .02, ndlG);
                    dayLight *= lerp(1, float3(1.0, .62, .38), red * .8);
                    // cloud shadow, sampled toward the sun
                    float cs = SpEarthClouds(normalize(n + mul(M, L) * .006), _SP_Misc.y, fp);
                    col = alb * dayLight * (1 - cs * (1 - cloud) * .55) * shadow;
                    // the sea's glint on waves: the normal tilted by fine noise, so the sun's path breaks up close and stays smooth far off
                    float wv = saturate(1 - fp * 3000);
                    float3 wn = normalize(nn + (float3(SpNoise(nW * 30000), SpNoise(nW * 30000 + 3.1), SpNoise(nW * 30000 + 7.7))) * .06 * wv);
                    float3 h = normalize(L - d);
                    float g = pow(saturate(dot(wn, h)), 260) * 5 + pow(saturate(dot(wn, h)), 40) * .1;
                    col += spec * g * _SP_SunCol.rgb * lit * float3(1, .95, .85);
                    float mu = saturate(dot(nW, -d));
                    // the air between: blue by day, orange at the terminator, thicker toward the limb (aerial perspective)
                    float path = 1 / max(mu, .06);
                    float haze = 1 - exp(-path * .09);
                    float3 sky = lerp(float3(1, .5, .25), float3(.3, .52, 1), smoothstep(-.05, .3, ndlG)) * _SP_SunCol.rgb * smoothstep(-.15, .25, ndlG) * .55;
                    col = lerp(col, sky, haze * .8);
                    float night = 1 - smoothstep(-.12, .06, ndlG);   // (an HLSL smoothstep with its edges reversed is undefined)
                    col += emit * night * (1 - haze * .5);
                    float rim = pow(1 - mu, 2.2);
                    col = lerp(col, float3(.32, .55, 1) * _SP_SunCol.rgb * wrap * .55, rim * .45 * smoothstep(-.15, .2, ndlG));
                }
                else
                {
                    // airless rock: a hard terminator and the opposition surge
                    float phase = saturate(dot(L, -d)) ;
                    col = alb * _SP_SunCol.rgb * lit * (1 + .15 * pow(phase, 8)) * shadow;
                }
                // a fresh crater: white-hot then orange, the shock ring running out ahead of it
                if (_SP_BC2[i].y > 0)
                {
                    float pr = _SP_BC2[i].x, a = max(_SP_BC[i].w, 1e-5), A = _SP_BC2[i].y;
                    float ang = acos(clamp(dot(n, _SP_BC[i].xyz), -1, 1)) / a;
                    float cool = saturate(pr * 1.6);
                    float3 hc = lerp(float3(1, .9, .7), float3(1, .35, .08), saturate(pr * 3));
                    float core = smoothstep(.75, .0, ang) * pow(1 - cool, 3) * 2.2;                // the molten floor, cooling
                    float rimHot = exp(-pow((ang - 1) / .09, 2)) * pow(1 - cool, 2) * 3.0;        // the rim, glowing as it rises
                    float flash = exp(-pr * 40) * smoothstep(.5, 0, ang) * 4;                    // the first frames
                    col = lerp(col, col * .35, smoothstep(1, .6, ang) * saturate(pr * 4));       // the fresh bowl, deep and shadowed
                    col += hc * (core + rimHot + flash) * _SP_BC2[i].z;
                    float shock = A * (.9 + 3.2 * sqrt(pr)) / a;                                  // the shock ring runs out ahead of the rim
                    float dustRing = exp(-pow((ang - shock) / (.1 + pr * .3), 2)) * (.45 + .9 * saturate(SpFbm(n * 60, 4) + .5));   // a ragged ring of dust, not a line
                    col = lerp(col, float3(.85, .8, .72) * _SP_SunCol.rgb * (.4 + .6 * lit), saturate(dustRing * pow(1 - pr, 1.5) * .75 * _SP_BC2[i].z));
                    // bright young ejecta rays
                    float rays = pow(saturate(SpNoise(float3(atan2(dot(n, cross(_SP_BC[i].xyz, float3(0, 1, 0.1))), dot(n, float3(0, 1, 0.1))) * 9, 0, 3.3)) + .3), 3);
                    col += alb * _SP_SunCol.rgb * lit * rays * exp(-pow((ang - 1.6) / 1.1, 2)) * smoothstep(0, .4, pr) * .9;
                }
                return col;
            }

            // Light scattered in a thin atmosphere along the ray as it passes the body: the limb glow, blue by day and orange at the terminator.
            float3 AtmosphereGlow(int i, float3 d, float tMax)
            {
                float H = _SP_BH[i].z; if (H <= 0 || _SP_BH[i].x < H) return 0;   // inside the air, the haze does this
                float3 c = _SP_B[i].xyz; float R = _SP_B[i].w;
                float b = dot(d, c); if (b <= 0 && _SP_BH[i].x > H) return 0;
                if (b > tMax) return 0;
                float3 cp = d * b - c; float hgt = length(cp) - R;
                if (hgt > H * 6) return 0;
                float3 nW = normalize(cp);
                float sunSide = dot(nW, _SP_Sun.xyz);
                float dens = exp(-max(hgt, 0) / H) * (hgt < 0 ? exp(hgt / (H * .6)) : 1);
                float3 tint = lerp(float3(1, .5, .22), _SP_BA[i].rgb, smoothstep(-.05, .3, sunSide));
                float light = smoothstep(-.25, .15, sunSide);
                // the path through a shell of height H at grazing incidence is about sqrt(2 R H)
                return tint * dens * light * _SP_BA[i].a * _SP_SunCol.rgb * .9;
            }

            float3 Speck(int s, float3 d, float pix, float tMax)
            {
                float3 p = _SP_S[s].xyz; float dist = length(p);
                if (dist > tMax) return 0;
                float3 sp = p / dist;
                float a = length(cross(d, sp)) * step(0, dot(d, sp));
                float size = _SP_S[s].w * pix;
                float3 col = _SP_SC[s].rgb * (exp(-pow(a / (size * .35), 2)) * 1.0 + exp(-a / (size * 1.2)) * .25);
                if (_SP_ST[s].w > 0)
                {
                    float3 q = normalize(_SP_ST[s].xyz);
                    // angular distance from d to the arc between the trail's start and the speck
                    float3 ax = normalize(cross(q, sp) + 1e-7);
                    float off = abs(dot(d, ax));
                    float3 dp = normalize(d - ax * dot(d, ax));
                    float along = dot(cross(q, dp), ax), total = dot(cross(q, sp), ax);
                    float f = saturate(along / max(total, 1e-7));
                    float inArc = step(0, along) * step(along, total) * step(0, dot(dp, sp));
                    col += _SP_SC[s].rgb * .5 * inArc * pow(f, 1.5) * exp(-pow(off / (size * .25), 2));
                }
                return col;
            }

            half4 Frag(V i) : SV_Target
            {
                float3 d = normalize(i.dir);
                float pix = _SP_Misc.x;
                float3 col = Stars(d, pix);
                // the sun's disc and its glow on the dark of space
                float mu = dot(d, _SP_Sun.xyz), sa = acos(clamp(mu, -1, 1));
                col += _SP_SunCol.a * (smoothstep(_SP_Sun.w + pix, _SP_Sun.w - pix, sa) * 1.0 + exp(-sa / (_SP_Sun.w * 3)) * .05 + exp(-sa / .08) * .004) * float3(1, .97, .9);

                // the nearest sphere
                float tS = 1e30; int hit = -1;
                [loop] for (int k = 0; k < _SP_N; k++)
                {
                    float t; if (Sphere(d, _SP_B[k].xyz, _SP_B[k].w, _SP_BH[k].x, t) && t < tS) { tS = t; hit = k; }
                }
                if (hit >= 0) col = ShadeBody(hit, d, tS, pix);
                [loop] for (int k2 = 0; k2 < _SP_N; k2++) col += AtmosphereGlow(k2, d, tS);

                // the rings, far to near (at most four)
                float tr[4] = { -1, -1, -1, -1 };
                [loop] for (int j = 0; j < _SP_NR; j++)
                {
                    float dn2 = dot(d, _SP_RN[j].xyz); if (abs(dn2) < 1e-7) continue;
                    float t = -_SP_R[j].w / dn2;
                    if (t > 0 && t < tS) tr[j] = t;
                }
                [loop] for (int it = 0; it < 4; it++)
                {
                    int best = -1; float bt = -1;
                    [unroll] for (int j2 = 0; j2 < 4; j2++) if (tr[j2] > bt) { bt = tr[j2]; best = j2; }
                    if (best < 0) break;
                    tr[best] = -1;
                    float3 p = d * bt;
                    float3 q = p - _SP_R[best].xyz; float r = length(q);
                    float3 rc; float a = RingAlpha(best, r, rc);
                    if (a <= 0) continue;
                    // ringlets and clumps, so a near ring has grain and a spinning hoop shows it spins
                    float3 U = _SP_RU[best].xyz, V2 = cross(_SP_RN[best].xyz, U);
                    float ang = atan2(dot(q, V2), dot(q, U)) - _SP_RU[best].w;
                    float fine = SpNoise(float3(r * .004, 0, 1.3)) * .35 + SpNoise(float3(r * .02, 0, 1.3)) * .3 + SpNoise(float3(r * .2, 0, 2.9)) * .15;
                    float clump = SpFbm(float3(r * .0006, cos(ang) * 30, sin(ang) * 30), 4) * _SP_RK[best].w;
                    a = saturate(a * (1 + fine + clump * 1.4));
                    a = 1 - pow(saturate(1 - a * .92), 1 / max(abs(dot(d, _SP_RN[best].xyz)), .18));   // a thin slab: seen edge-on it is thicker
                    // fade out right at the camera, where the near layer's boulders take over
                    a *= smoothstep(_SP_RK[best].z * .5, _SP_RK[best].z, bt);
                    float3 L = _SP_Sun.xyz, N = _SP_RN[best].xyz;
                    float litSide = sign(dot(L, N)) == sign(-dot(d, N)) ? 1 : 0;   // seen from the side the sun is on
                    float sh = SphereShadow(p, L, -1);
                    float3 lc = rc * _SP_SunCol.rgb * sh * lerp(.35 * (1 - a), 1, litSide) * (.35 + .65 * sqrt(abs(dot(L, N))));
                    lc *= .85 * (.7 + fine * 1.3 + SpNoise(float3(r * .0021, 0, 7.7)) * .4);
                    col = lerp(col, lc, a);
                }
                [loop] for (int s = 0; s < _SP_NS; s++) col += Speck(s, d, pix, tS);
                if (_SP_Haze.a > 0)
                {
                    float f = 1 - exp(-min(tS, 1e6) / _SP_Haze.a);
                    col = lerp(col, _SP_Haze.rgb, f);
                }
                return half4(col * _SP_Misc.w, 1);
            }
            ENDHLSL
        }
    }
}
