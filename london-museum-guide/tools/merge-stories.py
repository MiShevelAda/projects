# Moves a stories file written by the storyteller into the app:
#   python3 tools/merge-stories.py <stories.json>
# The words (find, arrive, look, story, walking, tip) go to stories.js, one object per stop, and the
# same fields are removed from stops.js, so each sentence lives in one place only. Every URL in a
# stop's facts_added is added to that stop's sources in stops.js. A file may carry only some fields
# of a stop (say, a new walking piece and the suggested questions): those replace the old ones and
# everything else that stop already has in stories.js is kept.
import json, os, re, sys
from urllib.parse import urlparse

FIELDS = ['find', 'arrive', 'look', 'story', 'chapters', 'walking', 'tip', 'ask', 'hook', 'remember']
src = json.load(open(sys.argv[1]))
stops = open('stops.js').read()

out = {}
if os.path.exists('stories.js'):
    t = open('stories.js').read()
    out = json.loads(t[t.index('export const STORIES = ') + 23:t.rindex(';')])
for sid, d in src.items():
    if f"id: '{sid}'" not in stops:
        sys.exit(f'unknown stop {sid}')
    o = {k: d[k] for k in FIELDS if d.get(k)}
    if isinstance(o.get('walking'), str):
        o['walking'] = [o['walking']]
    if o.get('story') and len(o.get('chapters') or o['story']) != len(o['story']):
        sys.exit(f'{sid}: {len(o["story"])} paragraphs but {len(o.get("chapters", []))} chapter titles')
    out[sid] = {**out.get(sid, {}), **o}
    # Remove the old words from this stop's block in stops.js.
    start = stops.index(f"id: '{sid}'")
    end = stops.find("\n  },\n", start)
    block = stops[start:end]
    for k in ['find', 'arrive', 'tip']:
        block = re.sub(r"\n    %s: '(?:[^'\\]|\\.)*',(?=\n)" % k, '', block)
    for k in ['look', 'story', 'walking']:
        block = re.sub(r"\n    %s: \[\n(?:      .*\n)*?    \]," % k, '', block)
    # Sources for the new details.
    urls = []
    for f in d.get('facts_added') or []:
        urls += re.findall(r'https?://[^\s)\]"\']+', json.dumps(f))
    have = set(re.findall(r"'(https?://[^']+)'", block)) | {'https://www.nhm.ac.uk' + p for p in re.findall(r"'(/[^']+)'\)", block)}
    add = []
    for u in dict.fromkeys(x.rstrip('.,;') for x in urls):
        if u in have:
            continue
        host = urlparse(u).netloc.replace('www.', '')
        label = (urlparse(u).path.strip('/').split('/')[-1] or host).replace('-', ' ').replace('.html', '')
        add.append(f"      src({json.dumps(f'{host}: {label}')}, {json.dumps(u)}),")
    if add:
        i = block.index("sources: [")
        j = block.index("\n    ],", i)
        block = block[:j] + "\n" + "\n".join(add) + block[j:]
    stops = stops[:start] + block + stops[end:]

js = ("// The words of the walk: how to find each stop, how you know you are there, what to look for, the\n"
      "// story, and the piece for the walk there. Written for the ear, witty, and checked against the\n"
      "// sources listed with each stop in stops.js. Made from the storyteller's file by\n"
      "// tools/merge-stories.py; edit here, then npm run audio.\n"
      "export const STORIES = " + json.dumps(out, indent=1, ensure_ascii=False) + ";\n")
open('stories.js', 'w').write(js)
if "import { STORIES } from './stories.js';" not in stops:
    stops = stops.replace("export const CHECKED", "import { STORIES } from './stories.js';\n\nexport const CHECKED", 1)
    stops = stops.replace("export const STOPS = RAW.map((s, i) => ({ ...s, n: i + 1 }));",
                          "export const STOPS = RAW.map((s, i) => ({ ...s, ...STORIES[s.id], n: i + 1 }));")
open('stops.js', 'w').write(stops)
print(f'merged {len(src)} stops into {len(out)}')
