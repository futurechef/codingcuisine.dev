// Chef's Table: slow strings and piano playing fresh arrangements of public-domain pieces,
// slowed and thinned into ambient fragments. Arranged from the original scores (all long
// out of copyright), never from a recording or modern edition. Written for the recorded
// instruments (s("violins"), s("piano")…); the code sound swaps in synths automatically.
// To tune one: paste it into strudel.cc, change it by ear, paste it back.

import type { AmbientTrack } from './station-tracks'

export const CHEFS_TABLE: readonly AmbientTrack[] = [
  {
    id: 'winter-largo',
    title: 'Winter, slowly',
    after: 'after Vivaldi, Winter (II. Largo)',
    style: 'chefs-table',
    minutes: 5,
    code: `// Winter, slowly: a violin line over rain-like harp, as in the Largo
setcpm(15)
stack(
  note("<bb4@2 eb5 [d5 eb5] f5@2 g5 [f5 eb5] d5@2 c5 [bb4 c5] d5@2 eb5@2>")
    .s("violins").attack(.8).release(3).velocity(.55),
  note("[eb3 g3 bb3 g3]*2").s("harp").release(.8).lpf(2600).velocity(.3)
    .mask("<1 1 1 1 0 1 1 1>"),
  note("<eb2 bb1 c2 g1>").s("cellos").attack(2).release(4).slow(2).velocity(.5)
).room(.6).roomsize(5)`,
  },
  {
    id: 'air',
    title: 'Air for a slow stock',
    after: 'after Bach, Air (Orchestral Suite No. 3)',
    style: 'chefs-table',
    minutes: 5,
    code: `// Air for a slow stock: the long held line over the walking octaves
setcpm(15)
stack(
  note("<f#5@4 [f#5 b5] [g5 e5] [d5 c#5] d5@2 [c#5 b4] a4@2 [b4 c#5] d5@3>").slow(2)
    .s("violins").attack(1).release(3).velocity(.5),
  note("d3 d2 c#3 c#2 b2 b1 a2 a1 g2 g1 f#2 f#1 e2 e1 a2 a1").slow(4)
    .s("cellos").attack(.2).release(1.5).velocity(.45),
  note("<[d4,f#4] [c#4,e4] [b3,d4] [a3,c#4]>").slow(2)
    .s("violas").attack(2).release(4).velocity(.3)
).room(.55).roomsize(5)`,
  },
  {
    id: 'gymnopedie',
    title: 'Gymnopédie at the pass',
    after: 'after Satie, Gymnopédie No. 1',
    style: 'chefs-table',
    minutes: 4,
    code: `// Gymnopédie at the pass: the rocking chords and the plain, slow tune
setcpm(17)
stack(
  note("<g2 d2>").s("piano").release(3).velocity(.5),
  note("<[~ [b3,d4,f#4] [b3,d4,f#4]] [~ [a3,c#4,f#4] [a3,c#4,f#4]]>").s("piano").release(2).velocity(.35),
  note("<~ ~ ~ ~ [~ f#5 a5] [g5 f#5 c#5] [b4 c#5 d5] a4@3 [~ f#4@2]>").slow(2)
    .s("piano").release(2.5).velocity(.5)
).room(.5).roomsize(4)`,
  },
  {
    id: 'clair-de-lune',
    title: 'Moonlight on the bench',
    after: 'after Debussy, Clair de lune',
    style: 'chefs-table',
    minutes: 4,
    code: `// Moonlight on the bench: the falling thirds, very slow, a harp underneath
setcpm(15)
stack(
  note("<[f5,ab5]@2 [db5,f5] [eb5,gb5]@2 [db5,f5] [c5,eb5] [db5,f5] [c5,eb5]@2 [bb4,db5]@2>").slow(2)
    .s("piano").release(3).velocity(.45),
  note("<db3 ab2 bb2 gb2>").slow(2).s("cellos").attack(2.5).release(5).velocity(.35),
  note("[db4 f4 ab4 db5]").slow(2).s("harp").release(1).velocity(.2).degradeBy(.4)
).room(.65).roomsize(6)`,
  },
  {
    id: 'prelude-e-minor',
    title: 'Prelude for resting meat',
    after: 'after Chopin, Prelude in E minor (Op. 28 No. 4)',
    style: 'chefs-table',
    minutes: 4,
    code: `// Prelude for resting meat: one long note, and the chords sinking beneath it
setcpm(16)
stack(
  note("<b4@3 c5 b4@3 [c5 b4] a4@3 b4 g4@2 f#4@2>").slow(2)
    .s("piano").release(3).velocity(.5),
  note("<[g3,b3,e4] [g3,b3,d#4] [f#3,a3,d#4] [f3,a3,d4] [f3,a3,c4] [e3,a3,c4] [e3,g3,b3] [d#3,f#3,b3]>")
    .ply(4).s("piano").release(1.2).velocity(.25),
  note("<e2 e2 b1 b1>").slow(2).s("cellos").attack(3).release(5).velocity(.3)
).room(.55).roomsize(5)`,
  },
]
