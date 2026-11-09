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
    id: 'building', title: 'The Building', zone: 'outside', place: 'Outside, Cromwell Road', minutes: 5, floor: 'out',
    sources: [
      src('Alfred Waterhouse and the museum building', '/discover/alfred-waterhouse-museum-building-cathedral-to-nature.html'),
      src('Museum architecture (Library and Archives)', '/our-science/services/library/collections/museum-architecture.html'),
      src('A history of the museum grounds', '/about-us/a-history-of-the-museum-grounds-and-wildlife-garden.html'),
      src('The Fall of Man and the Foundations of Science (Cambridge University Press): the Adam statue', 'https://www.cambridge.org/core/books/fall-of-man-and-the-foundations-of-science/conclusion/72833DBBF0184E331FEF1BB30B8AA5D5'),
    ],
  },
  {
    id: 'hope', title: 'Hope, the Blue Whale', zone: 'green', place: 'Green zone, Hintze Hall, ground floor', minutes: 10, floor: 'G',
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
    id: 'dinosaurs', title: 'Dinosaurs', zone: 'blue', place: 'Blue zone, ground floor', minutes: 25, floor: 'G',
    sources: [
      src('Dinosaurs gallery', '/visit/galleries-and-museum-map/dinosaurs.html'),
      src('Dinosaur collections', '/our-science/services/collections/palaeontology/dinosaurs.html'),
      src('Visual guide (busy galleries)', '/visit/visual-guide.html'),
      src('Family favourites self-guided tour (the T. rex)', '/visit/family-favourites-self-guided-tour.html'),
    ],
  },
  {
    id: 'mammals', title: 'The Blue Whale Model', zone: 'blue', place: 'Blue zone, Mammals Hall, ground floor', minutes: 10, floor: 'G',
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
    id: 'darwin', title: 'Darwin on the Stairs', zone: 'green', place: 'Green zone, the main staircase', minutes: 5, floor: 'G',
    sources: [
      src('Museum highlights: Charles Darwin', '/discover/museum-highlights-charles-darwin.html'),
      src('Darwin Correspondence Project: the Boehm statue', 'https://darwinproject.ac.uk/about-darwin/portraits-charles-darwin-catalogue/213-edgar-boehm-statue-nhm'),
      src('Who was Alfred Russel Wallace?', '/discover/who-was-alfred-russel-wallace.html'),
      src('Sandwalk, 2009: moving Darwin', 'https://sandwalk.blogspot.com/2009/02/moving-darwin.html'),
    ],
  },
  {
    id: 'treasures', title: 'Treasures', zone: 'green', place: 'Green zone, first floor', minutes: 15, floor: '1',
    sources: [
      src('Highlights of the Treasures gallery', '/discover/highlights-of-the-treasures-gallery.html'),
      src('Treasures in the Cadogan Gallery', '/visit/galleries-and-museum-map/treasures-in-the-cadogan-gallery.html'),
    ],
  },
  {
    id: 'vault', title: 'Minerals and the Vault', zone: 'green', place: 'Green zone, first floor', minutes: 20, floor: '1',
    sources: [
      src('Minerals gallery', '/visit/galleries-and-museum-map/minerals.html'),
      src('The Vault', '/visit/galleries-and-museum-map/the-vault.html'),
      src('How do coloured diamonds form?', '/discover/how-do-coloured-diamonds-form.html'),
      src('Mars and Moon meteorites', '/discover/space-highlights-mars-moon-meteorites.html'),
      src('Weird objects in the museum (the amethyst)', '/visit/weird-objects-in-the-museum.html'),
    ],
  },
  {
    id: 'sequoia', title: 'The Giant Sequoia', zone: 'green', place: 'Green zone, Hintze Hall, second floor', minutes: 10, floor: '2',
    sources: [
      src('The giant sequoia slice', '/discover/giant-sequoia-slice.html'),
      src('Hidden treasures above your head (the ceiling)', '/discover/hidden-treasures-above-heads.html'),
      src('Alfred Waterhouse and the museum building', '/discover/alfred-waterhouse-museum-building-cathedral-to-nature.html'),
      src("nhm.ac.uk: anning rooms", "https://www.nhm.ac.uk/visit/galleries-and-museum-map/anning-rooms.html"),
    ],
  },
  {
    id: 'nature-and-us', title: 'Nature and Us', zone: 'green', place: 'Green zone, second floor, new in 2026', minutes: 12, floor: '2',
    sources: [
      src('Nature and Us opens to the public (press release)', '/press-office/the-natural-history-museum-opens-nature-and-us-to-the-public-tom.html'),
      src('Nature and Us: visual guide and directions', '/visit/galleries-and-museum-map/nature-and-us/visual-guide-for-the-nature-and-us-gallery.html'),
      src('Smithsonian: the gallery closed since 1943 reopens', 'https://www.smithsonianmag.com/smart-news/closed-to-public-since-wwii-hidden-gallery-at-london-natural-history-museum-opens-doors-once-again-180989380/'),
    ],
  },
  {
    id: 'marine-reptiles', title: 'Mary Anning\'s Sea Dragons', zone: 'green', place: 'Green zone, Fossil Marine Reptiles, ground floor', minutes: 12, floor: 'G',
    sources: [
      src('Mary Anning\'s fossils', '/discover/mary-anning-fossils.html'),
      src('Mary Anning: the unsung hero', '/discover/mary-anning-unsung-hero.html'),
      src('Fossil Marine Reptiles gallery', '/visit/galleries-and-museum-map/fossil-marine-reptiles.html'),
    ],
  },
  {
    id: 'human-evolution', title: 'Human Evolution', zone: 'red', place: 'Red zone, East Wing, ground floor', minutes: 12, floor: 'G',
    sources: [
      src('Human Evolution gallery', '/visit/galleries-and-museum-map/human-evolution.html'),
      src('The first adult Neanderthal skull', '/discover/first-adult-neanderthal-skull.html'),
      src('Cheddar Man', '/discover/cheddar-man-mesolithic-britain-blue-eyed-boy.html'),
      src('Bringing a Neanderthal to life', '/discover/bringing-a-neanderthal-to-life-the-making-of-our-model.html'),
    ],
  },
  {
    id: 'sophie', title: 'Sophie the Stegosaurus', zone: 'red', place: 'Red zone, Earth Hall, ground floor', minutes: 8, floor: 'G',
    sources: [
      src('Earth Hall and Sophie the Stegosaurus', '/visit/galleries-and-museum-map/earth-hall-and-stegosaurus.html'),
      src('Stegosaurus brought to life', '/discover/stegosaurus-brought-to-life.html'),
      src('Visual guide (the escalator)', '/visit/visual-guide.html'),
      src('Sophie weighed about 1.6 tonnes (the museum\'s 2015 study)', 'https://blog.everythingdinosaur.com/blog/_archives/2015/03/04/sophie-the-stegosaurus-at-1-6-tonnes.html'),
    ],
  },
  {
    id: 'kobe', title: 'The Earthquake Room', zone: 'red', place: 'Red zone, Volcanoes and Earthquakes, second floor', minutes: 15, floor: '2',
    sources: [
      src('Volcanoes and Earthquakes gallery', '/visit/galleries-and-museum-map/volcanoes-and-earthquakes.html'),
      src('Exhibits with impact: self-guided tour (the Kobe simulator)', '/visit/exhibits-impact-adults-self-guided-tour.html'),
      src('Britannica: the Kobe earthquake of 1995', 'https://www.britannica.com/event/Kobe-earthquake-of-1995'),
      src("nhm.ac.uk: family favourites self guided tour", "https://www.nhm.ac.uk/visit/family-favourites-self-guided-tour.html"),
    ],
  },
  {
    id: 'fern', title: 'Fern, the Bronze Dinosaur', zone: 'outside', place: 'Outside, the Evolution Garden', minutes: 10, floor: 'out',
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
