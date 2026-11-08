// The real-scale space set (MVSpace.cs): noise and the planets' own surfaces, shared by the far layer (MVSpaceFar.shader) and the
// near patches (MVSpaceRock, MVSpaceCloud) so a cloud wall a metre from his hands is the same Jupiter as the disc behind him.
// Everything is a function of a direction on the body and scene time: pure, so it scrubs and runs backward.
#ifndef MV_SPACE_LIB
#define MV_SPACE_LIB

#define SP_PI 3.14159265

float3 SpHash3(float3 p)
{
    p = float3(dot(p, float3(127.1, 311.7, 74.7)), dot(p, float3(269.5, 183.3, 246.1)), dot(p, float3(113.5, 271.9, 124.6)));
    return frac(sin(p) * 43758.5453) * 2 - 1;
}
float SpHash1(float3 p) { return frac(sin(dot(p, float3(12.9898, 78.233, 37.719))) * 43758.5453); }

// Gradient noise, about -0.7..0.7.
float SpNoise(float3 p)
{
    float3 i = floor(p), f = frac(p);
    float3 u = f * f * f * (f * (f * 6 - 15) + 10);
    float n000 = dot(SpHash3(i), f), n100 = dot(SpHash3(i + float3(1, 0, 0)), f - float3(1, 0, 0));
    float n010 = dot(SpHash3(i + float3(0, 1, 0)), f - float3(0, 1, 0)), n110 = dot(SpHash3(i + float3(1, 1, 0)), f - float3(1, 1, 0));
    float n001 = dot(SpHash3(i + float3(0, 0, 1)), f - float3(0, 0, 1)), n101 = dot(SpHash3(i + float3(1, 0, 1)), f - float3(1, 0, 1));
    float n011 = dot(SpHash3(i + float3(0, 1, 1)), f - float3(0, 1, 1)), n111 = dot(SpHash3(i + float3(1, 1, 1)), f - float3(1, 1, 1));
    return lerp(lerp(lerp(n000, n100, u.x), lerp(n010, n110, u.x), u.y), lerp(lerp(n001, n101, u.x), lerp(n011, n111, u.x), u.y), u.z);
}

// Fractal noise with a soft last octave, so detail fades in as the camera comes closer instead of popping.
float SpFbm(float3 p, float oct)
{
    float a = .5, s = 0;
    [loop] for (int k = 0; k < 12; k++)
    {
        float w = saturate(oct - k);
        if (w <= 0) break;
        s += a * SpNoise(p) * w;
        p = p * 2.03 + float3(1.7, 9.2, 3.1);
        a *= .5;
    }
    return s;
}

// How many octaves a pattern of base frequency `freq` (cycles per radius) earns at a footprint of `fp` radii per pixel.
float SpOct(float freq, float fp) { return clamp(log2(.5 / max(fp * freq, 1e-7)), 1, 11); }

float2 SpLatLon(float3 n) { return float2(asin(clamp(n.y, -1, 1)), atan2(n.x, n.z)); }
float3 SpFromLatLon(float lat, float lon) { return float3(sin(lon) * cos(lat), sin(lat), cos(lon) * cos(lat)); }

// ------------------------------------------------------------------------------------------------ Jupiter
TEXTURE2D(_SP_Bands); SAMPLER(sampler_SP_Bands);
float _SP_JupWind, _SP_StormSpin;
float4 _SP_Storm; // lat, lon (radians, body frame), half width, half height (radians)

float3 SpBand(float lat, float column)
{
    float v = .5 + lat / SP_PI;   // the PNG's top row is +90, and Unity's v runs up
    return SAMPLE_TEXTURE2D_LOD(_SP_Bands, sampler_SP_Bands, float2(column, v), 0).rgb;
}

