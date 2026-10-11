# Bike Fit Coach

Checks your road bike position with your phone camera and talks you through it out loud, so you
can stay on the bike while it works. The bike can be on a trainer or rollers, leaning on a wall, or
held by a friend. It is for road bikes with drop handlebars: it cannot check a time trial or
triathlon position on aero bars.

**Open it on your phone:** https://mishevelada.github.io/projects/bike-fit-coach/

**First time?** Tap **Start a Check**. After four short questions, **Getting Ready** has **How to
Set Up**, a short drawn guide, spoken and captioned: how the bike stays up, where the phone goes, and
what happens after Start. The next screen has **Tap to Hear Me**, one recorded line in the coach's
voice. If you hear nothing, turn the volume up and switch off silent mode.

## Using it

The app has three tabs, like Apple's Health app: **Check** (start a check; your latest result),
**Progress** (each area over time on its target band) and **Learn** (how a check works, where the
phone goes, the three setups with a drawn demo of each, privacy). The tabs follow the phone's light
or dark mode; the check itself (Setup, Getting Ready and the camera view) is always dark, like
Apple's own assessment flow.

Simple on purpose (Alex's ruling of 2026-10-10, "customer experience and simplicity first"): every
screen has one title, at most one short line under it (about 12 words), one primary button at the
bottom where the thumb is, and rows of a handful of words. Everything else is one tap away (a row
that opens, or **Details**), and the voice and the drawings carry the instructions, in short
sentences. The full reason and the numbers for a fitter are in **Say It Again** and **Copy Results**.
`test/simple.test.mjs` checks the screens and the voice against this.

1. Open the link in Safari on an iPhone, or Chrome on Android.
2. The first time, in Safari, the Check tab starts with **Keep Your Results**: "Add it to your Home
   Screen, so Safari keeps your results." **Show Me How** opens three short steps over the page with
   an arrow at Safari's own buttons: **Tap Share** below (on iOS 26 it may be under the three dots,
   or at the top), **Tap Add to Home Screen**, **Tap Add**; then open it from there. It then opens full
   screen, like an app, and in Safari it also keeps your past sessions safe: Safari can delete a
   page's saved data after 7 days without a visit. **Start a Check** is the one primary button on
   the tab, and goes straight to a check without it. Where iOS 26 puts Share is from
   reports of its Safari layouts ([Glide community](https://community.glideapps.com/t/ios-26-add-to-home-screen-workflow-change/84599),
   [iThinkDifferent](https://www.ithinkdiff.com/add-web-app-bookmark-iphone-home-screen-ios-26/)), not
   checked on Alex's phone yet. A link opened inside another app (Instagram, Facebook, LinkedIn and
   the like) opens in that app's own browser, which may not allow the camera or keep your results:
   there the Check tab says **Open This in Safari**, with **Copy the Link**.
3. Tap **Start a Check** (or **Check It Now** when a change you made is waiting to be checked). A new
   check asks three questions, one a screen, as Apple's "Choose How to Measure" does: each screen
   has one title (the question), one short line, the answers as cards, and **Next** at the bottom.
   Back and close are the glass circles at the top.
   - **How Will Your Bike Stay Up?** **On a trainer or rollers**, **Leaning on a wall** or **A friend
     holds it**, each with one short line ("Pedal backwards, 20 seconds"). The phone remembers your
     answer for next time, and the steps change to match (see
     "Three ways to hold the bike" below). If you tap Next without answering, the question says so
     in red, and the voice says "First, tell me how your bike will stay up."
   - **Where Will the Screen Face?** **Away from me** (the back camera; the voice tells you
     everything), first and chosen, or **Towards me** (the front camera, so you can see the screen
     from the bike). The two drawings differ: the back of the phone with its lens and the voice's
     sound waves, or a lit screen with a tick. Away from me
     is marked Default and is chosen until you change it: the front camera is still being tested on
     a real iPhone (Alex's ruling of 2026-10-10). The answer picks the camera (`facingMode` `user`
     for Towards me, `environment` for Away from me), is remembered on this phone and is stored with
     each session, together with the camera the browser really gave. **Which Should I Pick?** opens
     the note: either way the phone stands sideways on the chair, about 3 m from the pedals, and
     Towards me is still being tested on a real iPhone. What each answer shows is under "The camera
     view" below.
   - **Pain or Numbness That Keeps Coming Back When You Ride?** ("Your answer is never saved.")
     Nothing is chosen at first, and **Next** waits for **No** or **Yes**: tapped before an answer,
     it says "First, tap No or Yes." on the screen and aloud, so a rider with pain cannot skip the
     question unseen. It is asked every time and the answer is never saved (Learn says so too). A
     Yes adds a note first in the results (see "Pain or numbness" below); it does not change the
     advice. A check started from the results (**I Moved It <n> mm, Check Now**, Check Again) keeps this visit's answer.
   - Round 4 (the pro-standard SPEC, Phase 0). **Has a Bike Fitter Set This Bike Up for You?**
     ("Asked once. If yes, I only report what I see."), between the screen and the pain question,
     only the first time on this phone (also for a rider who has checked before), said aloud, and
     remembered. **Yes**: the results report what the camera sees ("Your Saddle Looks Low", "A
     fitter set up this bike, so I only report.") and give no millimetres and no change card, unless
     he says Yes to the pain question; then the step, at most 5 mm, and "Tell your bike fitter too."
     There is no way to change the answer on the page yet.
   - **Better, the Same, or Worse?** ("Since you raised the saddle 5 mm."), after the pain question,
     when the newest change he saved is at least 30 minutes old, his last answer (if any) too, and he
     has not said it feels better or the same (a design choice: the film straight after a change has
     not been ridden, and one answer per ride). A change saved on the Check tab counts from the check
     that suggested it, since he usually made and rode it after closing the results. Said aloud:
     "You rode it. Better, the same, or worse?" **Next** waits for an answer; **Not Ridden Yet** goes
     on without one. The answer is stored with the change. The second **Worse** on the same change
     opens **Put the Saddle Back** ("To your tape mark. It felt worse twice."; with a Yes to pain,
     "then see a bike fitter"), and the change is recorded as undone. See "One change per ride" below.
4. **Getting Ready** shows the How to Set Up guide (`assets/setup-guide.mp4`, from the live app's
   sound and guide fix: a narrated, captioned drawn guide of this check's own steps, 73 s; tap
   **Play** and it plays in place with its narration) and five rows: a chair and a 20 cm box, your road
   bike, cycling shoes and padded shorts, the warm-up ("Ride easily for 5 minutes first" on a trainer,
   "A 10-minute ride first, if you can" against a wall or with a friend), 3 m of space with light on
   you, the volume up and silent mode off. Arriving from the questions, the voice says the warm-up
   ("Before I film, ride easily for five minutes. I will wait.", or "If you can, go for a ten-minute
   ride first.") and, on the first check on this phone, "Are your cycling shoes and padded shorts on?
   They change how high you sit." On a retest (a change waits to be checked) the kit row reads "Same
   shoes and shorts as last time", the voice asks it, **Start** means yes, and **Different Shoes or
   Shorts** under it means no: that film is kept but not compared, and the change keeps waiting. The steps for your
   setup are folded into **Setup Steps**, one tap away, the first time too: the voice says each of
   them during the check. The older Camera app clip (`assets/how-to.mp4`: a hidden helper, a 5 s
   hold, sending the file) is never shown here; it belongs to Learn's "Another Way: Film a Clip".
5. The first time in each visit, Getting Ready's button says **Next** and opens **Allow Camera and
   Motion**: "Your iPhone will ask twice. Tap Allow both times.", then four short rows: the camera
   is to see how you sit on the bike, motion is to beep when the phone is level, the iPhone may say
   mishevelada.github.io (that is this app), and nothing leaves this phone. **Tap to Hear Me** plays
   one recorded line in the coach's voice (see "The voice") and then shows "No sound? Turn the volume up and switch off silent
   mode." (the only two settings the app mentions). Tap **Start**; after that, Getting Ready's
   button is Start until the app is opened again.
6. Follow the voice. It first says which setup you chose ("You chose: bike leaning on a wall. If
   that is wrong, tap Stop now."), and the camera view shows it under the step (with the screen
   away). On a trainer it asks you to check the bike is level. Then **Stand Your iPhone Sideways on
   the Chair** ("On a box, 4 big steps from the pedals."), with a drawing of the spot, while the voice
   says it in short sentences: "Stand the phone sideways and upright on a box on a chair. Turn the
   chair back away from the bike. Keep the lens level with the top of the tyres. Put the phone about
   3 metres away, opposite the pedals and facing them." With the screen towards you it ends "...,
   with the screen facing the bike." The rest of the detail (the lens 60 to 80 cm up, the front edge
   of the box) is in the drawing and in Learn's **Every Detail**. It beeps, once it has finished speaking, until the phone is level, and the
   screen shows how many degrees it is off and a level bubble; no line ever says which way to tilt
   (turning the phone round flips that). With the screen away, you are at the phone and can see
   it, so before the beeps the voice says "Both wheels inside the frame, pedals in the middle." and
   the camera view draws a big outline of the bike, with the pedals on a line down the middle, for
   5 seconds (a design choice); the outline stays behind the level numbers. On the first check on
   this phone (and once for a rider whose checks are older than this tip), once it is level: "Tape
   the floor by the chair legs and the back wheel. Next time, line them up.", shown as a tip on the camera
   view (screen away) until you are on the bike; the first "I cannot see you on the bike" waits 40
   seconds instead of 20 (a design choice), for the tape. From the second check set up the same
   way (trainer, wall or friend) on this phone, the run is shorter, under 60 spoken words before "Hold it": "You chose: ..." and "If that is wrong,
   tap Stop now." stay, then "Set the phone up as last time, on your tape marks." (or "opposite the
   pedals" before any tape, and the way the screen faces when it is not the same as last time),
   "Level.", and one line to get on that keeps the safety part: "Get on as before, with the front
   brake gently on." against a wall, "Get on as before. On rollers, hold on to the wall." on a
   trainer, "Friend: hold the bike, standing up straight. Rider: get on." with a friend. Then you get on the bike, and it checks the picture and
   tells you how to move the phone if needed. You hold the camera-side pedal at its lowest point for 3 seconds, then pedal:
   forwards for 30 seconds on a trainer or rollers, backwards for 20 seconds against a wall or with
   a friend holding the bike. At the end, when there is something to change, it says "Leave the
   phone where it is." and then the one change to make first, in a sentence or two.
   **Say It Again** gives the longer version, with the reasons and the other angles.
7. The results open as a sheet over the tabs (the glass close button at the top right closes them;
   with the screen towards you, the result shows first on the camera view and **See What to Do**
   opens them),
   in one order: the status of the area the headline is about, the headline (the one change, in
   Title Case), one short line ("Your knee bends too much with the pedal at its lowest point."); then
   **How to Do It**, one tap away, six short steps in the order your hands do them; then **I Made
   This Change**: "How far did it move?", a millimetre stepper (type the number, or tap minus and
   plus, from 1 to 50) that starts at the low end of the suggestion. The one primary button sits in
   a bar at the bottom of the screen and says what it saves: **I Moved It 9 mm, Check Now**, its
   number following the stepper as you change it (VoiceOver: "I moved the saddle 9 millimetres. Save
   that and check now."; for the handlebars, **I Raised the Bars, Check Now**). It saves exactly
   that and starts the next check straight away, with "The phone is already in place." under it
   (see "Checking it straight away" below), and **Check Again** as a quiet text button; with no
   change waiting, the bar holds **Check Again** alone. A bare "Check It Now" used to save the
   stepper's number as a change made, one tap after the result, before the rider had moved anything.
   Once you set the number, the voice says "Check it now. The phone is already in
   place." **Save, Check Later** saves it without starting; **Not Yet** first asks **When Will You
   Move It?** (**Tonight**, **Weekend**,
   **Pick a Day**, or **Not Now**; see "Coming back" below), saves nothing and leaves the question for the Check tab, which asks it until you answer (**Your
   Last Change**), and asks once more before it films. Nothing is saved until you tap one. For the
   handlebars there is no number. Under the card, the area in focus has its reading on a range bar
   (the target shaded, a dot at your reading), with its reason, its step and every reading behind
   **Details**, and an area that waits for the saddle is one line, "Reach and Bars: checked after the
   saddle", that opens. The sheet ends with "Not medical advice. For pain that keeps coming back, see
   a bike fitter."; with a Yes to the pain question it starts with one line, "Pain that keeps coming
   back: see a doctor or physio, and a bike fitter.", and **More** opens the full note. The Check tab
   then shows **Check Your Change**: "You raised the saddle 10 mm after your Oct 3 check." Check again, and the results
   open with a before and after line (see "Checking a change you made"); when the change moved your
   knee the right way into range, the headline is **Your Saddle Change Worked**, with the before and
   after drawn on the target band, a chime, and the voice: "That worked. Your knee is in range now.
   Ride it, and check again after a few rides." (never "done": one angle with a few degrees of error
   cannot carry it). Its status, and the big word on the 3 m screen, are the saddle card's own: Good
   only when the saddle is Good, else Fair with the check mark (SPEC 4.3). A first check with nothing to change ends with "Check again whenever you change
   the saddle, stem, shoes or cleats." Neither is said while the held-still reading asks for
   one more film ("Film once more to be sure."): then the phone stays where it is for that film. Check the same way as before (trainer, wall or friend): a check
   set up another way is not compared, and the results say so.
8. **Progress** shows Saddle Height (the pedalling knee) or Reach and Bars (back and elbow; the shoulder has no target to chart)
   for the last checks filmed the same way as the newest one, on the target band, with a marker for
   each change you made, how the newest compares with the first one shown, and "Phone cameras are
   only accurate to a few degrees, so small differences mean little." Under it, **Changes You
   Made** (with what the next check filmed the same way showed, or "Not checked yet") and **All
   Checks**.

If a step does not work, the voice tells you what to try, and every step has a way out, which the
voice names when a step is not working: Skip for the level check; Skip, and then carrying on without
it, after 3 tries of the same picture check in one session (even if you move the phone in between);
Stop when it cannot see you. No sentence is said more than twice in a session: after that, the next
line is a different one or the way out. The exception is getting back on after you moved the phone,
or after a break while holding still (see "Two people in the picture"): those steps start again each
time, so their lines do too ("I cannot see you on the bike yet", the turn-the-pedals question below,
the picture check and holding still), at most twice each time. A limit for the whole session left
the third time on the bike in silence. If you tap Stop, the Check tab opens with "Stopped. Nothing
was saved.", and "Your last change is still waiting to be checked." when one is.

## Three ways to hold the bike

| | On a trainer or rollers | Leaning on a wall | A friend holds it |
|---|---|---|---|
| Before you start | Level the bike: the middle of the front wheel as high off the floor as the middle of the back wheel. A trainer that holds the back wheel lifts it, so if the front sits lower, put a riser block or a thick book under the front wheel. On rollers, have a wall on the far side to hold on to. | The wall on the far side, away from the phone. The bike leans only a little, bars straight. | Your friend stands up straight on the far side, away from the phone, next to the saddle, and holds the bike still. |
| Getting on | Your normal riding position, hands on top of the brake levers. | The same, with the hand nearest the phone on top of the brake lever. | The voice speaks to each of you in turn: "Friend: ..." then "Rider: ...". Then the rider turns the pedals twice, slowly, so the app knows who is riding (see "Two people in the picture"). |
| Holding still | As on the others. On rollers, hold the wall with the hand away from the phone. | Squeeze the front brake gently to keep the bike still. | Your friend keeps the bike upright. |
| Pedalling | **Forwards** for 30 seconds, "at the effort of a long ride, where you could still talk" (round 4; asked for "Slower", shift to a harder gear to keep that effort). On rollers, start pedalling with your hand on the wall and let go once you are rolling steadily. At the end, before "Stop": "On rollers, put your hand back on the wall, then stop pedalling." | Backwards for 20 seconds. | Backwards for 20 seconds. At the end: "Friend, keep holding the bike until the rider is off." |

Why it is done this way:

- **Forwards on a trainer.** Pedalling knee targets come from riders pedalling forwards under load: the study behind the 8 degree static-to-dynamic gap filmed 30 cyclists on their own
  bikes on a stationary trainer
  ([Bini and Hume, 2016](https://openrepository.aut.ac.nz/items/9fba7a89-48d4-43cd-8515-9925d3aefd63)),
  and AI Bike Fit's filming guide says "Trainer is ideal ... Pedal steady 20-30 s at an easy effort
  and your normal cadence". So on a trainer the forwards reading is the main one, and the held-still
  reading stays as the cross-check. The 30 seconds is the guide's upper end.
- **Backwards on the floor.** Pedalling forwards would drive the back wheel and move the bike;
  backwards, the freewheel turns and the bike stays put. Pedalling backwards is safe in every setup.
- **A wrong tap is never unsafe.** If you chose the trainer but pedal backwards, the voice says "You
  are pedalling backwards. On a trainer, pedal forwards. If the bike is standing on the floor, keep
  pedalling backwards.", never a bare "pedal forwards". With a wall or a friend, pedalling forwards
  gets "Pedal backwards, please, so the bike stays still." Either line is said twice at most; then
  it carries on and measures the way you pedal. When the pedals turned the other way from the setup
  you chose, the results ask **How was the bike held?** with the three answers; a tap files the
  session under that setup (and remembers it), so it is compared with the right sessions. With no
  tap, nothing changes. It needs to see a whole turn before it says anything, and at least 5 frames
  of each turn. A jump of more than a quarter turn from one frame to the next is left out: that is
  the pose model mixing up your near and far legs for a frame (AI Bike Fit's filming guide warns
  when it "can't tell your near leg from your far leg"), and each such jump used to count as about
  one turn the wrong way. Design choices; on the made-up rider, with up to 1 frame in 5 mixed up, it
  never read the wrong way at 5 or more frames a turn. Not solved: at under about 2 frames a turn
  (a slow phone and fast pedalling) a forwards turn can look like a slow backwards one, as a wagon
  wheel does on film.
- **Level on the trainer.** The back angle is measured from horizontal, so a bike tipped nose down
  makes it read low by as much as the bike tips. Riser blocks are sold to lift the front wheel to the
  trainer's height ([Saris](https://www.bestbuy.com/product/saris-bike-trainer-leveling-block-bike-trainer-front-wheel-block-black/J7CJGKX3J4/sku/10108887),
  [Minoura](https://www.sigmasport.co.uk/item/Minoura/Riser-G-Block/GMVK)). A direct-drive trainer
  can sit level, or even high at the front with wide tyres
  ([one owner's note](https://www.printables.com/model/1503469-wahoo-fitness-kickr-core-2-riser-feet)),
  which is why the check is by eye, axle against axle, and not a fixed "always use a block".
- **Lean only a little.** On the made-up rider, a bike leaning 10 degrees changes the knee and back
  angles by under 1 degree, and 20 degrees by about 2: the picture of a tilted bike is squashed top
  to bottom. That is geometry on a made-up rider, not a measurement on a real one.
- **Far side, out of view.** The camera-side leg and arm are the ones measured, and AI Bike Fit's
  filming guide asks for nothing blocking them. The wall and the friend go on the other side.
- **Where the friend holds the bike** is up to them. We found no source for where a helper should
  hold it, so the app only asks them to stand up straight next to the saddle (a design choice): a
  friend who crouches with bent knees can look like a rider to the camera.
- **Rollers** are filmed like a trainer, but you cannot balance on them holding still, hence the
  wall to hold. The roller guides say to start pedalling with a hand on the wall, let go once you
  are rolling, and put the hand back on the wall to stop
  ([British Cycling](https://www.britishcycling.org.uk/knowledge/article/izn20141126-How-to-ride-the-rollers-0),
  [Train Right](https://trainright.com/?p=8165)), so the voice says it in that order. We found no
  source on how exact a phone fit is on rollers, which move more than a trainer
  ([a forum view](https://www.cyclechat.net/threads/diy-bike-fit-and-analysis.185928/)).

Every session stores how the bike was held. The history shows it (Trainer, Wall or Friend), the
results say it ("Bike on a trainer or rollers, pedalling forwards."), and comparisons only use
sessions held the same way: the "last time" next to each angle, the before and after a change, and
the Check tab's "Check Your Change" card, which says how to set the bike up. Where the only earlier
reading was filmed another way, it says "Not compared with 9 Oct: the bike was leaning on a wall
then." instead of a difference. Sessions saved before the question existed count as their own kind.

## Two people in the picture

With a friend holding the bike, the phone may see two people. The pose model is asked for up to two,
and the app picks the rider:

- **Who turns the pedals.** Sitting like a rider is not enough on its own: a friend who crouches
  with bent knees and leans in can sit like one too, and if they are in view first, or braced at
  the rider's hip, posture cannot tell the two apart. So with a friend in the setup, and in the
  other setups whenever a second person is seen while the rider gets on, the voice says "Rider: turn
  the pedals slowly backwards, two turns, then stop." (forwards on a trainer). The person whose
  ankle goes round is the rider; up to two people who sit like a rider are followed while it
  listens. If nobody's ankle goes round within 15 seconds, or someone sits down after the question,
  it asks once more. After that it takes a lone rider only with nobody else in the picture, and
  otherwise says "I cannot tell who is on the bike. Tap Stop on the screen, then start again."
  Each time you get back on after moving the phone, it asks again ("Rider: once more, turn the
  pedals ..."), with the same once-more rule: the question belongs to getting on, not to the session.
  Nobody is asked to move before the rider is known.
- **Riding posture.** The back leans forward (from just over 20 to 72 degrees from horizontal), the
  knee is bent, and the thigh reaches forward of straight down. At the bottom of the stroke, where
  the hip is most open, AI Bike Fit's ranges (back 40 to 50, hip 85 to 110) put the thigh 20 to 55
  degrees forward; someone standing has it about straight down. The app asks for 15 (a design
  choice).
- **Followed from frame to frame.** Once found, the rider is the person in riding posture whose hips
  and shoulders are within half a torso length of where they were (a design choice: the hips sit on
  the saddle and the hands on the bars). If two people are there, the one who sits like a rider wins,
  as before, unless the other is clearly nearer the rider's last pose; otherwise the one whose 12
  main body points are nearer the rider's last ones wins, when the other is at least 1.5 times as
  far (a design choice). On the made-up people a braced helper was always at least 4.8 times as far.
- **Never a doubtful frame.** If two people could each be the rider, nobody is measured in that
  frame. A lone person at your spot is taken only if they are close to your last pose (within a
  quarter of a torso length on average, a design choice: on the made-up people the rider stayed
  within 0.21 of one between any two pedal positions, and within 0.245 sitting 2 to 3.5 cm off where
  he sat; of 5058 made-up helper shapes at the rider's hip, the nearest, leaning in with the hand
  nearest the phone on top of the brake lever where the rider's hand is, came to 0.28). The pose
  model can miss you in the very frame a friend comes to your hip; the friend used to be taken then,
  and followed for the rest of the session. An earlier gate of a third of a torso length still let
  that friend through, because the helpers tried for it never had a hand where yours is. A friend
  with both hands on the hoods comes closer still (0.235 to 0.265), as close as you come to yourself,
  but never sits like a rider; so a lone person who does not sit like a rider must be within a fifth
  of a torso length (a design choice: your own pose with the thigh glitched straight was 0.17). If someone
  else was at your hip in the last 2 seconds (a design choice), such a frame counts as one where two
  people could each be the rider. After you were out of view, you are found again the same way, near
  where you were; someone who only looks like a rider is never taken because they are the only one
  left. With a wall or a trainer and nobody else seen yet, you are found anywhere in the picture
  (you may get back on further along), but not in the first 3 seconds after the app last saw you
  (the same design choice as below): a model that missed you for a second or two used to hand you
  over to someone who came to your hip meanwhile sitting like a rider, and in that time you cannot
  have got off and back on. Not solved, with a wall or a trainer: after those 3 seconds anyone
  sitting like a rider is taken as you, so a model that misses you for longer, or a friend never
  seen before who crouches at the bike while you are away, is measured as you; and a friend who
  crouches at the bike before you get on is taken as you if you are not on the bike about 7 seconds
  after the instruction ends (made-up sessions `setup=trainer&helper=braced&late=12` and
  `setup=wall&helper=braced&back=30`). The model can also list the same person twice (it did in
  testing, about 10 pixels apart), and the app counts that as one.
- **After you moved the phone, found afresh.** When a picture check asks you to get off and move the
  phone, where you were in the picture means nothing any more: a phone turned or slid along, without
  being tilted, does not set off the level check, and "near where you were" would never find you
  again. So once you have been out of sight for 3 seconds after a correction (a design choice:
  three times the 1 second after which the app stops following someone), it goes back to getting on
  the bike, silently: you were already told to get back on, and the correction stays on the screen.
  With a friend, or anyone else seen, it then asks you to turn the pedals again. Skip is still on the
  screen meanwhile, for that picture check.
- **After a break while holding still, found afresh too.** With a friend, or anyone else seen, a
  rider who gets back on a little further along (the friend takes a new grip, the bike rolls) is not
  near where he was, and used to be waited for for ever. So once you have been out of sight for 3
  seconds and, for a second more (a design choice), someone new sits like a rider somewhere else in
  the picture, it goes back to getting on the bike, silently, and asks you to turn the pedals again;
  then it checks the picture and you hold still once more. "Someone new" means more people sitting
  like a rider than while you were followed there, so a friend already crouching at the bike does
  not count. Nothing from the interrupted step is used, so it does not count towards "less exact".
  The one sitting down can also be a friend who crouches at the bike while you rest. So meanwhile
  you are still found back where you were, as while holding still, and the two questions lead to "I
  cannot tell who is on the bike" only if someone sat down after one of them; otherwise it waits for
  you with the lines for nobody on the bike ("I cannot see you on the bike yet ..."), and if you sit
  down somewhere else after both, you are asked once more. Before, a friend crouching only during
  your break used both questions while you were off the bike, and the session stopped with "Tap Stop
  on the screen", or measured the friend.
- **The voice says so.** Once the rider is known and someone else is clearly in view for more than
  about 2 seconds, it says "Friend: stay on the far side, next to the saddle, standing up
  straight.", the same place Getting Ready and the getting-on line name; seen again later (after the
  phone is levelled again, say), "Friend, thanks, stay there." rather than the same line. It used to
  send the friend "behind the rider ... out of the camera's view", against the other two. With a wall or a trainer: "I can see another person. If they
  are not holding the bike, ask them to step out of view.", so nobody lets go of a bike with a rider
  on it. While they still stop the measuring, the next line comes ("Friend: stand up straight, with
  your knees straight.", then "If I still cannot tell you apart, tap Stop."), at most every 15
  seconds, each at most twice. When they move, once: "Thanks, that is better." Lines for the friend
  start with "Friend", and there is 1.5 seconds of quiet between a line for the friend and one for
  the rider (a design choice).
- **Less exact only when it cost something.** The results note "someone else in the picture made
  some moments unclear" only when a frame could not be measured because two people could each be
  the rider, or when the rider was lost for over a second while someone else was in view, during the
  holding still or the pedalling. Someone merely in view next to a known rider changes nothing.

Asking the model for two people costs speed: in the headless test browser one frame took about twice
as long when only one person was in view (the full app run showed no clear drop there, at about one
frame a second). On a phone this could bring the "Slower, please" line sooner. Not measured on an
iPhone yet. Telling the rider from a helper has been tested on made-up people only; whether a real
helper looks to the pose model the way the made-up one does is not known yet.

## Road bikes only

The targets are for road bikes. A rider on time trial or triathlon aero bars, with the back 20
degrees or less from horizontal, is never measured as a road rider (AI Bike Fit's rule 5: do not
grade a time trial setup against road numbers). If the phone sees exactly one person sitting that
low for 3 seconds, and no road rider, it says once: "You look very low, like on aero bars. This app
checks road bikes only, so it cannot check this position. If this is a road bike, sit up with your
hands on top of the brake levers. Otherwise, tap Stop." A time trial mode is not built.

## What it measures

| Angle | Target | Used for |
|---|---|---|
| Knee bend with the pedal at its lowest, pedalling (forwards on a trainer, backwards otherwise) | 33 to 43 | Saddle height |
| Knee at its straightest in each pedal turn, pedalling | 30 to 40 | Cross-check of the above, and Copy Results |
| Knee bend with the pedal at its lowest, held still | 25 to 35 | Cross-check of the above |
| Back angle, from horizontal | 40 to 50 | Reach and bar height |
| Elbow bend | 15 to 30 | Reach and bar height |
| Shoulder angle, torso to upper arm (hip, shoulder and elbow points) | none agreed | For reference; a sign for raising the bars above 98 |
| Hip angle with the pedal at its lowest | 85 to 110 | For reference only |

**Where the knee targets come from (round 4).** The pedalling reading is graded on 33 to 43, the
closest published band to what the app reads: Millour, Duc, Puel and Bertucci (2019), 26 cyclists
on their own bikes, 2D video, knee bend at the bottom of the stroke while pedalling. It is not the
same definition (the app's hip point is a pose model's guess, and its bottom is the ankle's lowest
point), and the app's offset from it is not measured yet. 30 to 40, which the app used before, is
the band for the knee at its straightest; the app now measures that too, per turn (a parabola
through the three straightest frames), and when the two readings point opposite ways it asks for
one more film. The definitions are named only in **Copy Results**; the screen and the voice stay
one headline and one change. The shoulder has no status colour: no study gives a band for it with
these landmarks (a 2021 review lists it as "None to date").

The results come in two areas you can act on, in the style of the movement evaluations in Apple's
Health app: each area gets one status (**Good**, **Fair** or **Needs attention**; Fair is Apple's
word for the middle one), the reason for it and one step. There is no overall status on top. The
headline above the areas says the one thing to do and why, in words; the area gives the numbers.
The angles behind each area are listed under it as detail, with their target and how they changed
since the last session that measured them: "Down 12° since Oct 3, now inside the target", "closer to
the target" or "further from the target". "(that check was less exact)" follows a comparison with a session
that had a warning.

- **Saddle height**, from the two knee readings. Its step is the saddle change, if there is one.
  With only the held-still reading it is **Fair** at best, never Good, because that reading is only
  a cross-check (see below).
- **Reach and bar height**, from the back and elbow angles (the shoulder is shown for reference),
  because AI Bike Fit reads them as one thing with one cause. When the saddle needs changing first, this area reads
  **After the saddle**, because moving the saddle changes your reach too. It is **Needs attention**
  only when it has a change of its own (raise the bars). Angles outside their targets without that
  change read **Fair**, "That is fine to ride.", with the step "Fine to ride. I will compare it on
  your next check.": a design choice, since a bars change needs two signs to agree. The Check tab
  says "Nothing to change" when no area has a step.
- **More numbers**, folded away: the hip angle, for reference only.

There is no "Excellent": **Good** already means a reading inside its target by more than the app's
error (below). A change of
less than 3 degrees since last time reads as "About the same as last time". That 3 degrees is our own
design choice for comparing two films taken the same way, not the camera's error: AI Bike Fit's
research notes put one phone reading at roughly 2 to 3 degrees either way, and against lab markers
the study under "How exact it is" found errors of 3 to 9 degrees. Nothing has measured yet how much
two films of the same position differ. Unlike Apple's floor setup, the phone stands on a chair, its
lens about level with the top of the tyres: from the floor the knee reading would survive (under 1
degree off), but the back and arm angles would read 2 to 3 degrees wrong (three separate calculations
by the camera panel, 2026-10-10, on a made-up rider, not measured on a real one). No video is kept
unless you switch it on.

**Good, Fair, Needs attention (round 4).** Let u be the app's error for one check: 3 degrees for
each measure, provisional until a study measures it (`fit.js` `U_KNEE`, `U_BACK`, `U_ELBOW`,
`U_SHOULDER`). **Good** only inside the target by more than u (the knee: 36 to 40). **Fair** within u
of an edge: inside the target, "In range, near the edge. Nothing to change."; just outside, "Close to
the edge. Let me film once more.", with the phone left where it is, and the average of the two films
decides (still within u of the edge on average: nothing to change, "too close to call"). **Needs
attention** past u: one change. The old fixed 2.5 degree widening is gone; it called readings Good
that could be outside the target.

**The saddle step** is the smallest change the app is sure of: the gap from the reading less u to
the target's edge, at 2 mm per degree, then 3 mm (under 4), 5 mm (4 to 8) or 10 mm (over 8), always
"about", and at most 5 mm with a Yes to the pain question. A knee of 46.1 gives 3 mm, 49.5 gives 5
mm, 52 gives 10 mm. It used to be 3 to 4 mm per degree from the target's edge, 8 to 15 mm. The 2 mm
per degree is a rule of thumb not yet measured for you, and Copy Results says so. A kill switch
(`fit.KILL_SWITCH`, off) would replace the millimetres with the direction only ("Raise it in small
steps, about 5 mm at a time") if a study finds the knee reading too rough.

The saddle verdict comes from the pedalling reading. The held-still reading can only hold a change
back: when the two are out of range in opposite directions, the app asks you to film again instead.
On its own, the held-still reading never gives a number of millimetres, because a study of 30
cyclists found it differs from pedalling by about 8 degrees on average
([Bini and Hume, 2016](https://openrepository.aut.ac.nz/items/9fba7a89-48d4-43cd-8515-9925d3aefd63)).
When the held-still reading is out of range while the pedalling one is in range, it asks you to film
once more to be sure, but only once: if the last session filmed the same way said so too, or this
film was already the average of two films near the edge, it does not ask again. Two films near the
edge always decide: a third film near the edge is averaged with the second, never "once more" again.
It is also set aside when the pedal arm
looks more than about 10 degrees from straight down, a rough check that has not been tried on a real
rider yet. The pedalling reading only counts strokes the phone saw well enough: at least 12 frames
per turn of the pedals, and exactly one turn (the ankle going up past the middle and back down)
between one bottom and the next. If you pedal too fast for the phone, it asks you to slow down. It
counts the turns by the ankle going up and down, so pose noise at the bottom of a slow turn does not
make it ask a slow rider to go slower.

Bar advice only comes once the saddle height is right, and only when two of three signs agree, each
from an angle the results show as out of range.

**If less was exact than usual**, the results say what and give one step: "Less exact this time:
the light was low. To be sure before you change anything, film again in more light." Copy results
uses the same words.

## When you stop pedalling, or get off

- **The pedalling time counts only while the pedals turn.** The countdown reads "Paused" after 3
  seconds without movement, and "Ten seconds left" never comes while you are stopped.
- "Keep pedalling" is said at most twice in a row, and never after a Yes to the pain question (see
  below). Then: "Take your time. Pedal again when you are ready, or tap Stop." It waits up to 20
  more seconds (the step's existing extra time) and then
  finishes with what it has. Only the part before you stopped is measured: a foot held still would
  otherwise look like fast pedal strokes.
- **With a Yes to the pain question**, the pedalling instruction ends "If your knee hurts, stop
  pedalling. I will use what I have.", and stopping gets "If it hurts, stop. I will use what I
  have." straight away: nothing asks you to keep going ("Keep pedalling", "Keep going", "Pedal
  again"). It finishes 5 seconds later, with a pedalling reading if it saw 5 strokes, else the
  held-still one. The same when the pedals are never seen turning (you did not start because it
  hurts, or the phone gets too few frames a second to see it): 10 seconds after the instruction
  that line comes in place of "I cannot see the pedals turning. Keep pedalling ...", and 5 seconds
  later "Stop. You can relax." and "I could not see the pedals turning, so I can only give you the
  held-still reading." (or "... there is not enough to measure this time.").
- "Keep going, a little slower" only when the strokes were too fast for the phone; otherwise "Keep
  going. A few more turns." "Stop. Nice work, you can relax." only for a full reading; otherwise
  "Stop. You can relax." On a trainer or rollers it first says "On rollers, put your hand back on
  the wall, then stop pedalling.", unless you have stopped already. With a Yes to the pain question
  the pedalling instruction there also says "On rollers, put your hand on the wall first."
- **Holding still, if you get off to rest**, the first line is "Take your time. Get back on when you
  are ready. I will wait." The 45 seconds after which it goes on without a still reading count only
  the time you are in view. With a friend, or anyone else seen, getting back on somewhere else in
  the picture sends it back to getting on the bike (see "Two people in the picture").

## Checking a change you made

**One change per ride** (round 4, SPEC 4.4 item 3). After a change, the film straight after it
(**I Moved It <n> mm, Check Now**) checks the position, as below. If the knee is still out of range,
the results say where the knee is and the rule in one title, **Still a Little Low. Ride It First**
("One change per ride. Next time, tell me how it felt."), under a neutral **After a ride** status,
instead of a next step; the "too small to measure" line is said and sits in the saddle card's
Details. The Check tab says "Ride your last change, then check again." The next step comes only
after **Better** or **The same** on the next check. After one **Worse**: **It Felt Worse. Ride It Once
More** ("If it is still worse, I will tell you to put it back."), no new change on top of it, and
the question waits for another ride; also when the knee is in range now, with the areas as measured
and no "Check again whenever you change..." (never a win while that answer stands). After two: **Put the Saddle Back** (the arrow points the way
back), recorded as undone, and that same change is
never suggested again ("Leave the Saddle at Your Tape Mark", "A bike fitter can look at why.");
another change can be. Copy Results says how the last change felt. In range after the change, the
win below is unchanged.

One change of the saddle moves the knee reading only a little: at about 3 to 4 mm per degree (AI
Bike Fit's rule of thumb), a 10 mm raise takes off only about 2.5 to 3.3 degrees, about the size of
the 2 to 3 degrees one reading can be off. So after you say how far you moved it, the next session
says what the change should have done and what it did:

- **In range now**: leave the saddle where it is, whatever the size of the change. "Knee bend 49°
  before, 37° now. It moved the right way and is in range now, so leave the saddle where it is.",
  and "That is more than a 15 mm raise usually does. What counts is where it is now." when the size
  did not fit. If it moved the other way, it adds "Check the saddle is where you left it." Nothing
  is held back, and the Check Your Change card goes. Spoken without numbers: "Your knee moved the right
  way, and it is in range now. Leave the saddle where it is."
- **A change too small to see** (anything under 9 mm, so every 3 and 5 mm step): "That change is
  too small for me to measure. Your tape mark shows it moved. I only check whether you are in range
  now." Then only where the knee is now counts; nothing is held back, and it is never called "That
  worked". The verdicts below are for 9 mm and more.
- **That fits**, out of range: the knee moved at least 3 degrees the right way, and no more than the
  change should do plus 3. The next step follows as usual.
- **Too small for the camera to see**: the knee moved less than 3 degrees and is still out of range.
  "A 10 mm raise should change it by about 3°, about the smallest change this camera can see, so I
  cannot tell yet whether the saddle moved. Check the tape mark, then film once more."
- **It moved the other way**, **less than the change should do** or **more than it should do**, out
  of range: the app suggests no new change and asks you to film once more. The change stays
  waiting, so that next film is compared with the reading from before the change. This way a second
  change is not piled on a first one that has not shown up yet.
- **The second film still does not fit**: the app goes by what that film shows and gives the next
  step as usual. It asks for "once more" only once, so you are never stuck filming again and again.
  This is our own design choice, not a published rule. The same once-only rule holds a handlebar
  change back when the saddle is in range but its move did not fit: "Film once more before you
  change the handlebars."

You can say any number of millimetres from 1 to 50 (the field's limit, a design choice). More than
10, the biggest step the app gives, is saved as you said it, with "this check will be rougher". The app
stores only which way the saddle moved, how many millimetres and when; the history row shows it
("raised 10 mm", or "suggested: raise about 5 mm" when nothing was logged) with the pedalling knee
("knee 49°"). Only a pedalling reading is compared with a pedalling reading. A session with no
pedalling reading does not use up the check; the change waits for the next one. There is no set
time to wait before filming again and no "ride it a few times first": we found no source for
either, and Apple has not published a retest interval that we could find. After raising the
handlebars the next film shows the back, shoulder and elbow angles before and now, but does not
judge them: we found no source for how much one spacer should change them.

### Checking it straight away

Checking a change used to repeat the whole setup, about 280 spoken words (the customer research's
count). Now, when there is something to change, the result starts with "Leave the phone where it
is.", and **I Moved It <n> mm, Check Now** (or **Check Again**) starts again at getting on, with no placement and no
levelling, when the phone is where it was levelled: "The phone is already in place. Get on as
before, ...". That takes about 30 words before "Hold it" in the simulation. Getting Ready's Start
does the same for a new check from the Check tab in the same visit. It is decided like this:

- From the moment the phone is level, the motion sensor watches it. It counts as moved once it tips
  more than 2 degrees from where it was levelled for longer than half a second (both design
  choices, not measured on a phone): a tap that rocks it and lets it settle back is not a move.
  Moved: the check sets the phone up again, in the short words above.
- With no motion reading for more than a second (the screen locked, the app in the background,
  motion not allowed) or a level check that was skipped or done by eye, it cannot tell, so it asks
  **Is the Phone Where It Was?** (said and shown): **Yes, Start** starts at getting on, **No, It
  Moved** sets it up again.
- The sensor cannot see a phone slid along the box or turned without tipping it. The picture check
  after getting on still catches a phone that points wrong.
- While a change waits on the results, the screen stays awake for up to 10 minutes (a design
  choice), because a locked screen stops the motion sensor; it is let go when the results close.

### Coming back

After **Not Yet**, **When Will You Move It?** offers **Tonight** (8 pm, or an hour from now on the half
hour once it is 7 pm), **Weekend** (Saturday at 10 am, or Sunday once that has passed) and **Pick a
Day** (a day and time, tomorrow at 10 am to start from); the times are design choices. Each makes a
calendar file (`.ics`) on the phone, with no server and no notifications from the web: one event,
"Bike fit: raise the saddle about 5 mm", an alert when it starts, and the app's address, so the
event opens the app. Nothing about it is stored in the app. What Safari does with the file, from
Safari and from a Home Screen app, is not checked on an iPhone yet (the customer research marks it a
hypothesis).

**How to raise or lower the saddle**, under the saddle step, follows Park Tool's
[How to Adjust a Bike Saddle and Seatpost](https://www.parktool.com/en-us/blog/repair-help/how-to-adjust-a-bike-saddle-seatpost):
open the quick-release lever or the clamp bolt (usually a hex key), move the post, look down the
bike from behind to keep the saddle straight, never above the minimum insertion mark printed on the
post, and tighten to the torque printed on the clamp or in the maker's instructions. Marking the
post with tape to see how far it moved is the app's own tip, and "No torque wrench, a carbon post,
or not sure: ask a bike shop." is a design choice.

One difference from AI Bike Fit. Its front-end rule counts a closed shoulder (under 80) and bent
elbows (over 30) as signs of a long, low front end. Both usually mean the bars are close, not far,
so this app counts only a low back (under 40), a shoulder over 95 and locked elbows (under 8). The
back and the shoulder count only past their own u (round 4: under 37, over 98), so a sign is always a
reading in its Needs attention zone: a back at 38 and a shoulder at 97 used to give "Raise the
handlebars" next to two rows saying "No change needed." Locked elbows, under 8, are already more than
u below the elbow target. Two of the three must agree before it suggests raising
the bars.

## The camera view

The same spot on the chair, used two ways, chosen by "Where will the screen face?" (Alex, 2026-10-10:
"Chair, screen facing me"; the back camera stays the default until his phone test). The camera view
is dark in both, and the voice says everything either way.

**Towards me: the 3 m layer.** From 3 m a phone screen shows only big things (the design review's
arithmetic: a 120 pt word has capitals about three times the size a sharp eye needs at that distance,
a 17 pt caption is unreadable). So:

- A 14 pt border round the whole screen, with one meaning per colour: solid blue while it is working,
  dashed yellow when it needs you, solid green when you are in place or a step is done.
- One word in heavy rounded capitals, 120 to 128 pt, with a few words under it: GET ON (and a tick
  once someone is in the picture), TURN for the turn-the-pedals question, WAIT "Stay on the bike"
  while it checks the picture, MOVE with an arrow and the way to move the phone in bike words
  ("Phone towards the front wheel", never left or right), STAY "You are in place". MOVE stays while
  you get off and level the phone again; once it is level, the correction has been carried out, and
  the walk back to the bike shows GET ON, not MOVE (a phone slid along without tilting it is not
  noticed by the motion sensor, so there MOVE stays until you are back on).
- Your figure beside the word: the camera picture, shown like a mirror (so an arrow towards the front
  wheel points at the real front wheel as you see it from the bike), blurred and dimmed; on it a
  dotted outline of a rider on a road bike where you should be, facing the way you face; and you,
  drawn from the pose model's points as thick rounded limbs (torso 30, thigh 22, shin 20, arm 15 pt),
  with no numbers on it. White while it checks, yellow when you are not in place, green when you are
  in place, side-on and fully in the picture. Only the picture is mirrored, on the screen; the points
  the angles are measured from never are.
- Levelling: the degrees off level at 140 pt and a level bubble, on a dashed yellow border, then the
  whole screen green with LEVEL, "Leave the phone there", for 2 seconds (a design choice).
- Holding still and pedalling, the screen goes still: no picture, no figure, no caption, only a 250 pt
  ring (24 pt line, filling clockwise; one step a second with Reduce Motion) with HOLD, or the seconds
  left in 128 pt digits, and PEDAL. The voice says "Eyes ahead" for both: turning the trunk 10 degrees
  towards the phone would read the back about 3 degrees high (the camera panel's calculation, about a
  behaviour nobody has observed yet). One green flash, 0.6 seconds (a design choice), when the
  held-still reading is taken.
- At the end, STOP ("You can relax"), then the result as a full green or yellow screen: GOOD, AGAIN, BARS, or the
  millimetres to change with an arrow up or down, the headline under it, and **See What to Do**,
  which opens the results. When there is nothing to change but the held-still reading asks for one
  more film, it is AGAIN, "Film once more to be sure", as the voice says, not GOOD; in range near an
  edge with nothing to change, it is FAIR.
- With this screen the picture check says "Checking the picture. Stay on. I will tell you if the
  phone needs to move.", "That is it. You are in place." when it is right, and, while nobody is on
  the bike, "Stand beside the bike and look at the phone. A tick means you are in the picture."

**Away from me: arm's length.** For you walking back to the phone, or a helper standing behind it:
the picture as the camera sees it (not mirrored), the same figure and outline on it, the last
correction on a frosted card at 24 pt with its arrow (it stays until you are back on the bike, or
until the phone is level again after it), a 44
pt glass Stop, and the ring kept small in the corner during the hold and the pedalling, for a helper.
The results open straight away at the end, as before.

In both, captions (15 pt, growing with the text size) show only in the setup steps, for reading up
close. Design choices, not published numbers: the outline sits in the middle of the picture with the
wheels 80% of the way down and the head about 15% from the top (where a lens at the top of the tyres
3 m away puts them), and beside the word the picture shows at least the middle 62% of its width.

Once after the camera's first frame the app notes what the browser really gave (which camera, the
size and frame rate, from `track.getSettings()`) in `window.__bfc.camera`, and Copy Results adds one
line, "Camera: front, 1280 by 720, 30 frames a second.", so a phone test can report it.

### The drawn demos

Round 4: short clips of the next moves, in `assets/demo/`. **They are drawn placeholders**, stand-ins
drawn on a computer (no real people), with "Drawn demo" in the corner, until realistic clips replace
them. The design review's rule is that a demo plays before a move, never during it, so they play only
on the first check of a setup on this phone (day one), while you are still at the phone and can see
the screen, whichever way it faces:

- while the voice says where the phone goes, the placement clip (a man standing the phone on the box)
  loops in the drawing's box on the placement screen;
- from the get-on line, before you walk to the bike: getting on and holding still, then pedalling
  the way your setup pedals (forwards on a trainer, backwards against a wall or with a friend), about
  15 seconds in all, over the camera view, under the caption.

They are muted, because the app's own voice is speaking, add no time (the step waits for its
instruction to be heard anyway), and a tap anywhere on one skips it (**Tap to Skip**). They never play
on a returning run. To see them again, tap your setup's row under "Three Ways to Hold the Bike" in
Learn. A clip that cannot play (offline, since clips are left to the network; Low Power Mode; a
browser without H.264) is let go of at once, and the check goes on as without it. Seven clips,
2.4 MB, and their posters (cached for offline), 0.34 MB; the source is the stand-in set's muted
versions (`S02`, `D1`, `S03`, `D2`, `S05`, `S04`, `S06`). Not seen on an iPhone yet.

## The phone's roll, taken out of the picture

The level check lets the phone roll up to 2.5 degrees about its lens, and a rolled picture turns every
angle measured from horizontal or vertical by the same amount: the back angle, and where the ankle is
lowest. So every pose is turned back by the roll the motion sensor measures, about the centre of the
picture, before any angle is measured or the lowest point of the pedal is found (`fit.imageRoll`,
`fit.derotate`). That is exact and needs no focal length. On the camera panel's error grid it took the
share of setups with all four angles within 2.5 degrees from 51% to 73%, and the worst knee error
from 1.47 to 0.80 degrees (camera panel, 2026-10-10, made-up riders with perfect landmarks).

Which way to turn depends on the camera and on which way up the phone stands sideways, and is worked
out from the sensor's axes in `fit.js`: gravity in the picture is `atan2(y * sign(x), |x|)` for the back
camera and `atan2(-y * sign(x), |x|)` for the front one. `sign(x)` carries the flip between the two
sideways positions, and also makes it the same whichever sign the browser reports gravity with (Safari
on iPhone was reported in 2014 to use the opposite sign to the specification). The tests build the
rolled phone separately from its own axes (`test/synth.js`) and check both cameras, both sideways
positions and both signs. A roll over 10 degrees is not corrected (a design choice: the phone is
falling over or in someone's hand).

Not checked on a real iPhone: that Safari gives the page the front camera's picture as the camera sees
it, not mirrored. If it is mirrored, the front camera's sign is the back camera's
(`FRONT_FRAMES_MIRRORED` in `fit.js`), and the same flag stops the screen mirroring the picture a
second time, so the arrows along the bike still point at the real wheel (`mirrorShown` in `app.js`).
The phone test: with the screen towards you, put a coin under
one end of the phone so it stands rolled but still passes the level check, run a check, then take
the coin away and run another without moving anything else. The back angle should be about the same
both times; about 4 degrees apart means the sign is the wrong way round.

## Pain or numbness

A Yes puts a note first in the results and first in what the voice says, with no numbers: "You said
pain or numbness keeps coming back. Try this one change first. If it is no better within a few
weeks, or it gets worse, see a doctor or physio, and a professional bike fitter. Get medical help now
if your knee is badly swollen, has changed shape, or cannot take your weight. This is not medical
advice." With nothing to change it says "Your position looks in range." in place of the first
step, and with no reading it says neither. Then: "This check cannot tell what causes your pain. It
films you from the side, so it cannot see your feet, your cleats, or how your knee moves side to
side." Sources: the NHS page on [knee pain](https://www.nhs.uk/conditions/knee-pain/) (see a GP if it
does not improve within a few weeks; get help now if you cannot put weight on it, or it is badly
swollen or has changed shape), and AI Bike Fit's reporting rules (a professional fitter for
persistent pain or numbness; not medical advice; no foot angle from this kind of video; and, for the
pelvis, that true side-to-side movement needs a view from behind, which holds for the knee too: a
camera at the side cannot see movement towards or away from it).

## How exact it is

- In one study of 26 cyclists filmed from the side, this kind of phone pose model was typically off
  by 3 to 9 degrees against lab markers, and worst at the foot and ankle
  ([Sport Sciences for Health, 2023](https://link.springer.com/article/10.1007/s11332-023-01075-7)).
  That is why a reading is Good only when it is inside its target by more than the app's error
  (above), and why there is no ankle number.
- The pose model that runs on the phone is lighter than the large model the full
  [AI Bike Fit](https://github.com/guzlz/ai-bike-fit) tool uses. For the most exact numbers, save
  the video from the results screen and run it through that tool.
- Against a wall or with a friend, pedalling backwards without resistance is a workaround for not
  having a trainer. Your foot can sit differently than when you really ride, which is why the app
  also measures you holding still and says so when the two readings point different ways. On a
  trainer you pedal forwards under load, the way the target range was measured.
- The setup checks (side-on, in the picture, level) and telling the rider from a helper have been
  tested on simulated people. They have not yet been tested on many real ones.
- "A few minutes": a real first session has not been timed yet. With real speech, one picture
  correction made a tester's session over two minutes.
- Not medical advice.

## Not included, and why

- **Apple's balance, strength and VO2 max tests.** No source we found links them to a saddle or bar
  change, and a web app cannot read Apple Health.
- **A combined fit score.** Nothing to base the weights on.
- **A flexibility check.** Apple's evaluations have one, and a toe touch is the likely candidate
  for a bike fit, but not yet: the pose model's hand point is not documented as the fingertip, so
  "can you reach your toes" has no reliable reading, and the result would only change the note
  about sitting upright.
- **Where it hurts.** The pain or numbness question is yes or no. It is not turned into a saddle
  change, because the evidence linking saddle height to knee injury is limited (a systematic review,
  Bini and Priego-Quesada, 2022, per its abstract:
  [record](https://producciocientifica.uv.es/documentos/61a1f531bd93e62bb6018075)).
- **A time trial mode.** Alex's decision; nothing grades a time trial bike.

## Privacy

It runs entirely on the phone. No server of ours, no analytics and no upload: GitHub only serves the
app's files. The pose model and its engine are served from this repository rather than a
third-party site, and your results stay in the browser's own storage. Your answer to the pain or
numbness question is never stored: not in the browser, not in your past sessions and not in Copy
results.

## The voice

Every line the app can say is recorded in the coach's voice, Heart (Kokoro-82M's `af_heart`,
American English, normal speed; DECISIONS.md, "First female American is great" and "Needs to be
build in"), and ships with the app in `assets/voice/` as `.m4a` clips (AAC, 48 kb/s, mono, 24 kHz),
listed by their exact words in `assets/voice/manifest.json` (words, file, length). Nothing to
download or switch on.

- **How it plays.** All clips go through one shared `<audio id="voice">` element. iOS lets a page
  make sound only after a tap, so every tap that leads to the voice first sets the audio session to
  playback (where Safari has it), wakes the beeps, and plays a moment of silence on that element;
  after that the element may play on its own. The recorded voice plays on Alex's iPhone (his test,
  2026-10-11). A media element follows the phone's media volume, so the voice is likely heard with the
  phone on silent, where the beeps (Web Audio) may not be: likely, not yet confirmed with silent mode
  on. Lines never overlap: one finishes before the next starts, and the
  app's timing waits for the clip to end. The caption shows the line's own words.
- **The sound log.** Copy Results ends with one Sound line: how many clips played, how many were
  cut short and how many fell back to the phone's own voice, then each cut line (the last 8) with
  how far in it stopped and what stopped it: the iPhone pausing it, a newer line, Stop, or a timer
  (`ui.soundLog`, `Voice.logCut`). Added after Alex heard the voice cut off mid-sentence
  (2026-10-11), so one pasted result shows the cause.
- **Which clip.** A line with a clip of its own plays as one clip. A line built from parts at the
  end of a check (the spoken result, "Saved 20 mm.") plays sentence by sentence; every such
  sentence carries at most one number, and each value has its own whole sentence (one clip for "Your
  knee bends 47 degrees with the pedal at its lowest point.", another for 48), so no number is ever
  stitched into a sentence. Knee readings are recorded from 0 to 90 degrees and millimetres from 1
  to 50 (design choices: a knee bent more than 90 degrees with the pedal at its lowest point is not a
  riding position, and 50 mm is the change card's own limit).
- **The fallback.** Only when a clip fails to load or play, or a line has none, that part is said
  in the phone's own voice. `test/voice.test.mjs` fails when a line the app can say has no clip. A
  browser that cannot play AAC goes straight to that fallback; the headless test browser (an
  open-source Chromium) is one, so there the app behaves as before the clips. Safari, Chrome and
  Firefox play them.
- **Offline.** The service worker keeps the clips in a cache of their own (`bfc-voice-v1`). It
  stores every instruction and every sentence without a number when it installs (`pre` in the
  manifest), so a first check works offline; the sentences with a number are stored the first time
  they play. Clips the manifest no longer lists are deleted when a new version takes over.
- **What was changed in the words to make this possible.** In the spoken retest only (the screen
  is unchanged): "Knee bend 50 degrees before. 46 degrees now." (two sentences, was one), the
  "smallest change" and "hardly changed" tails as their own sentences, the handlebar retest says
  which way each angle went ("Your back angle went up.") with the numbers left on the screen, and a
  change filmed with the bike held another way is spoken without naming both setups. "Say It Again"
  says the knee reading as its own sentence, then the target.

**Rebuilding the voice after changing any spoken words: one command.**

```
node tools/voice/build-voice.mjs
```

It works out every line from the code (`tools/voice/catalog.mjs` reads each `Voice.say` in
`app.js`, and runs `fit.js` over a grid of readings for the spoken result), records only the lines
it has no clip for (a clip's file name is a hash of its words), and removes clips no line uses any
more. `--check` only reports what is missing. It needs Python with `kokoro-onnx` (on the build
machine, `/home/user/tts/.venv`; `--python` for another), the Kokoro v1.0 model files
(`KOKORO_MODELS`, default `/home/user/tts/models`) and `ffmpeg`. Options: `--jobs` (worker
processes), `--threads`, `--limit`. In `sw.js` the voice-clip rule stays before the rule that
leaves other sound and video to the network (`MEDIA`).

Measured on 2026-10-11: 687 clips (150 whole instructions from `app.js` and 537 sentences of
results), 38 minutes of speech, 15.1 MB in all, 21.9 kB a clip on average; 262 of them (7.3 MB) are
precached. After the simplicity pass the same day (shorter instructions, one idea a sentence; the
pedalling line said as three short lines): 680 clips (143 whole instructions), 35 minutes, 13.8 MB;
255 precached (6.1 MB). The longest instruction went from 22 s to 15 s. Recording 648 of them in one run took 56 minutes with six workers on the 4-core build
machine while other jobs were using it (5.1 s a clip); one worker took 3 to 6 s for a short line,
about 2.2 s for each second of speech. With nothing to record, a run takes a few seconds.
Round 4's measuring rules (new knee band, steps of 3, 5 and 10 mm, the Fair lines, the win line):
38 new clips, 65 removed, 657 in all (13.2 MB; 257 precached, 6.0 MB). Round 4's flow (the fitter,
feel, warm-up, kit and effort lines, and the results that wait): 33 new clips, 2 removed, 688 in all
(13.8 MB; 288 precached, 6.65 MB), in 54 s with three workers.

## Development

- `npm test` runs the measuring maths tests, the offline-cache checks, checks on what the app
  says and shows, and whole `?sim` sessions in Node on a virtual clock (`test/flow.test.mjs`, which
  starts `test/flow-runner.mjs` once per session; Node 20 or newer). The runner can be used on its
  own: `node test/flow-runner.mjs "setup=friend&slide=70"` prints the session as JSON. `pain` in its
  query taps Yes to the pain question first (the page itself never takes that answer from the
  address), and `fps=3` sets the made-up camera's frames a second (30 by default). A second check in
  the same page view, for the runner only: `then=now` taps the bar's **I Moved It <n> mm, Check
  Now** and prints what it said (`nowLabel`, `nowAria`) and what that tap stored (`madeByNow`)
  (with `nudge`, it first taps plus and minus on the stepper and waits, so the voice points at it),
  `then=again` taps Check Again (and answers "No" when it asks whether the change was made),
  `then=home` closes the results and starts a new check from the Check tab, through the question
  screens, as a returning rider would (`painwait` taps Next on the pain question before
  answering it, to see it wait; what was seen and said there is printed as `homeFlow`), and `then=later` taps Not Yet, with `when=tonight`, `when=weekend` or `when=pick` answering
  "When will you move it?". `where=yes` or `where=no` answers "Is the phone where it was?", and
  `mm=15` types 15 into the change card's stepper first. The second check is printed as `next`.
  Round 4: `flow` starts the first check from the Check tab through the question screens too
  (printed as `flow`: the screens, the lines said, Getting Ready's rows); `fitter=yes` answers the
  fitter question (No by default), `feel=better|same|worse|later` the feel question (later: Not
  Ridden Yet), and `kit=no` taps Different Shoes or Shorts on a retest's Getting Ready. The fixer:
  `repeat=<n>` taps Check Again n more times, `homes=<n>` starts n more checks from the Check tab,
  and `made=yes` taps Save and Start on "Before you start: did you ...?"; those checks print as `more`.
  Each check also prints `views`: what the camera view showed (`ui.liveView`: the step, the layer,
  the word, the line under it, the field's word, the frosted card), each time it changed.
- Add `?sim` to the address to walk the whole flow with a made-up rider and no camera.
  `?sim&low` makes the saddle too low (35 mm; `&low=20` for 20 mm), and a saddle change marked in
  that page view moves the made-up saddle by as much, so **I Moved It <n> mm, Check Now** shows what a
  change did. `&moved` picks the made-up phone up after each check (the next check sets it up again), `&replaced`
  picks it up and puts it back square on the tape marks (a rider coming back another day), `&nomotion`
  leaves no motion reading after a check (so the next check asks "Is the phone where it was?"), and
  `&inapp` acts as if the page were opened inside another app's browser. `&voice=off` plays no
  recorded clips and times every line by its word estimate, for quick headless runs (with clips, a
  simulated check takes as long as the speech). `&setup=trainer`, `&setup=wall` or `&setup=friend` answers
  "How will your bike stay up?" (also without `?sim`; a choice made on the page replaces it in the
  address). In the simulation: `&helper=visible` adds a made-up friend standing in view at the back
  of the bike, `&helper=lean` one leaning in at the rider's hip almost in riding posture, and
  `&helper=braced` one half-crouched behind the rider's hip, knees bent, a hand to the stem, who
  sits like a rider; each is there from the start. `&late=12` has the rider get on 12 seconds into
  the "get on" step, and `&back=30` 30 seconds into each later one (3 by default). `&pedal=wrong`
  pedals the wrong way for the setup, `&pedal=stop` stops the pedals 4 seconds after the timing
  starts, `&pedal=none` never turns them, and `&away=40` takes the rider out of view for 40 seconds
  while holding still, once a session; with `&awayshift=80` he gets back on 80 pixels further along
  in the picture, and with `&restpose=braced` the friend half-crouches at the bike while he is away.
  `&arrive=still` (or any other step) has a helper come to the rider's hip in that step and stay,
  leaning in with a hand on top of the brake lever (`&ah=braced`: the braced helper), and the pose
  model miss the rider on that first frame (`&miss=1.5`: for 1.5 seconds). `&slide=70`:
  after a picture correction, the phone is turned or slid along without being tilted, and the rider
  gets back on 70 pixels further along in the picture. `&unfixed`: moving the phone never fixes the
  picture, so the same check asks three times and is then skipped. The made-up rider does what the
  voice asks: it turns the pedals once the question who the rider is has begun to play (a question
  never said leaves it sitting still), and after a picture correction it gets off, moves the phone
  (which then has to be levelled again, unless `&slide`) and gets back on. On a trainer it pedals
  forwards.
- The screens: `&screen=towards` or `&screen=away` (also `front` or `rear`) answers "Where will the
  screen face?" (also without `?sim`); in the simulation it also picks the made-up camera, so the
  front camera's mirrored camera view can be seen headless. The phone's roll: `&roll=2` stands the
  made-up phone rolled 2 degrees about its lens (the picture and the motion sensor both say so),
  `&land=left` or `&land=right` which way up it stands sideways, `&conv=ios` (the default) or
  `&conv=spec` the sign it reports gravity with, and `&noderoll` leaves the roll in, to see what it
  costs. `&tab=progress` or `&tab=learn` opens on that tab. `&installed` acts as if the app
  were opened from the Home Screen, so the Add to Home Screen card stays away (the simulation
  otherwise shows it, as a first visit in Safari does). With `?sim`, `&seed=asked` (one check that
  suggested raising the saddle, not answered yet), `&seed=trend` (three checks against a wall, the
  saddle raised 5 mm and then 10 mm, the last not checked yet: Check Your Change and the Progress
  chart; a simulated check after it shows Your Saddle Change Worked) or `&seed=good` (nothing to
  change), `&seed=rode` (a 5 mm raise three days ago, filmed straight after, not asked how it felt)
  or `&seed=worse` (the same, "worse" once already; `&seed=worselow` for a lowered saddle), `&seed=unsaid`
  (a 5 mm raise suggested three days ago, not answered) fills a made-up history kept in memory only: it never touches the history stored on the
  phone. A check starts from the Check tab (`#newCheck`, or `#retestStart` when a change waits),
  then `#flowNext` (the bike), `#screenNext` (the screen), `#painNo` or `#painYes` and `#painNext`
  (the pain question, which waits for an answer), then `#start` on Getting Ready, which says Next before the
  first check in a page view and opens the permission screen, where `#allowStart` starts. Check It
  Now and Check Again on the results start straight away, or ask `#flowWhere` first.
- `window.__bfc` in the browser has the counts the tests read: `wrongPicks` (frames where someone
  other than the made-up rider was measured, also when the rider was not in the picture; must be 0), `ambiguous` and `ambiguousBy` (frames nobody was measured
  in, by step), `asks` and `identified` (the turn-the-pedals question), `said` (every line queued)
  and `started` (every line as it began playing, with the caption shown then); `setup()` and
  `screen()` the two answers, and `session()` the session in progress (`session().screen` is which
  way the screen faces, `session().camera` the camera that films); `view()` what the camera view
  shows now (`ui.liveView`), `camera` what the browser gave, and `roll` the roll taken out of the
  last frame; `ics` the last calendar file made. With the screen towards the rider, the flow runner taps See What to Do once the
  result shows on the camera view, and prints `runField` (the big word shown there), `camera`,
  `roll` and the readings saved (`values`).
- The voice: lines are queued and said one at a time, and the caption on the run screen changes
  when a line starts playing; see "The voice" below. With no sound at all (the Node flow runner) it
  goes by an estimate of the speaking time; with clips, by their real lengths.
  `window.__bfc.voice` lists the clips played, any part said in the phone's voice instead
  (`fallback`: the clip failed; `missing`: no clip), and how many clips the manifest has.
- To run it locally: `python3 -m http.server`, then open `http://localhost:8000/?sim`. The camera
  only works over HTTPS or on localhost.
- When anything in `vendor/` or `models/` changes, change the cache name in `sw.js` (the test says
  what it must contain), or phones keep the old engine. A new file the page needs goes into `CORE`
  in `sw.js` (`screens.test.mjs` checks the list). The clips (the setup guide, the Camera app clip,
  the drawn demos) are left to the network, so they play only online; their posters are cached.
- Large text: sizes are in rem on `font: -apple-system-body`, so they follow the iPhone's text size;
  buttons are sized by padding and wrap, and the tab labels stay 11 px, as Apple's do. When the
  first answer of a question screen would sit under the Next bar (28 px text on a 375 x 667 screen,
  round 3's QA), the picture at the top gives way and, if needed, the page scrolls just enough
  (`answersInView`). The results bar sticks to the bottom only while it is at most a fifth of the
  screen; taller, it sits under the change card and scrolls with the page (`fitBar`). Filled
  buttons are bold and at least 18.7 px, so their text passes contrast as large text (3:1).
- Not checked on a real iPhone yet, from the camera view: whether Safari gives the front camera's
  picture mirrored (the sign of the roll correction, above), its size and frame rate, whether the
  blurred picture behind the figure costs frames, and how the 3 m layer reads from the bike.
- Not checked on a real iPhone yet: the light and dark status bar (`apple-mobile-web-app-status-bar-style`
  is now `default`, because white status bar text on the light tabs would not show), the glass
  blur, and how the results sheet and the check flow scroll in Safari.
- Sound on an iPhone: every tap that leads to sound calls `unlockSound()` first, inside the tap
  (the audio session, then a silent sample for the beeps, then one almost silent word for the speech
  fallback and a moment of silence on the clip element). The fallback voice is a Premium or Enhanced
  American or British voice when one is installed on the phone (`bestVoice`, from the live hotfix).
- `assets/setup-guide.mp4` is built from the phone placement drawing, one render of the bike and
  title cards, narrated by Heart (Kokoro `af_heart`).

| File | What it is |
|---|---|
| `index.html` | The three tabs (Check, Progress, Learn) with the glass tab bar, the check flow (Setup, Getting Ready), the camera view and the results sheet, in the iOS 26 colours, light and dark |
| `app.js` | Camera, voice, tilt sensor, the step-by-step flow, and drawing the screens |
| `ui.js` | The words and shapes of the screens: Title Case, range bars, the Progress chart, the Check tab's summary, the list of changes. No browser code and no maths of its own: every number comes from `fit.js` or a stored session |
| `fit.js` | The measuring maths and the words of the results, with no browser code, so it can be tested |
| `sw.js` | Offline support from the first visit: the engine and the model are cached when it installs (that first visit may download them twice), and the voice clips in their own cache |
| `assets/voice/` | The coach's recorded voice: one `.m4a` clip per line or sentence, and `manifest.json` (see "The voice") |
| `assets/demo/` | The drawn demos, drawn placeholders: the placement loop, and getting on and holding still and pedalling for each setup, muted, with their posters (see "The drawn demos") |
| `tools/voice/` | The voice build: `build-voice.mjs` (the one command), `catalog.mjs` (every line the app can say, from the code), `jsread.mjs` (reads app.js for it, no library needed), `render.py` (Kokoro) |
| `test/` | Tests, and the made-up rider and helper they use (`setups.test.mjs`: the three setups, picking the rider, and checks on what app.js says; `flow.test.mjs`: whole simulated sessions, run by `flow-runner.mjs`; `ui.test.mjs`: the screens' words and shapes; `screens.test.mjs`: what the tabs, the check flow and the results sheet are built from; `roll.test.mjs`: the phone's roll taken out, for both cameras and both sideways positions; `live.test.mjs`: the camera view's states, the camera choice and the placement step; `cx.test.mjs`: the customer research's changes, the calendar file and its times, the win's words, the bike guide and the tape tip, the permission screen and the new spoken lines; `voice.test.mjs`: every line has a recorded clip, every clip is real audio, the one shared audio element, the service worker's voice cache; `simple.test.mjs`: the simplicity pass, no long line on a main-path screen, one primary button per step, details one tap away, short spoken sentences and clips; `sound.test.mjs`: the sound on an iPhone, Tap to Hear Me and the setup guide; `feel.test.mjs`: round 4's flow rules, better, the same or worse, one change per ride, a change put back, a fitter's bike, other shoes or shorts; `demo.test.mjs`: the drawn demos, shown on day one, never on a returning run, skipped by a tap, the files muted and small; `access.test.mjs`: contrast of the buttons, and large text on the question screens and the results bar) |

## Credits

The target ranges and saddle rules follow [AI Bike Fit](https://github.com/guzlz/ai-bike-fit) by
guzlz and the research it cites. No code from it is used here. Pose estimation is Google's
MediaPipe; see [NOTICE.md](NOTICE.md).
