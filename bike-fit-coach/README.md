# Bike Fit Coach

Checks your road bike position with your phone camera and talks you through it out loud, so you
can stay on the bike while it works. The bike can be on a trainer or rollers, leaning on a wall, or
held by a friend. It is for road bikes with drop handlebars: it cannot check a time trial or
triathlon position on aero bars.

**Open it on your phone:** https://mishevelada.github.io/projects/bike-fit-coach/

## Using it

1. Open the link in Safari on an iPhone, or Chrome on Android.
2. Optional: tap Share, then **Add to Home Screen**. It then opens full screen, like an app, and in
   Safari it also keeps your past sessions safe: Safari can delete a page's saved data after 7 days
   without a visit.
3. Answer the first question: **How will your bike stay up?** Tap **On a trainer or rollers**,
   **Leaning on a wall** or **A friend holds it**. The phone remembers your answer for next time,
   and the steps change to match (see "Three ways to hold the bike" below). If you tap Start
   without answering, the question says so in red, and the voice says "First, tell me how your bike
   will stay up."
4. Answer the question under it: **Do you get pain or numbness that keeps coming back when you
   ride?** Nothing is pressed at first, and no answer counts as No. It is asked every time and the
   answer is never saved. A Yes adds a note first in the results (see "Pain or numbness" below); it
   does not change the advice.
5. Tap **Start** and allow the camera and the motion sensors (an iPhone asks twice). A rider who has
   filmed before finds Start on the first screen; the setup steps fold into **Show the setup steps
   again**.
6. Follow the voice. It first says which setup you chose ("You chose: bike leaning on a wall. If
   that is wrong, tap Stop now."), and the run screen shows it under the step names. On a trainer it
   asks you to check the bike is level. It asks you to stand the phone sideways on something 60 to
   80 cm high (a chair with a box on it works), about 3 m from the bike; the same three points stay
   on the screen until the phone is level, and it beeps, once it has finished speaking, until the
   phone is level. Then you get on the bike, and it checks the picture and tells you how to move the
   phone if needed. You hold the camera-side pedal at its lowest point for 3 seconds, then pedal:
   forwards for 30 seconds on a trainer or rollers, backwards for 20 seconds against a wall or with
   a friend holding the bike. At the end it says the one change to make first, in a sentence or two.
   **Say it again** gives the longer version, with the reasons and the other angles.
7. Make that one change. The results show **How to raise the saddle** (or lower it) under the
   saddle step, folded away. Then tell the app how far you moved it: tap **5 mm**, **10 mm**,
   **15 mm**, or **Other** and type the number. Nothing is chosen for you and nothing is saved until
   you tap one. For the handlebars it is one button, **I made this change**. **Later: I will ask when
   you come back** leaves the question for the home screen, which asks it until you answer, and
   asks once more before it films. The home screen then shows a **Film again** card with its own
   Start: "You raised the saddle 10 mm after your check on Oct 3." Film again, and the results open
   with a before and after line (see "Checking a change you made"). Film the check the same way as
   before (trainer, wall or friend): a film set up another way is not compared, and the results say
   so.

If a step does not work, the voice tells you what to try, and every step has a way out, which the
voice names when a step is not working: Skip for the level check; Skip, and then carrying on without
it, after 3 tries of the same picture check in one session (even if you move the phone in between);
Stop when it cannot see you. No sentence is said more than twice in a session: after that, the next
line is a different one or the way out. The exception is getting back on after you moved the phone,
or after a break while holding still (see "Two people in the picture"): those steps start again each
time, so their lines do too ("I cannot see you on the bike yet", the turn-the-pedals question below,
the picture check and holding still), at most twice each time. A limit for the whole session left
the third time on the bike in silence. If you tap Stop, the home screen opens with "Stopped. Nothing
was saved.", and "Your last change is still waiting to be checked." when one is.

## Three ways to hold the bike

| | On a trainer or rollers | Leaning on a wall | A friend holds it |
|---|---|---|---|
| Before you start | Level the bike: the middle of the front wheel as high off the floor as the middle of the back wheel. A trainer that holds the back wheel lifts it, so if the front sits lower, put a riser block or a thick book under the front wheel. On rollers, have a wall on the far side to hold on to. | The wall on the far side, away from the phone. The bike leans only a little, bars straight. | Your friend stands up straight on the far side, away from the phone, next to the saddle, and holds the bike still. |
| Getting on | Your normal riding position, hands on top of the brake levers. | The same, with the hand nearest the phone on top of the brake lever. | The voice speaks to each of you in turn: "Friend: ..." then "Rider: ...". Then the rider turns the pedals twice, slowly, so the app knows who is riding (see "Two people in the picture"). |
| Holding still | As on the others. On rollers, hold the wall with the hand away from the phone. | Squeeze the front brake gently to keep the bike still. | Your friend keeps the bike upright. |
| Pedalling | **Forwards** for 30 seconds, at an easy effort and your normal pedalling speed. On rollers, start pedalling with your hand on the wall and let go once you are rolling steadily. At the end, before "Stop": "On rollers, put your hand back on the wall, then stop pedalling." | Backwards for 20 seconds. | Backwards for 20 seconds. At the end: "Friend, keep holding the bike until the rider is off." |

Why it is done this way:

- **Forwards on a trainer.** The 30 to 40 degree knee target comes from riders pedalling forwards
  under load: the study behind the 8 degree static-to-dynamic gap filmed 30 cyclists on their own
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
the home screen's "Film again" card, which says how to set the bike up. Where the only earlier
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
  about 2 seconds, it says "Friend: stand behind the rider, on the far side of the bike, out of the
  camera's view as much as you can." With a wall or a trainer: "I can see another person. If they
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
| Knee bend with the pedal at its lowest, pedalling (forwards on a trainer, backwards otherwise) | 30 to 40 | Saddle height |
| Knee bend with the pedal at its lowest, held still | 25 to 35 | Cross-check of the above |
| Back angle, from horizontal | 40 to 50 | Reach and bar height |
| Elbow bend | 15 to 30 | Reach and bar height |
| Shoulder angle, torso to upper arm | 80 to 95 | Reach and bar height |
| Hip angle with the pedal at its lowest | 85 to 110 | For reference only |

The results come in two areas you can act on, in the style of the movement evaluations in Apple's
Health app: each area gets one status (**Good**, **Fair** or **Needs attention**; Fair is Apple's
word for the middle one), the reason for it and one step. There is no overall status on top. The
headline above the areas says the one thing to do and why, in words; the area gives the numbers.
The angles behind each area are listed under it as detail, with their target and how they changed
since the last session that measured them: "Down 12° since Oct 3, now inside the target", "closer to
the target" or "further from the target" ("now in range" when it came within 2.5 degrees of the
target, which is not "inside" it). "(that check was less exact)" follows a comparison with a session
that had a warning.

