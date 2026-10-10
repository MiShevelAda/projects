# Bike Fit Coach

Checks your road bike position with your phone camera and talks you through it out loud, so you
can stay on the bike while it works. No trainer needed.

**Open it on your phone:** https://mishevelada.github.io/projects/bike-fit-coach/

## Using it

1. Open the link in Safari on an iPhone, or Chrome on Android.
2. Optional: tap Share, then **Add to Home Screen**. It then opens full screen, like an app, and in
   Safari it also keeps your past sessions safe: Safari can delete a page's saved data after 7 days
   without a visit.
3. Answer the one question above Start: **Do you get pain or numbness when you ride?** If you
   tap Yes, the results start by telling you to see a professional bike fitter, because for you
   this check is only a starting point. The answer is not saved anywhere, and it does not change
   the advice.
4. Tap **Start** and allow the camera and the motion sensors (an iPhone asks twice).
5. Follow the voice. It asks you to stand the phone sideways on something 60 to 80 cm high (a chair
   with a box on it works), about 3 m from the bike, and beeps until the phone is level. Then you get
   on the bike, and it checks the picture and tells you how to move the phone if needed. You hold
   the camera-side pedal at the bottom for 3 seconds, then pedal backwards for 20 seconds. At the
   end it reads out the one change to make first.
6. Change that one thing. On the results screen, tap **I made this change** and say how many
   millimetres the saddle moved (tip: mark the seat post with tape first). The home screen then
   shows a **Film again** card at the top. Film again, and after a saddle change the results open
   with a before and after line, for example "Knee bend 43° before, 40° now. A 10 mm raise should change it by about 3°."
   The home screen keeps your past sessions so you can compare.

If a step does not work, the voice tells you what to try, and every step has a way out: the still
reading is skipped after 3 tries, and if it cannot see you pedalling it gives you what it has.

## What it measures

| Angle | Target | Used for |
|---|---|---|
| Knee bend at the bottom, pedalling backwards | 30 to 40 | Saddle height |
| Knee bend at the bottom, held still | 25 to 35 | Cross-check of the above |
| Back angle, from horizontal | 40 to 50 | Reach and bar height |
| Elbow bend | 15 to 30 | Reach and bar height |
| Shoulder angle, torso to upper arm | 80 to 95 | Reach and bar height |
| Hip angle at the bottom of the stroke | 85 to 110 | For reference only |

The results come in two areas you can act on, in the style of the movement evaluations in Apple's
Health app: each area gets one status (**Good**, **Borderline** or **Needs attention**), the reason
for it and one step. The angles behind each area are listed under it as detail, with their target
and whether they changed since the last session, but no status or step of their own.

- **Saddle height**, from the two knee readings. Its step is the saddle change, if there is one.
- **Reach and bar height**, from the back, elbow and shoulder angles together, because AI Bike Fit
  reads them as one thing with one cause. When the saddle needs changing first, this area reads
  **After the saddle**, because moving the saddle changes your reach too. It is **Needs attention**
  only when it has a change of its own (raise the bars). Angles outside their targets without that
  change read **Borderline** with nothing to change: a design choice, since a bars change needs two
  signs to agree.
- **More numbers**, folded away: the hip angle, for reference only.

There is no "Excellent": a phone camera cannot tell the middle of a range from its edge. A change of
less than 3 degrees since last time reads as "About the same as last time", because one reading can
be off by 2 to 3 degrees. Unlike Apple's floor setup, the phone stands at hip height, because a
camera looking up from the floor skews every angle on a bike. No video is kept unless you switch it
on.

Readings within 2.5 degrees of a target count as in range, and the app says so in those words
rather than calling them "inside the target". Saddle advice uses a rough rule of thumb from AI Bike
Fit, not a study: about 3 to 4 mm per degree outside the range, never more than 15 mm in one go.

