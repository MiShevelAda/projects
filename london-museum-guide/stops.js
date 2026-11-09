// The walk: every stop, its words, and where each fact comes from. The text guide and the recordings
// are both made from this file (tools/build-audio.mjs), so they can never disagree.
//
// Facts were checked on 9 November 2026 against the museum's own pages and the other sources listed
// with each stop. Nothing is narrated that the museum's pages call folklore (the "Darwin monkeys",
// the Nakhla dog); the amethyst's curse is told as the legend the museum itself doubts.
// Writing for the ear: short sentences next to long ones, one thing to look at at a time, and room
// to look. No em dashes.

import { STORIES } from './stories.js';

export const CHECKED = '9 November 2026';

const NHM = 'https://www.nhm.ac.uk';
const src = (label, path) => ({ label, url: path.startsWith('http') ? path : NHM + path });

const RAW = [
  {
    id: 'building', title: 'The Building', zone: 'outside', place: 'Outside, Cromwell Road', minutes: 5, floor: 'out', map: [80, 80],
    // A photo of the easiest thing to miss, freely licensed on Wikimedia Commons, with its credit.
    pic: {"src": "img/building.jpg", "w": 800, "h": 534, "alt": "The terracotta front of the museum, looking up at the main entrance", "caption": "Look up at the main entrance: every surface is terracotta.", "credit": "Txllxt TxllxT", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:London_-_Cromwell_Road_-_Natural_History_Museum_1881_by_Alfred_Waterhouse_-_View_Up_at_the_Entrance_on_the_Terracotta_Tiled_Fa%C3%A7ade_II.jpg"},
    sources: [
      src('Alfred Waterhouse and the museum building', '/discover/alfred-waterhouse-museum-building-cathedral-to-nature.html'),
      src('Museum architecture (Library and Archives)', '/our-science/services/library/collections/museum-architecture.html'),
      src('A history of the museum grounds', '/about-us/a-history-of-the-museum-grounds-and-wildlife-garden.html'),
      src('The Fall of Man and the Foundations of Science (Cambridge University Press): the Adam statue', 'https://www.cambridge.org/core/books/fall-of-man-and-the-foundations-of-science/conclusion/72833DBBF0184E331FEF1BB30B8AA5D5'),
    ],
  },
  {
    id: 'hope', title: 'Hope, the Blue Whale', zone: 'green', place: 'Green zone, Hintze Hall, ground floor', minutes: 15, floor: 'G', map: [80, 44],
    pic: {"src": "img/hope-andyli1.jpg", "w": 800, "h": 602, "alt": "The blue whale skeleton Hope diving from the roof of Hintze Hall, seen from below among the stone arches and the iron-and-glass roof", "caption": "Look up: Hope dives the length of the hall above you.", "credit": "Andy Li", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Blue_whale_skeleton_at_the_Central_Hall_of_the_Natural_History_Museum_2026-09-03_%281%29.jpg"},
    pics: [{"src": "img/hope-head-below.jpg", "w": 750, "h": 1000, "alt": "Looking straight up at the whale's head: the two long curved bones of the lower jaw against the painted ceiling and roof windows", "caption": "Stand under her jaw: two great curved bones, still more than four metres up.", "credit": "Iridescent", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Hintze_Hall_ceiling_through_whale_head.jpg", "chapter": 7, "look": 0}, {"src": "img/hope-ribs-below.jpg", "w": 750, "h": 1000, "alt": "Looking straight up along the whale's spine and ribs, with the flippers spread out, against the iron roof trusses and glass", "caption": "Follow her spine up and along: the top of her back is thirteen and a half metres up.", "credit": "Iridescent", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Hintze_Hall_ceiling_through_whale_ribs.jpg", "look": 1}, {"src": "img/hope-hodnett05.jpg", "w": 667, "h": 1000, "alt": "The whale skeleton seen from beneath its head, hanging on thin cables from the iron roof trusses, with the arched windows at the end of the hall", "caption": "Find the thin cables: she hangs from Waterhouse's original iron roof.", "credit": "Ryan Hodnett", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Blue_Whale_%28Balaenoptera_musculus%29_%28Central_Hall%2C_Natural_History_Museum%29_-_London%2C_England_2023-10-30_%2805%29.jpg", "chapter": 6}, {"src": "img/hope-whole.jpg", "w": 800, "h": 762, "alt": "Looking down the length of Hintze Hall from high up: the whale skeleton above the floor, visitors walking below, arches on both sides", "caption": "From the top balcony you see her whole length, and the ceiling up close.", "credit": "Daniel Lu (User:dllu)", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Blue_whale_skeleton_Hope_Hintze_Hall_Natural_History_Museum_London_2025_dllu.jpg", "chapter": 5}, {"src": "img/hope-mastodon.jpg", "w": 800, "h": 752, "alt": "The brown skeleton of an American mastodon, long curved tusks forward, standing on a white plinth in front of the patterned terracotta wall of a bay", "caption": "In a bay off the hall: the mastodon, with the tusks Owen put right.", "credit": "Ricardalovesmonuments", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Natural_Hist_Museum_London_American_Mastodon.jpg", "chapter": 10, "look": 2}, {"src": "img/hope-ceiling-panel.jpg", "w": 762, "h": 1000, "alt": "One painted ceiling panel: a flowering branch with grey-blue leaves on a pale background, above a red label reading Melanorrhoea usitata", "caption": "Every ceiling panel is a different plant, named on a red label; this one is the Burmese lacquer tree.", "credit": "Iridescent", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Hintze_Hall_ceiling%E2%80%94Melanorrh%C5%93a_usitata.jpg", "chapter": 13, "look": 3}, {"src": "img/hope-hope.jpg", "w": 800, "h": 534, "alt": "A large slice of the Imilac meteorite, metal studded with crystals", "caption": "The Imilac meteorite: metal and green olivine crystals, about 4.5 billion years old.", "credit": "Peter Taylor", "license": "CC BY 2.0", "page": "https://commons.wikimedia.org/wiki/File:Imilac_Meteorite_-_Natural_History_Museum_London.jpg", "chapter": 12}],
    video: {"title": "How do we move a blue whale skeleton?", "channel": "Natural History Museum", "url": "https://www.youtube.com/watch?v=NekXGq25lrk"},
    // A photo of the easiest thing to miss, freely licensed on Wikimedia Commons, with its credit.
    sources: [
      src('Museum unveils Hope the blue whale (2017)', '/discover/news/2017/july/museum-unveils-hope-the-blue-whale-skeleton.html'),
      src('Hope the blue whale: history', '/discover/hope-the-blue-whale-history.html'),
      src('The secret history of Hope', '/discover/news/2018/september/secret-history-of-hope-the-blue-whale-finally-revealed.html'),
      src('The Imilac meteorite', '/discover/imilac-meteorite-gem-as-old-solar-system.html'),
      src('The making of an American mastodon', '/discover/the-making-of-an-american-mastodon.html'),
      src("nhm.ac.uk: 3d scanning mantellisaurus", "https://www.nhm.ac.uk/discover/news/2019/august/3d-scanning-mantellisaurus.html"),
    ],
  },
  {
    id: 'dinosaurs', title: 'Dinosaurs', zone: 'blue', place: 'Blue zone, ground floor', minutes: 25, floor: 'G', map: [32, 44],
    video: {"title": "How to reconstruct a dinosaur", "channel": "Natural History Museum", "url": "https://www.youtube.com/watch?v=O9ihuO2F2rE"},
    // A photo of the easiest thing to miss, freely licensed on Wikimedia Commons, with its credit.
    pic: {"src": "img/dinosaurs.jpg", "w": 800, "h": 534, "alt": "The Triceratops skull in the Dinosaurs gallery", "caption": "The Triceratops skull: find the frill and the three horns.", "credit": "Gary Todd from Xinzheng, China", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Triceratops_Skull_(36094064740).jpg"},
    sources: [
      src('Dinosaurs gallery', '/visit/galleries-and-museum-map/dinosaurs.html'),
      src('Dinosaur collections', '/our-science/services/collections/palaeontology/dinosaurs.html'),
      src('Visual guide (busy galleries)', '/visit/visual-guide.html'),
      src('Family favourites self-guided tour (the T. rex)', '/visit/family-favourites-self-guided-tour.html'),
    ],
  },
  {
    id: 'mammals', title: 'The Blue Whale Model', zone: 'blue', place: 'Blue zone, Mammals Hall, ground floor', minutes: 12, floor: 'G', map: [32, 26],
    pics: [{"src": "img/mammals-whale-model.jpg", "w": 750, "h": 1000, "alt": "The head of the grey blue whale model seen from above, its long mouth line and pleated throat, with other mammals on the balcony behind", "caption": "Walk to the head: the mouth line, the throat pleats, and the blowhole on top.", "credit": "Fernando Losada Rodríguez", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Balaenoptera_musculus.001_-_Natural_History_Museum_of_London.JPG", "chapter": 6}],
    // Closed from..until: the walk skips the stop on those days. The notice shows from today until then.
    notice: { text: 'The museum lists the Mammals Hall as closed from Tuesday 10 to Thursday 12 November. The lift to its balcony is out of service.', from: '2026-11-10', until: '2026-11-12' },
    sources: [
      src('Mammals and the blue whale model', '/visit/galleries-and-museum-map/mammals-and-blue-whale.html'),
      src('The history of Hintze Hall', '/discover/museum-history-hintze-hall.html'),
      src('Scientific American: the blue whale model at 75', 'https://www.scientificamerican.com/blog/tetrapod-zoology/after-75-years-6-ton-blue-whale-model-still-excites-london-museum/'),
      src('Hope (whale): taken down in 2015, rehung in 2017', 'https://en.wikipedia.org/wiki/Hope_(whale)'),
    ],
  },
  {
    id: 'darwin', title: 'Darwin on the Stairs', zone: 'green', place: 'Green zone, the main staircase', minutes: 5, floor: 'G', map: [80, 26],
    // A photo of the easiest thing to miss, freely licensed on Wikimedia Commons, with its credit.
    pic: {"src": "img/darwin.jpg", "w": 800, "h": 1024, "alt": "The seated statue of Charles Darwin on the main staircase", "caption": "Darwin, seated on the main staircase.", "credit": "APK", "license": "CC BY 4.0", "page": "https://commons.wikimedia.org/wiki/File:Statue_of_Charles_Darwin_in_the_Natural_History_Museum,_London.jpg"},
    sources: [
      src('Museum highlights: Charles Darwin', '/discover/museum-highlights-charles-darwin.html'),
      src('Darwin Correspondence Project: the Boehm statue', 'https://darwinproject.ac.uk/about-darwin/portraits-charles-darwin-catalogue/213-edgar-boehm-statue-nhm'),
      src('Who was Alfred Russel Wallace?', '/discover/who-was-alfred-russel-wallace.html'),
      src('Sandwalk, 2009: moving Darwin', 'https://sandwalk.blogspot.com/2009/02/moving-darwin.html'),
    ],
  },
  {
    id: 'treasures', title: 'Treasures', zone: 'green', place: 'Green zone, first floor', minutes: 15, floor: '1', map: [80, 34],
    sources: [
      src('Highlights of the Treasures gallery', '/discover/highlights-of-the-treasures-gallery.html'),
      src('Treasures in the Cadogan Gallery', '/visit/galleries-and-museum-map/treasures-in-the-cadogan-gallery.html'),
    ],
  },
  {
    id: 'vault', title: 'Minerals and the Vault', zone: 'green', place: 'Green zone, first floor', minutes: 20, floor: '1', map: [96, 30],
    video: {"title": "The Museum's cursed amethyst", "channel": "Natural History Museum", "url": "https://www.youtube.com/watch?v=Yp1q3GqlBfQ"},
    sources: [
      src('Minerals gallery', '/visit/galleries-and-museum-map/minerals.html'),
      src('The Vault', '/visit/galleries-and-museum-map/the-vault.html'),
      src('How do coloured diamonds form?', '/discover/how-do-coloured-diamonds-form.html'),
      src('Mars and Moon meteorites', '/discover/space-highlights-mars-moon-meteorites.html'),
      src('Weird objects in the museum (the amethyst)', '/visit/weird-objects-in-the-museum.html'),
    ],
  },
  {
    id: 'sequoia', title: 'The Giant Sequoia', zone: 'green', place: 'Green zone, Hintze Hall, second floor', minutes: 10, floor: '2', map: [80, 22],
    video: {"title": "Conserving the Giant Sequoia at the Natural History Museum", "channel": "Natural Sciences Collections Association", "url": "https://www.youtube.com/watch?v=UIpZNfjWzok"},
    sources: [
      src('The giant sequoia slice', '/discover/giant-sequoia-slice.html'),
      src('Hidden treasures above your head (the ceiling)', '/discover/hidden-treasures-above-heads.html'),
      src('Alfred Waterhouse and the museum building', '/discover/alfred-waterhouse-museum-building-cathedral-to-nature.html'),
      src("nhm.ac.uk: anning rooms", "https://www.nhm.ac.uk/visit/galleries-and-museum-map/anning-rooms.html"),
      src("nhm.ac.uk: galleries and museum map", "https://www.nhm.ac.uk/visit/galleries-and-museum-map.html"),
    ],
  },
  {
    id: 'nature-and-us', title: 'Nature and Us', zone: 'green', place: 'Green zone, second floor, new in 2026', minutes: 12, floor: '2', map: [92, 26],
    sources: [
      src('Nature and Us opens to the public (press release)', '/press-office/the-natural-history-museum-opens-nature-and-us-to-the-public-tom.html'),
      src('Nature and Us: visual guide and directions', '/visit/galleries-and-museum-map/nature-and-us/visual-guide-for-the-nature-and-us-gallery.html'),
      src('Smithsonian: the gallery closed since 1943 reopens', 'https://www.smithsonianmag.com/smart-news/closed-to-public-since-wwii-hidden-gallery-at-london-natural-history-museum-opens-doors-once-again-180989380/'),
    ],
  },
  {
    id: 'marine-reptiles', title: 'Mary Anning\'s Sea Dragons', zone: 'green', place: 'Green zone, Fossil Marine Reptiles, ground floor', minutes: 12, floor: 'G', map: [98, 48],
    video: {"title": "Mary Anning's First Ichthyosaur", "channel": "Jurassic Coast Trust", "url": "https://www.youtube.com/watch?v=PZfkkwFQi8M"},
    sources: [
      src('Mary Anning\'s fossils', '/discover/mary-anning-fossils.html'),
      src('Mary Anning: the unsung hero', '/discover/mary-anning-unsung-hero.html'),
      src('Fossil Marine Reptiles gallery', '/visit/galleries-and-museum-map/fossil-marine-reptiles.html'),
    ],
  },
  {
    id: 'human-evolution', title: 'Human Evolution', zone: 'red', place: 'Red zone, East Wing, ground floor', minutes: 12, floor: 'G', map: [124, 44],
    video: {"title": "Who was Cheddar Man?", "channel": "Natural History Museum", "url": "https://www.youtube.com/watch?v=TQ8dc0XhUMM"},
    sources: [
      src('Human Evolution gallery', '/visit/galleries-and-museum-map/human-evolution.html'),
      src('The first adult Neanderthal skull', '/discover/first-adult-neanderthal-skull.html'),
      src('Cheddar Man', '/discover/cheddar-man-mesolithic-britain-blue-eyed-boy.html'),
      src('Bringing a Neanderthal to life', '/discover/bringing-a-neanderthal-to-life-the-making-of-our-model.html'),
    ],
  },
  {
    id: 'sophie', title: 'Sophie the Stegosaurus', zone: 'red', place: 'Red zone, Earth Hall, ground floor', minutes: 8, floor: 'G', map: [130, 34],
    video: {"title": "Assembling the most complete Stegosaurus in the world", "channel": "Natural History Museum", "url": "https://www.youtube.com/watch?v=vQx9HfUlHi8"},
    sources: [
      src('Earth Hall and Sophie the Stegosaurus', '/visit/galleries-and-museum-map/earth-hall-and-stegosaurus.html'),
      src('Stegosaurus brought to life', '/discover/stegosaurus-brought-to-life.html'),
      src('Visual guide (the escalator)', '/visit/visual-guide.html'),
      src('Sophie weighed about 1.6 tonnes (the museum\'s 2015 study)', 'https://blog.everythingdinosaur.com/blog/_archives/2015/03/04/sophie-the-stegosaurus-at-1-6-tonnes.html'),
    ],
  },
  {
    id: 'kobe', title: 'The Earthquake Room', zone: 'red', place: 'Red zone, Volcanoes and Earthquakes, second floor', minutes: 15, floor: '2', map: [136, 24],
    sources: [
      src('Volcanoes and Earthquakes gallery', '/visit/galleries-and-museum-map/volcanoes-and-earthquakes.html'),
      src('Exhibits with impact: self-guided tour (the Kobe simulator)', '/visit/exhibits-impact-adults-self-guided-tour.html'),
      src('Britannica: the Kobe earthquake of 1995', 'https://www.britannica.com/event/Kobe-earthquake-of-1995'),
      src("nhm.ac.uk: family favourites self guided tour", "https://www.nhm.ac.uk/visit/family-favourites-self-guided-tour.html"),
    ],
  },
  {
    id: 'fern', title: 'Fern, the Bronze Dinosaur', zone: 'outside', place: 'Outside, the Evolution Garden', minutes: 10, floor: 'out', map: [130, 80],
    video: {"title": "Creating a bronze dinosaur for the Natural History Museum gardens", "channel": "Natural History Museum", "url": "https://www.youtube.com/watch?v=V7XbR0pEY1Y"},
    sources: [
      src('Our gardens', '/visit/galleries-and-museum-map/our-gardens.html'),
      src('Fern, the museum\'s newest dinosaur (press release)', '/press-office/press-releases/ferntastic--natural-history-museum-reveals-latest-dinosaur-resid.html'),
      src('The making of Fern the Diplodocus', '/discover/the-making-of-fern-the-diplodocus-engineering-meets-natural-history.html'),
      src('Evolution Garden audio guide transcript', '/visit/galleries-and-museum-map/our-gardens/audio-guide-transcript-for-the-evolution-garden.html'),
      src('Ingenia: the upside-down neck vertebra', 'https://ingenia.org.uk/articles/bringing-prehistory-to-life/'),
      src("nhm.ac.uk: five million visitors to gardens in first year", "https://www.nhm.ac.uk/press-office/press-releases/five-million-visitors-to-gardens-in-first-year.html"),
    ],
  },
];

export const STOPS = RAW.map((s, i) => ({ ...s, ...STORIES[s.id], n: i + 1 }));

// How long have you got? Each walk is the best of the museum for that time, in walking order.
export const WALKS = {
  hour: { name: '1 Hour', ids: ['building', 'hope', 'dinosaurs', 'darwin', 'sequoia'] },
  two: { name: '2 Hours', ids: ['building', 'hope', 'dinosaurs', 'darwin', 'vault', 'sequoia', 'sophie', 'kobe', 'fern'] },
  three: { name: '3 Hours', ids: STOPS.map((s) => s.id) },
};
// Minutes to walk from one stop to the next, on average, for the time estimates.
export const WALK_BETWEEN = 3;

// The museum this guide is for, as the app names it.
export const MUSEUM = {
  name: 'Natural History Museum',
  // Prefix for saved settings and caches: every app on the origin has its own.
  key: 'nhm-walk-',
  // Floors top to bottom as the stop pictures show them, and their names.
  floors: ['2', '1', 'G', 'out'],
  floorShort: { out: 'Out' },
  floorNames: { out: 'Outside', G: 'Ground floor', 1: 'First floor', 2: 'Second floor' },
  // A schematic plan from above, north up, Cromwell Road at the bottom; the zones as the museum colours
  // them. Not to scale. Each stop's map: [x, y] puts its dot on it (160 x 100).
  map: {
    road: { label: 'Cromwell Road', side: 'bottom' },
    blocks: [
      { cls: 'z-orange', x: 8, y: 4, w: 40, h: 14 }, { cls: 'z-blue', x: 8, y: 20, w: 48, h: 48 },
      { cls: 'z-green', x: 58, y: 12, w: 52, h: 56 }, { cls: 'z-red', x: 112, y: 8, w: 40, h: 60 },
      { cls: 'garden', x: 8, y: 72, w: 44, h: 12 }, { cls: 'garden', x: 108, y: 72, w: 44, h: 12 },
    ],
  },
  closedNote: 'The museum is closed 24 to 26 December.',
  doneNote: 'Every stop seen. The garden path around Fern walks you through 540 million years, if you have the legs for it.',
};

// Opening hours (London time). Galleries start clearing around 17:30.
export const HOURS = { open: '10:00', close: '17:50', lastEntry: '17:30', clearing: '17:30', closedDays: ['12-24', '12-25', '12-26'] };
export const TICKETS_URL = 'https://www.nhm.ac.uk/visit.html';

// Before you go. A point with "until" is shown only up to and including that date.
export const PRACTICAL = [
  { title: 'Opening hours', points: [
    'Every day, 10:00 to 17:50. Last entry at 17:30.',
    'Closed 24 to 26 December.',
    'Staff may start clearing the galleries about 20 minutes before closing.',
  ] },
  { title: 'Tickets', points: [
    'Entry is free. Book a free timed ticket on the museum\'s website: without one, you get in only if there is room.',
    'On busy days, arrive 20 minutes before your slot.',
    'Bags may be searched at every entrance.',
  ] },
  { title: 'When to go', points: [
    'The museum says weekday afternoons are quietest, and mornings and weekends busiest.',
    'Dinosaurs is one of the busiest galleries and can have a queue. This walk takes it early.',
  ] },
  { title: 'Entrances', points: [
    'Cromwell Road: the main entrance, into Hintze Hall. The walk starts here.',
    'Step-free: the East Gate, on the corner of Cromwell Road and Exhibition Road, has a ramp. It is wide but steep.',
    'Exhibition Road: into Earth Hall. It is sometimes closed at busy times.',
    'Queen\'s Gate, on the west side: step-free, open until 17:00.',
  ] },
  { title: 'Closed or different right now', points: [
    { text: 'Mammals Hall: listed by the museum as closed Tuesday 10 to Thursday 12 November. The walk skips it on those days.', until: '2026-11-12' },
    'Creepy Crawlies is closed. A new family gallery opens there in autumn 2027.',
    'The Darwin Centre Cocoon can close at short notice.',
    'Archie the giant squid can only be seen on a paid Spirit Collection tour.',
    'Dippy, the plaster Diplodocus, is away from London. His bronze copy, Fern, ends this walk.',
  ] },
  { title: 'Food and coats', points: [
    'Central Cafe, behind Hintze Hall. T. rex Restaurant, by Fossil Marine Reptiles, from 11:00. Earth Hall Cafe, by the Exhibition Road entrance.',
    'Coats go to the cloakroom at the Exhibition Road entrance. The one at Cromwell Road takes only large bags and suitcases.',
  ] },
  { title: 'Paid exhibitions now on', points: [
    { text: 'Jurassic Oceans: Monsters of the Deep, until 3 January 2027.', until: '2027-01-03' },
    { text: 'Wildlife Photographer of the Year, until 11 July 2027.', until: '2027-07-11' },
  ] },
];
