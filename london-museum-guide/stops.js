// The walk: every stop, its words, and where each fact comes from. The text guide and the recordings
// are both made from this file (tools/build-audio.mjs), so they can never disagree.
//
// Facts were checked on 9 November 2026 against the museum's own pages and the other sources listed
// with each stop. Nothing is narrated that the museum's pages call folklore (the "Darwin monkeys",
// the Nakhla dog); the amethyst's curse is told as the legend the museum itself doubts.
// Writing for the ear: short sentences next to long ones, one thing to look at at a time, and room
// to look. No em dashes.

export const CHECKED = '9 November 2026';

const NHM = 'https://www.nhm.ac.uk';
const src = (label, path) => ({ label, url: path.startsWith('http') ? path : NHM + path });

const RAW = [
  {
    id: 'building', title: 'The building', zone: 'outside', place: 'Outside, Cromwell Road', minutes: 5,
    find: 'Stand on the Cromwell Road pavement, facing the main entrance, far enough back to see the whole front of the building.',
    look: [
      'The animals on the walls. On your right, the east wing, they are extinct species. On your left, the west wing, living ones.',
      'Look for a pterodactyl on the east side, and lions and wolves on the west.',
      'The peak of the gable above the main door. A statue of Adam stood there until around the Second World War.',
    ],
    story: [
      'Welcome to the Natural History Museum. Before you go in, stand back for a moment and look at the building. Most museums keep their collections inside. This one wears them on the outside.',
      'The architect was Alfred Waterhouse, and the museum opened its doors in 1881. Its founder, the anatomist Richard Owen, wanted a cathedral to nature, and that is very much what he was given: arches and towers in the manner of the great churches of the twelfth century. But it is clad not in stone but in terracotta, baked clay, chosen because it could stand up to the soot of Victorian London. It covers the building, inside and out.',
      'Now look closer. The walls are alive with animals. Owen insisted that the living and the extinct should be kept apart, and so they are. On your left, the west wing, are creatures of the living world. On your right, the east wing, are animals that are gone for good. Somewhere up there a pterodactyl, made of clay, keeps watch over the traffic.',
      'And at the very peak, above the door, there once stood a statue of Adam, presiding over every creature on the front of the building. He was lost around the time of the Second World War, and no one is quite sure how. The peak is empty now. Shall we go in?',
    ],
    sources: [
      src('Alfred Waterhouse and the museum building', '/discover/alfred-waterhouse-museum-building-cathedral-to-nature.html'),
      src('Museum architecture (Library and Archives)', '/our-science/services/library/collections/museum-architecture.html'),
      src('A history of the museum grounds', '/about-us/a-history-of-the-museum-grounds-and-wildlife-garden.html'),
      src('The Fall of Man and the Foundations of Science (Cambridge University Press): the Adam statue', 'https://www.cambridge.org/core/books/fall-of-man-and-the-foundations-of-science/conclusion/72833DBBF0184E331FEF1BB30B8AA5D5'),
    ],
  },
  {
    id: 'hope', title: 'Hope, the blue whale', zone: 'green', place: 'Green zone, Hintze Hall, ground floor', minutes: 10,
    find: 'Go in through the main entrance. Hope is the whale skeleton hanging over the great hall in front of you.',
    look: [
      'Her lower jaw. Even at its lowest point it is more than four metres above the floor. Stand right underneath it.',
      'The line of her spine, rising to the top of her back, thirteen and a half metres up.',
      'The bays along both sides of the hall. Find the mastodon, the dinosaur Mantellisaurus, and a meteorite about four and a half billion years old.',
      'The painted ceiling. Save a proper look for later: you will see it close up from the top balcony.',
    ],
    story: [
      'Look up. Hanging above you, caught in the middle of a dive, is the skeleton of a blue whale, the largest animal ever known to have lived. She is twenty-five metres long. She is made of two hundred and twenty-one bones. And she has a name: Hope.',
      'On the twenty-fifth of March 1891, she stranded on a sandbar near Wexford, on the south-east coast of Ireland. The museum bought her that same year. For much of the century that followed, she hung in the Mammals Hall, at the back of the museum. Then, in the summer of 2017, she was brought here, to the very heart of the building, and posed the way a living blue whale feeds: diving, mouth open, lunging into the sea.',
      'Walk to her head and stand beneath the jaw. Even at its lowest point, it is more than four metres above the floor. Now imagine it closing around a mouthful of ocean.',
      'Her name was chosen as a symbol of our power to shape a more sustainable future. Blue whales were hunted almost to extinction in the twentieth century. That they are still out there at all is the kind of hope she stands for.',
      'Before you move on, look into the bays along the sides of the hall. In one stands a mastodon, rebuilt by Richard Owen into what the museum calls the first accurate mount of a mastodon anywhere. In another is a piece of a meteorite, about four and a half billion years old. So the oldest thing in this hall is not the whale at all. It is a stone that fell from space.',
    ],
    sources: [
      src('Museum unveils Hope the blue whale (2017)', '/discover/news/2017/july/museum-unveils-hope-the-blue-whale-skeleton.html'),
      src('Hope the blue whale: history', '/discover/hope-the-blue-whale-history.html'),
      src('The secret history of Hope', '/discover/news/2018/september/secret-history-of-hope-the-blue-whale-finally-revealed.html'),
      src('The Imilac meteorite', '/discover/imilac-meteorite-gem-as-old-solar-system.html'),
      src('The making of an American mastodon', '/discover/the-making-of-an-american-mastodon.html'),
    ],
  },
  {
    id: 'dinosaurs', title: 'Dinosaurs', zone: 'blue', place: 'Blue zone, ground floor', minutes: 25,
    find: 'From Hintze Hall, take the corridor on the left side of the hall, towards the Darwin Centre. The Dinosaurs gallery is the third doorway on the left. At busy times there is a queue.',
    look: [
      'The walkway, which carries you above the floor at the height of the skeletons.',
      'The Triceratops skull: the bony frill, and the three horns that give it its name.',
      'The moving T. rex. It is a model, not a skeleton, and it is the loudest thing in the gallery.',
    ],
    story: [
      'This is one of the busiest rooms in the museum, and it is easy to see why. The walkway lifts you up among the skeletons, so that you meet them almost eye to eye.',
      'Look for the Triceratops skull. That great frill of bone, and those three horns, belonged to a plant eater that lived alongside Tyrannosaurus rex, at the very end of the age of dinosaurs, in what is now western North America.',
      'And then there is the hunter itself. The T. rex in this gallery is not a skeleton at all, but a moving model, made to show the animal as it might have been in life. Stand back a little, and watch the faces of the children closest to it.',
      'One thing to keep in mind as you walk. Very few dinosaurs are ever found whole. Most of the skeletons you see in museums are a careful mixture of real bone, casts, and the best judgement of scientists. Which makes a dinosaur you will meet later on this walk, in Earth Hall, all the more remarkable.',
    ],
    sources: [
      src('Dinosaurs gallery', '/visit/galleries-and-museum-map/dinosaurs.html'),
      src('Dinosaur collections', '/our-science/services/collections/palaeontology/dinosaurs.html'),
      src('Visual guide (busy galleries)', '/visit/visual-guide.html'),
      src('Family favourites self-guided tour (the T. rex)', '/visit/family-favourites-self-guided-tour.html'),
    ],
  },
  {
    id: 'mammals', title: 'The blue whale model', zone: 'blue', place: 'Blue zone, Mammals Hall, ground floor', minutes: 10,
    find: 'Leave Dinosaurs and follow the signs along the Mammals gallery. At its end, turn right for the Mammals Hall.',
    // Closed from..until: the walk skips the stop on those days. The notice shows from today until then.
    notice: { text: 'The museum lists the Mammals Hall as closed from Tuesday 10 to Thursday 12 November. The lift to its balcony is out of service.', from: '2026-11-10', until: '2026-11-12' },
    look: [
      'The life-size blue whale, swimming among the skeletons of other whales hung above it.',
      'Its tail. Stand at the tail and look all the way along the body to the head.',
    ],
    story: [
      'Here is the other blue whale. Not bones this time, but the whole animal, life size, as if it had just surfaced in the middle of the room.',
      'It was built right here, inside this gallery, in the 1930s, out of wood and plaster. Its makers worked from photographs, and from the measurements of a female killed by a British research team in 1925. It is about twenty-eight metres long, a few metres longer than Hope.',
      'For decades, Hope\'s skeleton hung above this model, the bones and the body together in one room. She was taken down in 2015, and two years later she was hung again, at the front of the museum.',
      'Stand by its tail and look along its body to the head. The blue whale is a mammal, as you are. It breathes air, and it feeds its young on milk. The biggest mammal on Earth does not live on land at all.',
    ],
    sources: [
      src('Mammals and the blue whale model', '/visit/galleries-and-museum-map/mammals-and-blue-whale.html'),
      src('The history of Hintze Hall', '/discover/museum-history-hintze-hall.html'),
      src('Scientific American: the blue whale model at 75', 'https://www.scientificamerican.com/blog/tetrapod-zoology/after-75-years-6-ton-blue-whale-model-still-excites-london-museum/'),
      src('Hope (whale): taken down in 2015, rehung in 2017', 'https://en.wikipedia.org/wiki/Hope_(whale)'),
    ],
  },
  {
    id: 'darwin', title: 'Darwin on the stairs', zone: 'green', place: 'Green zone, the main staircase', minutes: 5,
    find: 'Go back to Hintze Hall and climb the main staircase at its far end. Darwin sits on the landing, halfway up.',
    look: [
      'His face. He sits, a little forward, watching the hall.',
      'Turn round and look where he is looking: down the hall, under Hope, towards the door.',
      'A portrait of Alfred Russel Wallace, close by.',
    ],
    story: [
      'Charles Darwin, seated, keeping watch over the hall. His statue was unveiled here in 1885, four years after the museum opened, and three years after his death.',
      'There is an irony in where he sits. Richard Owen, the man who fought for this museum to be built, was one of Darwin\'s fiercest critics. For many years Darwin was moved away from these stairs, and Owen stood here instead. Darwin came back in 2008, in time for the two hundredth anniversary of his birth.',
      'Close by hangs a portrait of Alfred Russel Wallace, who arrived at the same great idea, evolution by natural selection, on his own, while collecting on the islands of South-east Asia. Two men. One idea.',
      'Now turn round, and look where Darwin is looking. Down the length of the hall, past the whale, towards the door. The whole parade of life that he did so much to explain.',
    ],
    sources: [
      src('Museum highlights: Charles Darwin', '/discover/museum-highlights-charles-darwin.html'),
      src('Darwin Correspondence Project: the Boehm statue', 'https://darwinproject.ac.uk/about-darwin/portraits-charles-darwin-catalogue/213-edgar-boehm-statue-nhm'),
      src('Who was Alfred Russel Wallace?', '/discover/who-was-alfred-russel-wallace.html'),
      src('Sandwalk, 2009: moving Darwin', 'https://sandwalk.blogspot.com/2009/02/moving-darwin.html'),
    ],
  },
  {
    id: 'treasures', title: 'Treasures', zone: 'green', place: 'Green zone, first floor', minutes: 15,
    find: 'Carry on up to the first floor. Treasures has entrances on both sides of the main staircase.',
    look: [
      'Archaeopteryx: a fossil with feathered wings, clawed fingers and a long, bony tail.',
      'A first edition of On the Origin of Species.',
      'A piece of the Moon, brought back by Apollo 17.',
    ],
    story: [
      'This room holds just a handful of the museum\'s millions of specimens, each one chosen because it changed what we know, or how we came to know it.',
      'Find the Archaeopteryx. Look at it closely. Feathered wings, like a bird. But also clawed fingers and a long, bony tail, like a reptile. A small piece of jaw in the same slab even carries teeth. This one was dug up in 1861, and the museum calls it the first skeleton of its kind ever found.',
      'Now find the book. Two years before that fossil came to light, in 1859, Darwin published On the Origin of Species, and a first edition is here. He had argued that, given immense spans of time, one kind of living thing could become another. And then, out of a German quarry, came an animal that seemed to be caught in the act.',
      'Last, look for something that came from much further away: a fragment of the Moon, brought back by Apollo 17 in 1972, the last mission to land people there, and given to Britain as a gift of goodwill.',
    ],
    sources: [
      src('Highlights of the Treasures gallery', '/discover/highlights-of-the-treasures-gallery.html'),
      src('Treasures in the Cadogan Gallery', '/visit/galleries-and-museum-map/treasures-in-the-cadogan-gallery.html'),
    ],
  },
  {
    id: 'vault', title: 'Minerals and the Vault', zone: 'green', place: 'Green zone, first floor', minutes: 20,
    find: 'On the first floor, follow the signs for Minerals along the balcony. Walk the length of the Minerals gallery; the Vault is at its far end.',
    look: [
      'The oak cabinets in Minerals. They are the originals, from 1881.',
      'The Aurora Pyramid of Hope: 296 diamonds, each one its natural colour.',
      'The Nakhla meteorite, a piece of Mars.',
      'A purple amethyst in a silver ring shaped like a snake. It is the one with the curse.',
    ],
    story: [
      'Walk slowly through the Minerals gallery. The oak cabinets around you are the originals, and the room is laid out much as it was when the doors opened in 1881. It is one of the quietest places in the museum, and on a bright day it fills with natural light.',
      'At the far end is the Vault, where the most precious stones are kept. The most extraordinary of them is a pyramid of two hundred and ninety-six diamonds, every one of them the colour it came out of the ground. Under ultraviolet light, some of them glow blue.',
      'Nearby is a stone from another world. The Nakhla meteorite came from Mars. It fell as a shower of stones near a village in Egypt in 1911. It may be the closest most of us will ever come to another planet.',
      'And then there is the amethyst. Its last private owner, the writer Edward Heron-Allen, called it trebly cursed, and when it came to the museum in 1943 it came with his letter of warning. Read the story on the case, if you like. But you should know that the museum\'s own scientists suspect he invented the curse, to help sell a short story he had written about it.',
    ],
    sources: [
      src('Minerals gallery', '/visit/galleries-and-museum-map/minerals.html'),
      src('The Vault', '/visit/galleries-and-museum-map/the-vault.html'),
      src('How do coloured diamonds form?', '/discover/how-do-coloured-diamonds-form.html'),
      src('Mars and Moon meteorites', '/discover/space-highlights-mars-moon-meteorites.html'),
      src('Weird objects in the museum (the amethyst)', '/visit/weird-objects-in-the-museum.html'),
    ],
  },
  {
    id: 'sequoia', title: 'The giant sequoia', zone: 'green', place: 'Green zone, Hintze Hall, second floor', minutes: 10,
    find: 'Go back to Hintze Hall and climb to the second floor, the top balcony. The great slice of tree trunk stands up there, with Hope below you.',
    look: [
      'The rings, and the timeline beside the slice, which marks what was happening in the world as the tree grew.',
      'Lean on the balustrade and look down at Hope. It is one of the best views of her in the museum.',
      'The ceiling, close enough now to see the plants painted on its panels.',
    ],
    story: [
      'This slice was cut from a giant sequoia, one of the largest kinds of living thing on Earth. When the tree was felled in California, in 1891, it was about thirteen hundred years old, and by the museum\'s account a hundred and one metres tall.',
      'When it was a seedling, the Roman Empire in the west had already fallen. Follow the timeline beside it. Empires rise and fall, plagues come and go, and the tree simply adds one more ring each year.',
      'Now notice the year it was cut down: 1891. That same year, half a world away, a blue whale stranded on a sandbar in Ireland. Turn round, lean on the rail, and look down. There she is. Two giants of the same year, meeting in the same hall.',
      'Up here you are close to the ceiling, too. It is made of a hundred and sixty-two panels of plants, painted by hand and gilded, from the Scots pine to the orange tree. They were nearly cut from the plans to save money. Waterhouse insisted they stay.',
    ],
    sources: [
      src('The giant sequoia slice', '/discover/giant-sequoia-slice.html'),
      src('Hidden treasures above your head (the ceiling)', '/discover/hidden-treasures-above-heads.html'),
      src('Alfred Waterhouse and the museum building', '/discover/alfred-waterhouse-museum-building-cathedral-to-nature.html'),
    ],
  },
  {
    id: 'nature-and-us', title: 'Nature and Us', zone: 'green', place: 'Green zone, second floor, new in 2026', minutes: 12,
    find: 'From the sequoia, carry on along the top balcony to the other side of the hall. The entrance is on your left.',
    look: [
      'The room itself. The public had not been inside it for more than eighty years.',
      'A stone handaxe, four hundred thousand years old.',
      'A Star Wars toy covered in tiny sea creatures called bryozoans.',
    ],
    story: [
      'You are standing in a room that the public had not seen for more than eighty years. In 1943, in the middle of the Second World War, bombs damaged the museum\'s herbarium, and this room was given over to the plant collections, out of sight. It opened again, as this gallery, in September 2026.',
      'Its fifty objects are about us, and the rest of the natural world. Look for the handaxe, shaped from stone four hundred thousand years ago, long before our own species existed, by hands not so very different from yours.',
      'And at the other end of time, a Star Wars toy that ended up underwater and was colonised by bryozoans, tiny animals that build their colonies on any hard surface they can find. Nature, it seems, does not much mind what it grows on.',
      'This gallery is a trial. It is here for about eighteen months, and what visitors make of it will help shape a permanent gallery, planned for 2029. So, if something in here moves you, tell the museum.',
    ],
    sources: [
      src('Nature and Us opens to the public (press release)', '/press-office/the-natural-history-museum-opens-nature-and-us-to-the-public-tom.html'),
      src('Nature and Us: visual guide and directions', '/visit/galleries-and-museum-map/nature-and-us/visual-guide-for-the-nature-and-us-gallery.html'),
      src('Smithsonian: the gallery closed since 1943 reopens', 'https://www.smithsonianmag.com/smart-news/closed-to-public-since-wwii-hidden-gallery-at-london-natural-history-museum-opens-doors-once-again-180989380/'),
    ],
  },
  {
    id: 'marine-reptiles', title: 'Mary Anning\'s sea dragons', zone: 'green', place: 'Green zone, Fossil Marine Reptiles, ground floor', minutes: 12,
    find: 'Go back down to the ground floor of Hintze Hall. Stand with your back to the main entrance, facing the staircase. Go through the archways on your right, just before the stairs.',
    look: [
      'The skeletons along both walls, behind glass: ichthyosaurs and plesiosaurs.',
      'The long skull of Temnodontosaurus, found by Mary Anning and her brother Joseph.',
      'Plesiosaurus dolichodeirus, the long-necked skeleton Mary Anning found in 1823.',
    ],
    story: [
      'Along these walls swim the sea dragons of the age of dinosaurs. They are not dinosaurs themselves, but marine reptiles. Ichthyosaurs, shaped rather like dolphins. And plesiosaurs, with small heads on long necks, flying through the water on four great flippers.',
      'Some of the most important of them were found on the Dorset coast, at Lyme Regis, by a young woman named Mary Anning, who sold fossils to make a living.',
      'Look for the long skull of Temnodontosaurus. Her brother Joseph found it when Mary was about twelve years old, and a year later she found more of the skeleton.',
      'Then find the plesiosaur. In December 1823, Mary uncovered this skeleton, with a neck so impossibly long that some experts at first suspected a fake.',
      'She had little formal education, in an age when science was a club for gentlemen, and for a long time the men who bought her fossils took the credit. Today she is remembered as one of the greatest fossil hunters there has ever been. And here, in front of you, is her work.',
    ],
    sources: [
      src('Mary Anning\'s fossils', '/discover/mary-anning-fossils.html'),
      src('Mary Anning: the unsung hero', '/discover/mary-anning-unsung-hero.html'),
      src('Fossil Marine Reptiles gallery', '/visit/galleries-and-museum-map/fossil-marine-reptiles.html'),
    ],
  },
  {
    id: 'human-evolution', title: 'Human Evolution', zone: 'red', place: 'Red zone, East Wing, ground floor', minutes: 12,
    find: 'Follow the signs for the Red Zone, through the Birds and Lasting Impressions galleries, into the East Wing. Human Evolution is next to Earth Hall, close to Sophie the stegosaurus.',
    look: [
      'Gibraltar 1, the first adult Neanderthal skull ever found.',
      'Cheddar Man, and the reconstruction of his face.',
      'The two life-size models, a Neanderthal and an early modern human. Look them in the eye.',
    ],
    story: [
      'This gallery is about one species in particular: our own. And about the cousins who walked the Earth beside us.',
      'Look for the skull from Gibraltar. It was found in 1848, and nobody knew what it was. Only later, after a discovery in Germany\'s Neander Valley gave these people their name, did anyone realise that Gibraltar had given us the first adult Neanderthal skull ever found.',
      'Then there is Cheddar Man, who lived in Britain about ten thousand years ago. His is the oldest almost complete skeleton of our own species ever found in this country.',
      'The two figures are a Neanderthal and an early modern human, made by the Dutch artists Adrie and Alfons Kennis. The Neanderthal\'s face is based on remains about forty thousand years old, found in Belgium. Look him in the eye. Many people alive today still carry a little Neanderthal DNA. In a sense, he is family.',
    ],
    sources: [
      src('Human Evolution gallery', '/visit/galleries-and-museum-map/human-evolution.html'),
      src('The first adult Neanderthal skull', '/discover/first-adult-neanderthal-skull.html'),
      src('Cheddar Man', '/discover/cheddar-man-mesolithic-britain-blue-eyed-boy.html'),
      src('Bringing a Neanderthal to life', '/discover/bringing-a-neanderthal-to-life-the-making-of-our-model.html'),
    ],
  },
  {
    id: 'sophie', title: 'Sophie the stegosaurus', zone: 'red', place: 'Red zone, Earth Hall, ground floor', minutes: 8,
    find: 'Earth Hall is the tall hall at the heart of the Red Zone, on the ground floor of the East Wing. From Human Evolution it is right next door. From anywhere else, go down to the ground floor of Hintze Hall and follow the signs for the Red Zone and Earth Hall. Sophie stands in the hall.',
    look: [
      'The plates along her back, and the spikes on her tail.',
      'Her skull. It is tiny for such a big animal, with teeth about the size of your little fingernail.',
      'The escalator rising into a giant metal globe. You will ride it to the next stop.',
    ],
    story: [
      'Meet Sophie. She is a Stegosaurus, and she is the most complete skeleton of her kind ever found.',
      'She lived about a hundred and fifty million years ago, in what is now Wyoming, in the United States. In 2003 a fossil hunter named Bob Simon found her on a ranch there, and since December 2014 she has stood here.',
      'She is just over five and a half metres long. Her kind could grow to nine.',
      'Now look at her head. For an animal that weighed about one and a half tonnes, about as much as a car, it is astonishingly small, and her teeth are no bigger than your little fingernail. The scientists who studied her think her bite was about as strong as a cow\'s. She was a plant eater, not a hunter. But with spikes like those on her tail, she could certainly defend herself.',
      'When you are ready, find the escalator that rises into the giant globe. It will carry you up, and into the Earth itself.',
    ],
    sources: [
      src('Earth Hall and Sophie the Stegosaurus', '/visit/galleries-and-museum-map/earth-hall-and-stegosaurus.html'),
      src('Stegosaurus brought to life', '/discover/stegosaurus-brought-to-life.html'),
      src('Visual guide (the escalator)', '/visit/visual-guide.html'),
      src('Sophie weighed about 1.6 tonnes (the museum\'s 2015 study)', 'https://blog.everythingdinosaur.com/blog/_archives/2015/03/04/sophie-the-stegosaurus-at-1-6-tonnes.html'),
    ],
  },
  {
    id: 'kobe', title: 'The earthquake room', zone: 'red', place: 'Red zone, Volcanoes and Earthquakes, second floor', minutes: 15,
    find: 'Ride the escalator up through the globe. At the top, turn left into Volcanoes and Earthquakes. The earthquake room, set up like a Japanese supermarket, is at the back. The museum says it can be upsetting for some people, so skip it if you would rather.',
    look: [
      'The shop shelves, before the shaking starts.',
      'The casts of people caught by the eruption of Vesuvius, in the year 79.',
    ],
    story: [
      'Step into the little supermarket at the back of the gallery and stand among the shelves. It is modelled on a real morning: the earthquake that struck the Japanese city of Kobe on the seventeenth of January 1995, just before six o\'clock.',
      'The shaking was over in seconds, but more than six thousand people lost their lives, most of them in Kobe itself. What you feel in this room is only a faint echo of it.',
      'Out in the gallery there are other reminders that the Earth is not finished. Look for the casts of people caught by the eruption of Vesuvius, nearly two thousand years ago. They hold the last moments of real lives, so look at them gently.',
      'It is easy to think of the ground beneath our feet as solid, permanent, finished. This gallery is here to remind you that it is none of those things. The planet is still moving. And so, in its slow way, is everything that lives on it.',
    ],
    sources: [
      src('Volcanoes and Earthquakes gallery', '/visit/galleries-and-museum-map/volcanoes-and-earthquakes.html'),
      src('Exhibits with impact: self-guided tour (the Kobe simulator)', '/visit/exhibits-impact-adults-self-guided-tour.html'),
      src('Britannica: the Kobe earthquake of 1995', 'https://www.britannica.com/event/Kobe-earthquake-of-1995'),
    ],
  },
  {
    id: 'fern', title: 'Fern, the bronze dinosaur', zone: 'outside', place: 'Outside, the Evolution Garden', minutes: 10,
    find: 'Go back down to the ground floor and leave by the Exhibition Road entrance. Fern stands outside in the Evolution Garden, the museum\'s east garden; staff at the door can point you to her. In icy weather the garden can close at short notice.',
    look: [
      'Her neck and tail, held out in the air with nothing underneath them.',
      'Her feet, and the top of her neck, just behind the head. Fern puts right mistakes her plaster original carried for over a century.',
      'The path through the garden. It is laid out as a walk through five hundred and forty million years of life.',
    ],
    story: [
      'One more giant to end with. This is Fern, a Diplodocus, cast in bronze. The museum calls her the first life-size bronze Diplodocus able to hold herself up.',
      'She is a copy of Dippy, the plaster Diplodocus made for the museum in 1905, who greeted visitors in Hintze Hall from 1979 until Hope took his place. Dippy\'s bones were scanned while he toured the country, and from those scans came Fern. Local schoolchildren chose her name.',
      'Look at her neck and her tail. There are no props and no pillars. Steel cables run through the bronze, anchored at her hips, and hold her up the way cables hold up a bridge.',
      'And she is more correct than the original. The first bone of Dippy\'s neck, the one right behind the skull, was mounted upside down, and it stayed that way for more than a century. On Fern it is the right way up, and her feet have been put right too. Even a copy, it seems, can evolve.',
      'The path around her leads through five hundred and forty million years of life on Earth. Walk it slowly, if you have the time. Today you have met a whale, a tree, a stone from Mars, and some of the people who came before us. Thank you for walking with me.',
    ],
    sources: [
      src('Our gardens', '/visit/galleries-and-museum-map/our-gardens.html'),
      src('Fern, the museum\'s newest dinosaur (press release)', '/press-office/press-releases/ferntastic--natural-history-museum-reveals-latest-dinosaur-resid.html'),
      src('The making of Fern the Diplodocus', '/discover/the-making-of-fern-the-diplodocus-engineering-meets-natural-history.html'),
      src('Evolution Garden audio guide transcript', '/visit/galleries-and-museum-map/our-gardens/audio-guide-transcript-for-the-evolution-garden.html'),
      src('Ingenia: the upside-down neck vertebra', 'https://ingenia.org.uk/articles/bringing-prehistory-to-life/'),
    ],
  },
];

export const STOPS = RAW.map((s, i) => ({ ...s, n: i + 1 }));

export const WALKS = {
  full: { name: 'Full walk', time: 'about 3 hours', ids: STOPS.map((s) => s.id) },
  short: { name: 'Highlights', time: 'about 2 hours', ids: ['building', 'hope', 'dinosaurs', 'darwin', 'vault', 'sequoia', 'sophie', 'kobe', 'fern'] },
};

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