// Jupiter's cloud tops at body direction n (unit), scene time t, footprint fp (radii per pixel). Bands from the real profile,
// bent by turbulence that is stretched east-west and sheared by alternating jets, the Great Red Spot spinning in its collar.
float3 SpJupiter(float3 n, float t, float fp)
{
    float2 ll = SpLatLon(n); float lat = ll.x, lon = ll.y;
    float jet = sin(lat * 13.0) * .7 + sin(lat * 27.0 + 1.3) * .3;
    float lonA = lon + jet * t * _SP_JupWind;
    // the storm: rotate the sampling point about its centre, fastest in the middle
    float2 sd = float2((lon - _SP_Storm.y) * cos(_SP_Storm.x), lat - _SP_Storm.x);
    sd.x = sd.x - 2 * SP_PI * cos(_SP_Storm.x) * round(sd.x / (2 * SP_PI * cos(_SP_Storm.x)));
    float2 se = sd / _SP_Storm.zw; float sr = length(se);
    float spin = _SP_StormSpin * t * (1.6 - smoothstep(0, 1.4, sr) * 1.6) - sr * 2.2;
    float cs = cos(spin), sn = sin(spin);
    float storm = 1 - smoothstep(.9, 1.5, sr);
    if (storm > 0)
    {
        float2 r = float2(se.x * cs - se.y * sn, se.x * sn + se.y * cs) * _SP_Storm.zw;
        float2 rr = lerp(sd, r, storm);
        lat = _SP_Storm.x + rr.y; lonA = _SP_Storm.y + rr.x / cos(_SP_Storm.x) + jet * t * _SP_JupWind * (1 - storm);
    }
    float3 q = SpFromLatLon(lat, lonA);
    float oct = SpOct(18, fp);
    float3 qa = q * float3(2.2, 7.0, 2.2);
    float w1 = SpFbm(qa * 2.0 + float3(0, 0, t * .004), min(oct, 7));
    float w2 = SpFbm(qa * 7.0 + float3(4.3, 1.1, t * .01), oct - 1);
    float w3 = SpFbm(qa * 22.0 + float3(w2 * 3, 2.7, w1 * 2), oct - 2);
    float edge = .55 + .45 * abs(sin(lat * 13.0));
    float latW = lat + (w1 * .09 + w2 * .045 + w3 * .018) * edge;
    float3 col = SpBand(latW, .25);
    // streaks along the bands, curls where the jets shear, fine billows
    float s1 = SpFbm(q * float3(10, 52, 10) + w1 * 2.5, oct - 1);
    float s2 = SpFbm(q * float3(40, 140, 40) + float3(w2, w3, w2) * 3, oct - 3);
    float s3 = SpFbm(q * float3(120, 300, 120) + w3 * 4, oct - 5);
    col *= .8 + s1 * .55 + s2 * .3 + s3 * .2;
    col = lerp(col, col * float3(1.08, 1.0, .9), saturate(w2 * 2));   // warm and cool streaks
    // dark festoons trailing from the North Equatorial Belt's edge into the zone, and small white ovals in the south
    float fest = smoothstep(.2, .45, SpFbm(q * float3(6, 30, 6) + 7.1, 4)) * exp(-pow((lat - .09) / .03, 2));
    col = lerp(col, float3(.32, .36, .42), fest * .55);
    float3 oc = q * 9; float3 oi = floor(oc); float oh = SpHash1(oi);
    float ov = (oh > .82) ? smoothstep(.32, .12, length(frac(oc) - .5 - (SpHash3(oi) * .15))) * smoothstep(-.2, -.6, lat) * smoothstep(-1.2, -.7, lat) : 0;
    col = lerp(col, float3(.95, .93, .88), ov * .8);
    // the Great Red Spot: red-orange spiral with a pale core, ringed by a white collar
    if (storm > 0)
    {
        float ang = atan2(se.y, se.x) + spin;
        float2 pr = float2(cos(ang), sin(ang)) * sr;
        float fil = SpFbm(float3(pr * 6 + float2(sr * 4, 0), 1.7), min(oct, 6));
        float arms = .5 + .5 * sin(ang * 2 + sr * 11 + fil * 6);
        float3 red = lerp(float3(.55, .22, .12), float3(.84, .5, .33), saturate(arms * .55 + (1 - sr) * .45 + fil * .5));
        red = lerp(red, float3(.9, .72, .56), smoothstep(.3, 0, sr) * .45);
        red *= .82 + .36 * SpFbm(float3(pr * 20, 4.1), oct - 2);
        col = lerp(col, red, smoothstep(1.02, .74, sr + fil * .12));
        float collar = exp(-pow((sr - 1.13 - fil * .08) / .11, 2));
        col = lerp(col, float3(.95, .92, .86) * (.85 + .3 * fil), collar * .6);
    }
    // the poles: blue-grey haze and chaotic cyclones
    col = lerp(col, col * float3(.82, .88, 1.0), smoothstep(.95, 1.25, abs(lat)));
    return saturate(col);
}

// ------------------------------------------------------------------------------------------------ Saturn
float3 SpSaturn(float3 n, float t, float fp)
{
    float2 ll = SpLatLon(n); float lat = ll.x, lon = ll.y;
    float oct = SpOct(12, fp);
    float3 q = SpFromLatLon(lat, lon + sin(lat * 10) * t * .002);
    float w = SpFbm(q * float3(2, 9, 2), min(oct, 6));
    float3 col = SpBand(lat + w * .02, .75);
    col *= .93 + SpFbm(q * float3(8, 60, 8) + w, oct - 1) * .16;
    // the north polar hexagon
    float colat = SP_PI * .5 - lat;
    float a = lon - floor((lon + SP_PI / 6) / (SP_PI / 3)) * (SP_PI / 3);
    float hexR = .26 / cos(a);
    col = lerp(col, float3(.55, .6, .58), exp(-pow((colat - hexR) / .022, 2)) * .5 * step(0, lat));
    col = lerp(col, float3(.45, .52, .55), smoothstep(.2, .05, colat) * .6);
    return saturate(col);
}