- **Saddle height**, from the two knee readings. Its step is the saddle change, if there is one.
  With only the held-still reading it is **Fair** at best, never Good, because that reading is only
  a cross-check (see below).
- **Reach and bar height**, from the back, elbow and shoulder angles together, because AI Bike Fit
  reads them as one thing with one cause. When the saddle needs changing first, this area reads
  **After the saddle**, because moving the saddle changes your reach too. It is **Needs attention**
  only when it has a change of its own (raise the bars). Angles outside their targets without that
  change read **Fair**, "That is fine to ride.", with the step "Nothing to do. I will compare it on
  your next check.": a design choice, since a bars change needs two signs to agree. The home screen
  says "Nothing to change" when no area has a step.
- **More numbers**, folded away: the hip angle, for reference only.

There is no "Excellent": a phone camera cannot tell the middle of a range from its edge. A change of
less than 3 degrees since last time reads as "About the same as last time". That 3 degrees is our own
design choice for comparing two films taken the same way, not the camera's error: AI Bike Fit's
research notes put one phone reading at roughly 2 to 3 degrees either way, and against lab markers
the study under "How exact it is" found errors of 3 to 9 degrees. Nothing has measured yet how much
two films of the same position differ. Unlike Apple's floor setup, the phone stands at hip height, because a
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
When the held-still reading is out of range while the pedalling one is in range, it asks you to film
once more to be sure, but only once: if the last session filmed the same way said so too, it says
"Nothing extra to do: the pedalling reading counts for more." It is also set aside when the pedal arm
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
  going. A few more turns." "Stop. Well done, you can relax." only for a full reading; otherwise
  "Stop. You can relax." On a trainer or rollers it first says "On rollers, put your hand back on
  the wall, then stop pedalling.", unless you have stopped already. With a Yes to the pain question
  the pedalling instruction there also says "On rollers, put your hand on the wall first."
- **Holding still, if you get off to rest**, the first line is "Take your time. Get back on when you
  are ready. I will wait." The 45 seconds after which it goes on without a still reading count only
  the time you are in view. With a friend, or anyone else seen, getting back on somewhere else in
  the picture sends it back to getting on the bike (see "Two people in the picture").

