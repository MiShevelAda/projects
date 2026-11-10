// The walk: every stop of the Science Museum guide, where it is, and the sources for its facts. The
// words (how to find it, what to look for, the story) are in stories.js. The text guide and the
// recordings are both made from these two files (tools/build-audio.mjs), so they cannot disagree.
//
// Facts, floors and closures were checked on 9 November 2026 against the museum's own pages and its
// September 2026 map. Nothing is narrated whose display today is unconfirmed (Stephenson's Rocket has
// gone to York; much of Making the Modern World is closed while it becomes Ages of Invention).

import { STORIES } from './stories.js';

export const CHECKED = 'November 2026';

const SM = 'https://www.sciencemuseum.org.uk';
const BLOG = 'https://blog.sciencemuseum.org.uk';
const src = (label, url) => ({ label, url: url.startsWith('http') ? url : SM + url });

const RAW = [
  {
    id: 'energy-hall', title: 'The Energy Hall', zone: 'blue', place: 'Level 0, Energy Hall', minutes: 12, floor: '0', map: [128, 52],
    pic: {"src": "img/energy-hall.jpg", "w": 800, "h": 450, "alt": "The huge red Burnley Mill Engine in the Energy Hall", "caption": "The Burnley Mill Engine: built 1903, at work until 1970.", "credit": "Philafrenzy", "license": "CC BY 2.0", "page": "https://commons.wikimedia.org/wiki/File:1903_Burnley_Ironworks_Corliss_mill_engine_in_the_Science_Museum.jpg"},
    pics: [{"src": "img/energy-hall-eh-old-bess.jpg", "w": 960, "h": 720, "alt": "Old Bess, a tall early beam engine of dark wood and iron", "caption": "Old Bess, also known as Beelzebub.", "credit": "Chris Allen", "license": "CC BY-SA 2.0", "page": "https://commons.wikimedia.org/wiki/File:The_Science_Museum_-_%27Old_Bess%27_-_geograph.org.uk_-_3662133.jpg", "chapter": 4}],
    video: {"title": "How to Run a 120 Year Old Steam Engine", "channel": "Science Museum", "url": "https://www.youtube.com/watch?v=1g0bNpKf1jw"},
    sources: [src('Energy Hall', '/see-and-do/energy-hall'), src('Energy Hall: school information', '/groups/energy-hall-school-info'),
      src('The big tour', `${BLOG}/the-big-tour/`), src('Highlights display', '/objects-and-stories/highlights-display'),
      src('Old Bess (Wikipedia)', 'https://en.wikipedia.org/wiki/Old_Bess_(beam_engine)')],
  },
  {
    id: 'wells-clock', title: 'The Wells Cathedral Clock', zone: 'blue', place: 'Level 0, Making the Modern World', minutes: 8, floor: '0', map: [88, 58],
    pic: {"src": "img/wells-clock.jpg", "w": 800, "h": 1304, "alt": "The iron mechanism of the Wells Cathedral clock", "caption": "The Wells Cathedral clock mechanism: find the iron frame and the wheels.", "credit": "Geni", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Wells_Cathedral_clock_original_mechanism.JPG"},
    notices: [{ kind: 'partial', until: '2028-12-31', text: 'Parts of Making the Modern World are closed while objects are moved for a new gallery, Ages of Invention.' }],
    sources: [src('Making the Modern World', '/see-and-do/making-modern-world'), src('Making the Modern World gallery guide', '/sites/default/files/2025-09/Making-the-Modern-World-gallery-guide.pdf'),
      src('Ages of Invention', '/about-us/press-office/ages-of-invention-serum-institute-donation'), src('Trail inspired by the Odyssey (July 2026)', `${BLOG}/science-museum-trail-inspired-by-the-odyssey/`)],
  },
  {
    id: 'space', title: 'Space', zone: 'blue', place: 'Level 0, West Hall', minutes: 18, floor: '0', map: [30, 56],
    pic: {"src": "img/space-space-side-by-side.jpg", "w": 960, "h": 720, "alt": "The scorched Soyuz capsule in the foreground and the Apollo 10 command module behind it, in the dark Space gallery", "caption": "Apollo 10 and the Soyuz that brought Tim Peake home, side by side.", "credit": "Matt Brown", "license": "CC BY 4.0", "page": "https://commons.wikimedia.org/wiki/File:Soyuz_and_Apollo_side_by_side%2C_Science_Museum_2025-09-18.jpg"},
    pics: [{"src": "img/space-space-apollo10.jpg", "w": 960, "h": 720, "alt": "The Apollo 10 command module, its metal skin streaked and pitted", "caption": "Apollo 10, call sign Charlie Brown. Peer in through the hatch window.", "credit": "Matt Brown", "license": "CC BY 4.0", "page": "https://commons.wikimedia.org/wiki/File:Apollo_10_capsule%2C_Science_Museum_2025-09-18.jpg", "chapter": 1}, {"src": "img/space-space-soyuz.jpg", "w": 750, "h": 1000, "alt": "Close up of the blackened Soyuz TMA-19M capsule and its round hatch window", "caption": "The Soyuz TMA-19M. Walk round it and look at the scorched skin.", "credit": "Mike Peel (www.mikepeel.net)", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:At_the_Science_Museum%2C_London_2025_062.jpg", "chapter": 4}, {"src": "img/space-space-parachute.jpg", "w": 960, "h": 720, "alt": "An orange and white parachute hanging from the gallery ceiling", "caption": "Look up: the Soyuz's parachute, twenty-five metres across.", "credit": "Matt From London", "license": "CC BY 4.0", "page": "https://commons.wikimedia.org/wiki/File:Soyuz_parachutes%2C_Science_Museum_2025-09-18.jpg", "chapter": 6, "look": 1}, {"src": "img/space-space-sharman.jpg", "w": 750, "h": 1000, "alt": "Helen Sharman's white Sokol spacesuit with blue straps and a Union flag on the arm", "caption": "Helen Sharman's Sokol suit, made to measure. Photographed in 2006.", "credit": "Alan Saunders (Kaptain Kobold)", "license": "CC BY 2.0", "page": "https://commons.wikimedia.org/wiki/File:Helen_Sharman%27s_spacesuit.jpg", "chapter": 7, "look": 2}, {"src": "img/space-space-bepi.jpg", "w": 750, "h": 1000, "alt": "The full-size BepiColombo spacecraft model, white and silver, lit blue", "caption": "BepiColombo, a full-size model of the spacecraft bound for Mercury.", "credit": "Matt From London", "license": "CC BY 4.0", "page": "https://commons.wikimedia.org/wiki/File:BeppeColombo%2C_Science_Museum_2025-09-18.jpg", "chapter": 10, "look": 3}],
    video: {"title": "Who was the first Briton in space?", "channel": "Science Museum", "url": "https://www.youtube.com/watch?v=x0-nMl0jf5E"},
    sources: [src('Space gallery', '/see-and-do/space'), src('Space gallery opens (press release)', '/about-us/press-office/space-gallery-opens-science-museum'),
      src('Soyuz descent module', '/soyuz-descent-module'), src('Helen Sharman', '/objects-and-stories/helen-sharman'),
      src('Apollo 10 (Wikipedia)', 'https://en.wikipedia.org/wiki/Apollo_10')],
  },
  {
    id: 'energy-revolution', title: 'Energy Revolution', zone: 'orange', place: 'Level 2, West Hall', minutes: 10, floor: '2', map: [26, 36],
    pic: {"src": "img/energy-revolution-er-gallery.jpg", "w": 960, "h": 723, "alt": "The Energy Revolution gallery, bright and open, with the Only Breath sculpture hanging above", "caption": "The Energy Revolution gallery, with Only Breath hanging above.", "credit": "The wub", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Energy_Revolution_gallery%2C_Science_Museum%2C_London_%282%29.jpg"},
    pics: [{"src": "img/energy-revolution-er-only-breath.jpg", "w": 960, "h": 723, "alt": "Only Breath: a hanging sculpture of copper panels and screens, opened out", "caption": "Only Breath, unfurled. Give it a moment.", "credit": "The wub", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Only_Breath_sculpture_-_Science_Museum%2C_London.jpg", "chapter": 0, "look": 0}, {"src": "img/energy-revolution-er-bersey.jpg", "w": 753, "h": 1000, "alt": "The yellow and black Bersey electric cab of 1897 in a glass case", "caption": "The Bersey electric cab of 1897, London's first electric taxi.", "credit": "The wub", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Bersey_Electrical_Cab_-_Science_Museum%2C_London.jpg", "chapter": 2, "look": 1}],
    sources: [src('Energy Revolution', '/see-and-do/energy-revolution-adani-green-energy-gallery'), src('Introducing Energy Revolution', `${BLOG}/introducing-the-new-energy-revolution-gallery/`),
      src('One million visitors', '/about-us/press-office/science-museum-celebrates-one-million-visitors-energy-revolution-adani-green')],
  },
  {
    id: 'flight', title: 'Flight', zone: 'red', place: 'Level 3, Flight', minutes: 16, floor: '3', map: [62, 24],
    pic: {"src": "img/flight.jpg", "w": 800, "h": 358, "alt": "The Vickers Vimy biplane standing on the floor of the Flight gallery", "caption": "The Vickers Vimy that Alcock and Brown flew across the Atlantic in 1919.", "credit": "Andrew Bone", "license": "CC BY 4.0", "page": "https://commons.wikimedia.org/wiki/File:Vickers_Vimy_(1919)_-_Science_Museum_London_2026-03-30.jpg"},
    video: {"title": "Britain's Greatest Aviation Treasures Revealed at London's Science Museum", "channel": "The Aviation Show", "url": "https://www.youtube.com/watch?v=IyVoFXYyGVw"},
    sources: [src('Flight', '/see-and-do/flight'), src('Refreshed Flight gallery (2024)', `${BLOG}/refreshed-flight-gallery-looks-to-the-skies/`),
      src('The first non-stop transatlantic flight', `${BLOG}/the-first-non-stop-transatlantic-flight/`), src('Wonderful Miss Johnson', `${BLOG}/wonderful-miss-johnson/`),
      src('Spirit of Innovation', `${BLOG}/spirit-of-innovation-the-worlds-fastest-electric-aircraft/`)],
  },
  {
    id: 'clockmakers', title: "The Clockmakers' Museum", zone: 'orange', place: 'Level 2, east end', minutes: 10, floor: '2', map: [134, 30],
    pic: {"src": "img/clockmakers-clk-exhibits.jpg", "w": 960, "h": 720, "alt": "The Clockmakers' Museum: glass cases and a tall longcase clock on a wooden floor", "caption": "The Clockmakers' Museum, inside the Science Museum.", "credit": "Lord Belbury", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Clockmaker%27s_Museum_exhibits.jpg"},
    pics: [{"src": "img/clockmakers-clk-h5.jpg", "w": 907, "h": 1000, "alt": "Harrison's H5: a large silver watch-like timekeeper with a white enamel dial", "caption": "H5, John Harrison's fifth marine timekeeper, finished in 1770.", "credit": "Racklever at English Wikipedia", "license": "CC BY 2.5", "page": "https://commons.wikimedia.org/wiki/File:Harrison%27s_Chronometer_H5_%28cropped%29.JPG", "chapter": 1, "look": 0}, {"src": "img/clockmakers-clk-daniels.jpg", "w": 667, "h": 1000, "alt": "A George Daniels pocket watch with several small dials, on a gold chain", "caption": "A George Daniels pocket watch from the Clockmakers' collection.", "credit": "Andrewrabbott", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:George_Daniels_Grand_Complication_watch.jpg", "chapter": 3}],
    video: {"title": "A Man of Time", "channel": "Roger W. Smith", "url": "https://www.youtube.com/watch?v=_Nsh8llV5dE"},
    sources: [src("The Clockmakers' Museum", '/see-and-do/clockmakers-museum'), src('Happy birthday, George Daniels (2026)', `${BLOG}/happy-birthday-george-daniels/`),
      src("Clockmakers' Museum (Wikipedia)", "https://en.wikipedia.org/wiki/Clockmakers%27_Museum")],
  },
  {
    id: 'science-city', title: 'Science City', zone: 'orange', place: 'Level 2, east end', minutes: 10, floor: '2', map: [120, 38],
    pic: {"src": "img/science-city.jpg", "w": 800, "h": 304, "alt": "Part of King George III's philosophical table", "caption": "Part of King George III's philosophical table, 1761 to 1762.", "credit": "Daderot", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Part_of_King_George_III%27s_philosophical_table,_made_by_George_Adams_the_Elder,_1761-1762_-_Science_Museum,_London_-_DSC05631.jpg"},
    sources: [src('Science City 1550 to 1800', '/see-and-do/science-city-1550-1800-linbury-gallery'), src('Science City opens (press release)', '/about-us/press-office/science-museum-opens-new-gallery-exploring-how-london-revolutionised-science'),
      src('Introducing Science City', `${BLOG}/introducing-science-city-1550-1800-the-linbury-gallery/`)],
  },
  {
    id: 'mathematics', title: 'Mathematics', zone: 'orange', place: 'Level 2, Winton Gallery', minutes: 12, floor: '2', map: [86, 36],
    pic: {"src": "img/mathematics-math-2017.jpg", "w": 960, "h": 720, "alt": "The Mathematics gallery: a small biplane hanging among curving purple-lit shapes", "caption": "Mathematics: The Winton Gallery, with the Gugnunc hanging in the middle.", "credit": "Jordiferrer", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:2017_Science_Museum_%28London%29_15.jpg"},
    pics: [{"src": "img/mathematics-math-enigma-2019.jpg", "w": 703, "h": 1000, "alt": "An Enigma machine with its keyboard and lamps in an open oak case", "caption": "The three-rotor Enigma machine in its oak case.", "credit": "Anthony O'Neil", "license": "CC BY-SA 2.0", "page": "https://commons.wikimedia.org/wiki/File:The_Machine_that_won_the_War%5E_-_geograph.org.uk_-_6217860.jpg", "chapter": 5, "look": 2}],
    video: {"title": "The architects behind Mathematics: The Winton Gallery", "channel": "Science Museum", "url": "https://www.youtube.com/watch?v=xUXKgKZzi9U"},
    sources: [src('Mathematics: The Winton Gallery', '/see-and-do/mathematics-winton-gallery'), src('The Handley Page Gugnunc', '/objects-and-stories/mathematics-and-aviation-handley-page-gugnunc'),
      src('Modelling oceans to predict floods', '/objects-and-stories/modelling-oceans-using-maths-predict-floods'), src('Launching Mathematics', `${BLOG}/by-launching-mathematics-the-winton-gallery-science-museum-soars-to-new-heights/`)],
  },
  {
    id: 'information-age', title: 'Information Age', zone: 'orange', place: 'Level 2, Information Age', minutes: 14, floor: '2', map: [64, 40],
    pic: {"src": "img/information-age-ia-rugby.jpg", "w": 960, "h": 720, "alt": "The Rugby aerial tuning inductor: a huge open frame of wood and copper wire on a round copper base", "caption": "The Rugby coil: six metres of copper and wood, in the middle of Information Age.", "credit": "Mike Peel (www.mikepeel.net)", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:At_the_Science_Museum%2C_London_2025_131.jpg"},
    pics: [{"src": "img/information-age-ia-gallery.jpg", "w": 960, "h": 639, "alt": "Information Age: the Rugby coil in the centre and the Broadcast zone behind it", "caption": "The zones are round the edges; the Rugby coil stands in the middle.", "credit": "Tryrobbo", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Information_Age_Gallery_at_the_Science_Museum_London.jpg", "chapter": 4}, {"src": "img/information-age-ia-baird.jpg", "w": 960, "h": 638, "alt": "Baird's early television apparatus: a black box with a large spinning disc, behind glass", "caption": "John Logie Baird's early television apparatus, in Broadcast.", "credit": "Matt Brown", "license": "CC BY 2.0", "page": "https://commons.wikimedia.org/wiki/File:John_Logie_Baird%27s_first_TV_Science_Museum%2C_London.jpg", "chapter": 5, "look": 2}],
    video: {"title": "The Making of Information Age: Rugby Aerial Tuning Inductor", "channel": "Science Museum", "url": "https://www.youtube.com/watch?v=L3Ux9dKgRi8"},
    sources: [src('Information Age', '/see-and-do/information-age'), src('The Queen sends her first tweet', `${BLOG}/her-majesty-the-queen-sends-her-first-tweet-to-unveil-the-information-age/`),
      src('Rugby Radio Station (Wikipedia)', 'https://en.wikipedia.org/wiki/Rugby_Radio_Station')],
  },
  {
    id: 'medicine', title: 'Medicine', zone: 'green', place: 'Level 1, Wellcome Galleries', minutes: 18, floor: '1', map: [76, 62],
    pic: {"src": "img/medicine-med-penicillin.jpg", "w": 960, "h": 778, "alt": "A small brass box with a round window showing penicillin mould, engraved From Professor Alexander Fleming 1935", "caption": "Fleming's own penicillin mould, 1935. Find it in the penicillin display.", "credit": "Science Museum London / Science and Society Picture Library", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Sample_of_penicillin_mould_presented_by_Alexander_Fleming_to_Douglas_Macleod%2C_1935_%289672239344%29.jpg"},
    video: {"title": "The Curator's Tour of Medicine: The Wellcome Galleries", "channel": "Science Museum", "url": "https://www.youtube.com/watch?v=ZjbU4SO709M"},
    sources: [src('Medicine: The Wellcome Galleries', '/see-and-do/medicine-wellcome-galleries'), src('Medicine galleries (press release)', '/about-us/press-office/medicine-galleries'),
      src('50 years with Wellcome (2026)', `${BLOG}/celebrating-50-years-of-partnership-with-wellcome/`)],
  },
  {
    id: 'engineers', title: 'Engineers and Technicians', zone: 'green', place: 'Level 1, east end', minutes: 12, floor: '1', map: [126, 64],
    sources: [src('Engineers', '/see-and-do/engineers'), src('Engineers opens (press release)', '/about-us/press-office/major-new-gallery-engineers-opens-science-museum'),
      src('Technicians', '/see-and-do/technicians-david-sainsbury-gallery'), src("The world's first gallery for technicians", '/about-us/press-office/worlds-first-gallery-dedicated-technicians-opens-science-museum')],
  },
  {
    id: 'watt-workshop', title: "James Watt's Workshop", zone: 'blue', place: 'Level 0, Energy Hall', minutes: 6, floor: '0', map: [132, 30],
    pic: {"src": "img/watt-workshop-watt.jpg", "w": 960, "h": 720, "alt": "Inside James Watt's workshop: a lathe, shelves of jars and tools, all as he left them", "caption": "Inside James Watt's workshop, left as it was when he died in 1819.", "credit": "Frankie Roberto", "license": "CC BY 3.0", "page": "https://commons.wikimedia.org/wiki/File:James_Watt%27s_Workshop.jpg"},
    video: {"title": "James Watt's workshop: inventing the modern world", "channel": "History West Midlands", "url": "https://www.youtube.com/watch?v=nt3QJT2sPGQ"},
    sources: [src('Energy Hall: James Watt and Our World', '/see-and-do/energy-hall'), src('Museum map, September 2026', '/sites/default/files/2026-09/Museum-Map-September-2026_0.pdf')],
  },
];

export const STOPS = RAW.map((s, i) => ({ ...s, ...STORIES[s.id], n: i + 1 }));

// How long have you got? Each walk is the best of the museum for that time, in walking order.
export const WALKS = {
  hour: { name: '1 Hour', ids: ['energy-hall', 'space', 'flight', 'watt-workshop'] },
  two: { name: '2 Hours', ids: ['energy-hall', 'wells-clock', 'space', 'flight', 'mathematics', 'information-age', 'medicine', 'watt-workshop'] },
  three: { name: '3 Hours', ids: STOPS.map((s) => s.id) },
};
export const WALK_BETWEEN = 3;

// The museum this guide is for, as the app names it.
export const MUSEUM = {
  name: 'Science Museum',
  key: 'sm-walk-',
  floors: ['3', '2', '1', '0', '-1'],
  floorNames: { 3: 'Level 3', 2: 'Level 2', 1: 'Level 1', 0: 'Level 0', '-1': 'Level -1' },
  // A schematic plan from above: Exhibition Road and the entrance on the right (east), the West Hall
  // on the left. Not to scale; the floors picture says which level.
  map: {
    road: { label: 'Exhibition Road', side: 'right' },
    blocks: [
      { cls: 'z-blue', x: 6, y: 10, w: 46, h: 76, label: 'West Hall' },
      { cls: 'z-green', x: 54, y: 10, w: 52, h: 76, label: 'Galleries' },
      { cls: 'z-orange', x: 108, y: 10, w: 40, h: 76, label: 'Entrance' },
    ],
  },
  closedNote: 'The museum is closed today.',
  breakNote: 'Halfway, and about when museum legs start to complain. The Energy Café is on Level 0, and the Shake Bar is on Level 3.',
  doneNote: 'If you have a ticket and any energy left, Wonderlab, upstairs, has real lightning.',
};

// Opening hours (London time). Galleries start to close 30 minutes before the museum.
export const HOURS = {
  open: '10:00', close: '18:00', lastEntry: '17:15', clearing: '17:30',
  closedDays: ['12-24', '12-25', '12-26'],
};
export const TICKETS_URL = 'https://www.sciencemuseum.org.uk/visit';

// Before you go. A point with "until" is shown only up to and including that date.
export const PRACTICAL = [
  { title: 'Opening hours', points: [
    'Every day, 10:00 to 18:00. Last entry 17:15. Galleries start to close at 17:30.',
    'Closed 24 to 26 December.',
  ] },
  { title: 'Tickets', points: [
    'Entry is free, but book a free timed ticket: your arrival slot is printed on it.',
    'Bags may be searched.',
  ] },
  { title: 'When to go', points: ['The museum says it is quieter from mid-afternoon on weekdays in term time.'] },
  { title: 'Toilets', points: [
    'Accessible toilets are on every level. Ask a member of staff, or see the museum map.',
    'The Changing Places toilet is on Level 0, next to the Hans Rausing Lecture Theatre. It opens with a RADAR key, and staff can let you in.',
  ] },
  { title: 'Getting in', points: [
    'Exhibition Road, SW7 2DD. Under-12s must be with an adult aged 18 or over.',
    'Nearest step-free stations: Knightsbridge, 15 to 20 minutes\' walk; Earl\'s Court, 20 to 25.',
  ] },
  { title: 'Bags and coats', points: ['No staffed cloakroom. Card-only lockers on Level -1, by lift A and by lift F: £3 coats, £5 rucksacks, £7 carry-on. Suitcases are not allowed.'] },
  { title: 'Access', points: [
    'No step-free access to the mezzanines of Making the Modern World and Flight.',
    'Wheelchairs, folding stools and ear defenders at the Information Desk in the Energy Hall. Book a manual wheelchair in advance on 033 0058 0058.',
    'If the entrance queue is a barrier, ask a member of staff for priority entry.',
    'Most lifts announce the floor and have Braille on the buttons.',
  ] },
  { title: 'Food', points: [
    'Energy Café, Level 0, 10:00 to 17:30. Space Café, Level 0, weekdays 11:00 to 15:30, weekends 11:00 to 16:00.',
    'Gallery Café, Level 2: closed Monday to Wednesday; Thursday and Friday 11:00 to 14:00; weekends 11:00 to 16:00. Shake Bar, Level 3, 11:00 to 16:00.',
    'Picnics: the Level -1 terrace, seating on Level 2, and Level 3 by the Shake Bar.',
  ] },
  { title: 'Paid, not in free entry', points: [
    'Wonderlab, Level 3: 10:00 to 17:40, from £13.50, ages 7 to 14.',
    'Power Up, Level -1: 10:00 to 17:30, from £10.',
    'IMAX, Level 0, West Hall: from £11.',
  ] },
  { title: 'Also on in November 2026', points: [
    'Becoming America: How Science Shaped a Nation, Level 2: free, but ticketed.',
    { text: 'The Pokémon Space Trail, until 3 January 2027.', until: '2027-01-03' },
  ] },
];