// ------------------------------------------------------------------------------------------------ Earth's clouds
float SpEarthClouds(float3 n, float t, float fp)
{
    float2 ll = SpLatLon(n); float lat = ll.x;
    float oct = SpOct(6, fp);
    float3 p = n * 3.0 + float3(0, 0, t * .002);
    float3 wp = float3(SpFbm(p * 1.3 + 3.1, 5), SpFbm(p * 1.3 + 7.7, 5), SpFbm(p * 1.3 + 12.9, 5));
    float c = SpFbm(p * 2.0 + wp * 1.8, oct) + SpFbm(p * 9 + wp * 3, oct - 2) * .35;
    c += SpNoise(p * 120 + wp * 6) * .2 * saturate(oct - 7) + SpNoise(p * 700 + wp * 9) * .12 * saturate(oct - 9);   // finer cloud close up (smooth, never wormy)
    float al = abs(lat) * 57.3;
    float cover = .5 + .28 * exp(-pow((al - 52) / 14, 2)) + .22 * exp(-pow(al / 7, 2)) - .22 * exp(-pow((al - 24) / 7, 2)) + .1 * smoothstep(65, 80, al);
    float streak = SpFbm(float3(n.x * 4, n.y * 22, n.z * 4) + wp * 2, oct - 1) * .25;   // thin bands stretched by the winds
    return saturate((c + streak + cover - .62) * 2.6);
}

// ------------------------------------------------------------------------------------------------ cumulus
// Rounded domes on jittered cells (2D cells, z drifts them in time): each cell holds one puff of its own size, and the tallest
// dome wins, so overlapping puffs make the cauliflower of a cumulus top seen from above. 0..about 1.
float SpDomes(float3 p)
{
    float2 id = floor(p.xy); float best = 0;
    [unroll] for (int x = -1; x <= 1; x++) [unroll] for (int y = -1; y <= 1; y++)
    {
        float2 c = id + float2(x, y);
        float3 h = SpHash3(float3(c, 4.7)) * .5 + .5;
        float2 ctr = c + .5 + (h.xy - .5) * .8 + float2(sin(p.z + h.z * 6.28), cos(p.z * .8 + h.x * 6.28)) * .12;
        float r = .55 + h.z * .45;
        float d = length(p.xy - ctr) / r;
        float dome = sqrt(saturate(1 - d * d)) * r;
        float hk = max(.18 - abs(best - dome), 0) / .18;
        best = max(best, dome) + hk * hk * .18 * .25;   // a soft union: puffs merge in rounded folds, not in seams
    }
    return best;
}

// ------------------------------------------------------------------------------------------------ craters
// A crater of radius 1 at distance d (in radii): the bowl, the raised rim, the ejecta blanket.
float SpCraterProfile(float d)
{
    float bowl = -(1 - d * d) * .55 * step(d, 1);
    float rim = .22 * exp(-pow((d - 1.0) / .22, 2));
    float blanket = .05 * exp(-pow((d - 1.4) / .5, 2)) * step(1, d);
    return bowl + rim + blanket;
}

// A heavily cratered small moon: two layers of craters in Voronoi cells over the sphere. Height in radii.
float SpCraters(float3 n, float fp)
{
    float h = 0;
    [unroll] for (int L = 0; L < 3; L++)
    {
        float freq = L == 0 ? 2.3 : (L == 1 ? 7.1 : 21.7);
        if (fp * freq > .4) break;
        float keep = L == 0 ? .55 : (L == 1 ? .45 : .4);
        float3 g = n * freq, id = floor(g);
        [unroll] for (int x = -1; x <= 1; x++) [unroll] for (int y = -1; y <= 1; y++) [unroll] for (int z = -1; z <= 1; z++)
        {
            float3 c = id + float3(x, y, z); float3 hh = SpHash3(c + L * 31.7) * .5 + .5;
            if (hh.z > keep) continue;
            float3 ctr = c + .15 + (SpHash3(c * 2.3 + 5.1) * .5 + .5) * .7;
            float rad = .07 + pow(hh.x, 2.5) * .5;                  // mostly small, a few big
            float d = length(g - ctr) / rad;
            float age = .35 + hh.y * .65;                            // old craters are shallow and soft
            if (d < 2.2) h += SpCraterProfile(lerp(d, d * .8 + .2, 1 - age)) * rad / freq * .3 * age;
        }
    }
    return h;
}
#endif
