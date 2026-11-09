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
    sources: [src('Space gallery', '/see-and-do/space'), src('Space gallery opens (press release)', '/about-us/press-office/space-gallery-opens-science-museum'),
      src('Soyuz descent module', '/soyuz-descent-module'), src('Helen Sharman', '/objects-and-stories/helen-sharman'),
      src('Apollo 10 (Wikipedia)', 'https://en.wikipedia.org/wiki/Apollo_10')],
  },
  {
    id: 'energy-revolution', title: 'Energy Revolution', zone: 'orange', place: 'Level 2, West Hall', minutes: 10, floor: '2', map: [26, 36],
    sources: [src('Energy Revolution', '/see-and-do/energy-revolution-adani-green-energy-gallery'), src('Introducing Energy Revolution', `${BLOG}/introducing-the-new-energy-revolution-gallery/`),
      src('One million visitors', '/about-us/press-office/science-museum-celebrates-one-million-visitors-energy-revolution-adani-green')],
  },
  {
    id: 'flight', title: 'Flight', zone: 'red', place: 'Level 3, Flight', minutes: 16, floor: '3', map: [40, 24],
    pic: {"src": "img/flight.jpg", "w": 800, "h": 358, "alt": "The Vickers Vimy biplane hanging in Flight", "caption": "The Vickers Vimy that Alcock and Brown flew across the Atlantic in 1919.", "credit": "Andrew Bone", "license": "CC BY 4.0", "page": "https://commons.wikimedia.org/wiki/File:Vickers_Vimy_(1919)_-_Science_Museum_London_2026-03-30.jpg"},
    sources: [src('Flight', '/see-and-do/flight'), src('Refreshed Flight gallery (2024)', `${BLOG}/refreshed-flight-gallery-looks-to-the-skies/`),
      src('The first non-stop transatlantic flight', `${BLOG}/the-first-non-stop-transatlantic-flight/`), src('Wonderful Miss Johnson', `${BLOG}/wonderful-miss-johnson/`),
      src('Spirit of Innovation', `${BLOG}/spirit-of-innovation-the-worlds-fastest-electric-aircraft/`)],
  },
  {
    id: 'clockmakers', title: "The Clockmakers' Museum", zone: 'orange', place: 'Level 2, east end', minutes: 10, floor: '2', map: [134, 30],
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
    sources: [src('Mathematics: The Winton Gallery', '/see-and-do/mathematics-winton-gallery'), src('The Handley Page Gugnunc', '/objects-and-stories/mathematics-and-aviation-handley-page-gugnunc'),
      src('Modelling oceans to predict floods', '/objects-and-stories/modelling-oceans-using-maths-predict-floods'), src('Launching Mathematics', `${BLOG}/by-launching-mathematics-the-winton-gallery-science-museum-soars-to-new-heights/`)],
  },
  {
    id: 'information-age', title: 'Information Age', zone: 'orange', place: 'Level 2, Information Age', minutes: 14, floor: '2', map: [64, 40],
    sources: [src('Information Age', '/see-and-do/information-age'), src('The Queen sends her first tweet', `${BLOG}/her-majesty-the-queen-sends-her-first-tweet-to-unveil-the-information-age/`),
      src('Rugby Radio Station (Wikipedia)', 'https://en.wikipedia.org/wiki/Rugby_Radio_Station')],
  },
  {
    id: 'medicine', title: 'Medicine', zone: 'green', place: 'Level 1, Wellcome Galleries', minutes: 18, floor: '1', map: [76, 62],
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
  doneNote: 'Every stop seen. Wonderlab, upstairs, has real lightning, if you have a ticket and any energy left.',
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
  { title: 'Getting in', points: [
    'Exhibition Road, SW7 2DD. Under-12s must be with an adult aged 18 or over.',
    'Nearest step-free stations: Knightsbridge, 15 to 20 minutes\' walk; Earl\'s Court, 20 to 25.',
  ] },
  { title: 'Bags and coats', points: ['No staffed cloakroom. Card-only lockers on Level -1, by lift A and by lift F: £3 coats, £5 rucksacks, £7 carry-on. Suitcases are not allowed.'] },
  { title: 'Access', points: [
    'No step-free access to the mezzanines of Making the Modern World and Flight.',
    'Wheelchairs, folding stools and ear defenders at the Information Desk in the Energy Hall. Changing Places toilet on Level 0, next to the Hans Rausing Lecture Theatre.',
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