The saddle verdict comes from the pedalling reading. The held-still reading can only hold a change
back: when the two are out of range in opposite directions, the app asks you to film again instead.
On its own, the held-still reading never gives a number of millimetres, because a study of 30
cyclists found it differs from pedalling by about 8 degrees on average
([Bini and Hume, 2016](https://openrepository.aut.ac.nz/items/9fba7a89-48d4-43cd-8515-9925d3aefd63)).
It is also set aside when the crank was more than about 10 degrees from straight down. The
pedalling reading only counts strokes the phone saw well enough, at least 12 frames per turn of the
pedals; if you pedal too fast for the phone, it asks you to slow down.

Bar advice only comes once the saddle height is right, and only when two of three signs agree.

## Checking a change you made

One change of the saddle moves the knee reading only a little: at about 3 to 4 mm per degree (AI
Bike Fit's rule of thumb), a 10 mm raise takes off only about 2.5 to 3.3 degrees, which is inside
the 2 to 3 degree error of one reading. So after you tap **I made this change**, the next session
says what the change should have done and whether the new reading fits:

- **It fits** (within 3 degrees of what the change should do, either side): if you are in range
  now, leave it; if not, the next step follows as usual.
- **It moved the other way**, **less than the change should do** or **more than it should do**: the
  app suggests no new change and asks you to film once more. Check the saddle really moved first.
  The change stays waiting, so that next film is compared with the reading from before the change.
  This way a second change is not piled on a first one that has not shown up yet.
- **The second film still does not fit**: the app goes by what that film shows and gives the next
  step as usual. It asks for "once more" only once, so you are never stuck filming again and again.
  This is our own design choice, not a published rule.

Only a pedalling reading is compared with a pedalling reading. A session with no pedalling reading
does not use up the check; the change waits for the next one. The app stores only which way the
saddle moved, how many millimetres and when. There is no set time to wait before filming again and
no "ride it a few times first": we found no source for either, and Apple has not published a
retest interval that we could find.

One difference from AI Bike Fit. Its front-end rule counts a closed shoulder (under 80) and bent
elbows (over 30) as signs of a long, low front end. Both usually mean the bars are close, not far,
so this app counts only a low back (under 40), a shoulder over 95 and locked elbows (under 8). Two
of the three must agree before it suggests raising the bars.

## How exact it is

- In one study of 26 cyclists filmed from the side, this kind of phone pose model was typically off
  by 3 to 9 degrees against lab markers, and worst at the foot and ankle
  ([Sport Sciences for Health, 2023](https://link.springer.com/article/10.1007/s11332-023-01075-7)).
  That is why readings within 2.5 degrees of a target count as in range, and why there is no ankle
  number.
- The pose model that runs on the phone is lighter than the large model the full
  [AI Bike Fit](https://github.com/guzlz/ai-bike-fit) tool uses. For the most exact numbers, save
  the video from the results screen and run it through that tool.
- Pedalling backwards without resistance is a workaround for not having a trainer. Your foot can
  sit differently than when you really ride, which is why the app also measures you holding still
  and says so when the two readings point different ways.
- The setup checks (side-on, in the picture, level) have been tested on simulated riders. They have
  not yet been tested on many real ones.
- Not medical advice. For pain, numbness or a big change, see a professional bike fitter.

## Not included, and why

- **Apple's balance, strength and VO2 max tests.** No source we found links them to a saddle or bar
  change, and a web app cannot read Apple Health.
- **A combined fit score.** Nothing to base the weights on.
- **A flexibility check.** Not yet, see the notes in this round's review.
- **Where it hurts.** The pain or numbness question is yes or no, and the answer only sends you to
  a fitter. It is not turned into a saddle change, because the evidence linking saddle height to
  knee injury is limited (a systematic review, Bini and Priego-Quesada, 2022, per its abstract:
  [record](https://producciocientifica.uv.es/documentos/61a1f531bd93e62bb6018075)).

## Privacy

It runs entirely on the phone. No server of ours, no analytics and no upload: GitHub only serves the
app's files. The pose model and its engine are served from this repository rather than a
third-party site, and your results stay in the browser's own storage. Your answer to the pain or
numbness question is never stored: not in the browser, not in your past sessions and not in Copy
results.

## Development

- `npm test` runs the measuring maths tests and the offline-cache checks (Node 20 or newer).
- Add `?sim` to the address to walk the whole flow with a made-up rider and no camera.
  `?sim&low` makes the saddle too low.
- To run it locally: `python3 -m http.server`, then open `http://localhost:8000/?sim`. The camera
  only works over HTTPS or on localhost.
- When anything in `vendor/` or `models/` changes, change the cache name in `sw.js` (the test says
  what it must contain), or phones keep the old engine.

| File | What it is |
|---|---|
| `index.html` | The three screens: home, the camera view, results |
| `app.js` | Camera, voice, tilt sensor and the step-by-step flow |
| `fit.js` | The measuring maths, with no browser code, so it can be tested |
| `sw.js` | Offline support once the app has loaded once |
| `test/` | Tests, and the made-up rider they use |

## Credits

The target ranges and saddle rules follow [AI Bike Fit](https://github.com/guzlz/ai-bike-fit) by
guzlz and the research it cites. No code from it is used here. Pose estimation is Google's
MediaPipe; see [NOTICE.md](NOTICE.md).