## Checking a change you made

One change of the saddle moves the knee reading only a little: at about 3 to 4 mm per degree (AI
Bike Fit's rule of thumb), a 10 mm raise takes off only about 2.5 to 3.3 degrees, about the size of
the 2 to 3 degrees one reading can be off. So after you say how far you moved it, the next session
says what the change should have done and what it did:

- **In range now**: leave the saddle where it is, whatever the size of the change. "Knee bend 49°
  before, 37° now. It moved the right way and is in range now, so leave the saddle where it is.",
  and "That is more than a 15 mm raise usually does. What counts is where it is now." when the size
  did not fit. If it moved the other way, it adds "Check the saddle is where you left it." Nothing
  is held back, and the Film again card goes. Spoken without numbers: "Your knee moved the right
  way, and it is in range now. Leave the saddle where it is."
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
15, the most for one change, is saved as you said it, with "this check will be rougher". The app
stores only which way the saddle moved, how many millimetres and when; the history row shows it
("raised 10 mm", or "suggested: raise about 15 mm" when nothing was logged) with the pedalling knee
("knee 49°"). Only a pedalling reading is compared with a pedalling reading. A session with no
pedalling reading does not use up the check; the change waits for the next one. There is no set
time to wait before filming again and no "ride it a few times first": we found no source for
either, and Apple has not published a retest interval that we could find. After raising the
handlebars the next film shows the back, shoulder and elbow angles before and now, but does not
judge them: we found no source for how much one spacer should change them.

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
back and the shoulder count only when they are more than 2.5 degrees past those numbers, because
within 2.5 degrees the results call a reading in range: a back at 38 and a shoulder at 97 used to
give "Raise the handlebars" next to two rows saying "No change needed." Locked elbows, under 8, are
already more than 2.5 below the elbow target. Two of the three must agree before it suggests raising
the bars.

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
  That is why readings within 2.5 degrees of a target count as in range, and why there is no ankle
  number.
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

## Development

- `npm test` runs the measuring maths tests, the offline-cache checks, checks on what the app
  says and shows, and whole `?sim` sessions in Node on a virtual clock (`test/flow.test.mjs`, which
  starts `test/flow-runner.mjs` once per session; Node 20 or newer). The runner can be used on its
  own: `node test/flow-runner.mjs "setup=friend&slide=70"` prints the session as JSON. `pain` in its
  query taps Yes to the pain question first (the page itself never takes that answer from the
  address), and `fps=3` sets the made-up camera's frames a second (30 by default).
- Add `?sim` to the address to walk the whole flow with a made-up rider and no camera.
  `?sim&low` makes the saddle too low. `&setup=trainer`, `&setup=wall` or `&setup=friend` answers
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
- `window.__bfc` in the browser has the counts the tests read: `wrongPicks` (frames where someone
  other than the made-up rider was measured, also when the rider was not in the picture; must be 0), `ambiguous` and `ambiguousBy` (frames nobody was measured
  in, by step), `asks` and `identified` (the turn-the-pedals question), `said` (every line queued)
  and `started` (every line as it began playing, with the caption shown then).
- The voice: lines are queued and spoken one at a time, and the caption on the run screen changes
  when a line starts playing. Without a speech engine (as in the headless test browser) it goes by
  an estimate of the speaking time. Lines are the phone's own speech voice for now; the recorded
  Heart voice and its line catalog (design-spec) do not exist in the code yet.
- To run it locally: `python3 -m http.server`, then open `http://localhost:8000/?sim`. The camera
  only works over HTTPS or on localhost.
- When anything in `vendor/` or `models/` changes, change the cache name in `sw.js` (the test says
  what it must contain), or phones keep the old engine.

| File | What it is |
|---|---|
| `index.html` | The three screens: home, the camera view, results |
| `app.js` | Camera, voice, tilt sensor and the step-by-step flow |
| `fit.js` | The measuring maths and the words of the results, with no browser code, so it can be tested |
| `sw.js` | Offline support from the first visit: the engine and the model are cached when it installs (that first visit may download them twice) |
| `test/` | Tests, and the made-up rider and helper they use (`setups.test.mjs`: the three setups, picking the rider, and checks on what app.js says; `flow.test.mjs`: whole simulated sessions, run by `flow-runner.mjs`) |

## Credits

The target ranges and saddle rules follow [AI Bike Fit](https://github.com/guzlz/ai-bike-fit) by
guzlz and the research it cites. No code from it is used here. Pose estimation is Google's
MediaPipe; see [NOTICE.md](NOTICE.md).
