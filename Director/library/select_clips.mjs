// Picks the clips most relevant to everyday acting from Director/assets/motions.md, plus every clip the acts already play, into admit-list.json.
import fs from 'node:fs';
const md = fs.readFileSync('Director/assets/motions.md', 'utf8');
const sets = {}; let cur = null;
for (const l of md.split(String.fromCharCode(10)).map((x) => x.trim())) { const m = /^## (.+)$/.exec(l); if (m) cur = m[1].replace(' Animset', ''); else if (cur && l.includes(',')) sets[cur] = l.split(',').map((s) => s.trim()).filter(Boolean); }
const pick = (set, re, n = 999) => (sets[set] ?? []).filter((x) => re.test(x) && !/_RM$/.test(x)).slice(0, n);
const used = new Set();
for (const f of fs.readdirSync('Director/acts')) {
  const t = fs.readFileSync('Director/acts/' + f, 'utf8');
  for (const m of t.matchAll(/"clip"\s*:\s*"([^"]+)"/g)) used.add(m[1]);
  for (const m of t.matchAll(/"from"\s*:\s*"([A-Za-z0-9_&]+)@/g)) used.add(m[1]);
}
const turkey = new Set('bite death eat getHit1 getHit2 idle jump prancing roll run runAngry sleep squart swim walk'.split(' '));
const usedHuman = [...used].filter((x) => !turkey.has(x));
const everyday = [
  ...pick('Crowd', /^Idle1/), ...pick('Crowd', /^Idle[2-7]/),
  ...pick('Crowd', /^IdleSit(1|2|4|5|8A|9|9CheckPhone|9LookAround|11|12|12Stretch|13|13Agree|13Explain|13GreetA|13LookLeft|13LookRight|13NoThanks|13ScratchHead|13YawnA|14|14TakeASip|Phone|PhoneAgreeA|PhoneArgueA|PhoneExplain|PhoneListen|PhoneReject|PhoneTextMessage)$/),
  ...pick('Hostage', /^(CalmDown|GoTo|Idle|Kneel(To|Exec)|Scared|Sit|WalkBackwardsScared$|WalkForwardScared$)/),
  ...pick('Injured', /^(GoToKneel|GoToSit|IdleInjured|IdleKneel|IdleSit|SitToIdle|WalkInjured)[A-B]/),
  ...pick('Injured', /^IdleInjuredC|^WalkInjuredC/),
  ...pick('Campfire', /^(Idle(Kneel$|LayDown$|Rest|Sit|Sleep)|IdleKneelToStand|IdleLayDownToIdleSit|IdleSitTo|Kneel(To|Eat)|SitToRest|StandTo|IdleSleepToStand)/),
  ...pick('Basic Locomotion', /^(Turn(90|180)|WalkForwardUnarmed2|WalkBackwardsUnarmed|WalkForward(Left|Right)Unarmed|WalkUTurn|CrouchIdle|IdleLookAroundScratchYawn|Crouch(Forward|Backwards)Unarmed|WalkLeftUnarmed|WalkRightUnarmed|RunForward2Unarmed|RunBackwardsUnarmed|LandingMediumUnarmed)/),
  ...pick('Climbing', /^(IdleBreathe$|Falling$|Landing|JumpToApex$)/),
  ...pick('Combat Bare Fists', /^(Stunned|Taunt|GetBackUp|GetHit(Front|Back|Left|Right)Light|DodgeBackwardsCombat$)/),
  ...pick('Crowd', /^Cheer([1-6])$/), ...pick('Crowd', /^Walk([1-6]|9TakeASip|10CheckTime)$/),
];
const clips = [...new Set([...usedHuman, ...everyday])].slice(0, Math.max(200, usedHuman.length));
fs.writeFileSync('Director/library/admit-list.json', JSON.stringify({ about: 'The clips most relevant to everyday acting, plus every human clip the acts play. Made by select_clips.mjs.', clips }, null, 1));
console.log(usedHuman.length, 'in use;', everyday.length, 'everyday;', clips.length, 'chosen');
console.log(clips.slice(-20).join(' '));
const all = new Set(Object.values(sets).flat()); console.log('not in motions.md:', clips.filter((x) => !all.has(x)).join(' '));
