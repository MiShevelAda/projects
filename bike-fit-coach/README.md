# Bike Fit Coach

Checks your road bike position with your phone camera and talks you through it out loud, so you
can stay on the bike while it works. No trainer needed.

**Open it on your phone:** https://mishevelada.github.io/projects/bike-fit-coach/

## Using it

1. Open the link in Safari on an iPhone, or Chrome on Android.
2. Optional: tap Share, then **Add to Home Screen**. It then opens full screen, like an app.
3. Tap **Start** and allow the camera and the motion sensors.
4. Follow the voice. It asks you to stand the phone sideways on a chair about 3 m from the bike and
   beeps until the phone is level. Then you get on the bike, and it checks the picture and tells you
   how to move the phone if needed. You hold the camera-side pedal at the bottom for 3 seconds,
   then pedal backwards for 20 seconds. At the end it reads out the one change to make first.
5. Change that one thing, then film again. The home screen keeps your past sessions so you can
   compare.

## What it measures

| Angle | Target | Used for |
|---|---|---|
| Knee bend at the bottom of the stroke, pedalling | 30 to 40 | Saddle height |
| Knee bend at the bottom, held still | 25 to 35 | Cross-check of the above |
| Back angle, from horizontal | 40 to 50 | Reach and bar height |
| Elbow bend | 15 to 30 | Reach and bar height |
| Shoulder angle, torso to upper arm | 80 to 95 | Reach and bar height |
| Hip angle at the top of the stroke | 85 to 110 | For reference only |
| Ankle angle at the bottom | none | For reference only |

Each measurement gets a status (**Good**, **Borderline** or **Needs attention**), the reason for it,
one step to take, and your number from the last session, in the style of the movement evaluations
in Apple's Health app. There is no "Excellent": a phone camera cannot tell the middle of a range
from its edge. Unlike Apple's floor setup, the phone stands at hip height, because a camera looking
up from the floor skews every angle on a bike. No video is recorded unless you switch it on.

Readings within 2.5 degrees of a target count as in range. Saddle advice is about 3 to 4 mm per
degree outside the range, and never more than 15 mm in one go. Bar advice only comes once the
saddle height is right, and only when the back, shoulder and elbow angles agree.

## How exact it is

- A phone camera from the side measures joint angles to within a few degrees.
- The pose model that runs on the phone is lighter than the large model the full
  [AI Bike Fit](https://github.com/guzlz/ai-bike-fit) tool uses. For the most exact numbers, save
  the video from the results screen and run it through that tool.
- Pedalling backwards without resistance is a workaround for not having a trainer. Your foot can
  sit differently than when you really ride, which is why the app also measures you holding still
  and says so when the two readings disagree.
- The setup checks (side-on, in the picture, level) have been tested on simulated riders. They have
  not yet been tested on many real ones.
- Not medical advice. For pain, numbness or a big change, see a professional bike fitter.

## Privacy

It runs entirely on the phone. There is no server, no analytics and no upload. The pose model and
its engine are served from this repository rather than a third-party site, and your results stay
in the browser's own storage.

## Development

- `npm test` runs the measuring maths tests (Node 20 or newer).
- Add `?sim` to the address to walk the whole flow with a made-up rider and no camera.
  `?sim&low` makes the saddle too low.
- To run it locally: `python3 -m http.server`, then open `http://localhost:8000/?sim`. The camera
  only works over HTTPS or on localhost.

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
