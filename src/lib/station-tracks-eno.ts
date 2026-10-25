// Eno and Mix: original pieces using the Music for Airports idea. A few short phrases each
// loop on their own length (.slow(7), .slow(11), .slow(13)… lengths that share no factor),
// so they drift against each other and the combination almost never repeats. Lots of
// silence, long room. Mix puts a slow string melody, in the Chef's Table manner, over one
// of these beds. Written for the recorded instruments; the code sound swaps in synths.

import type { AmbientTrack } from './station-tracks'

export const ENO: readonly AmbientTrack[] = [
  {
    id: 'stock',
    title: 'Stock',
    style: 'eno',
    minutes: 5,
    code: `// Stock: three piano notes and a low string, each on its own loop
setcpm(15)
stack(
  note("ab4 ~ ~ ~ ~ ~ ~").slow(7).s("piano").release(4).velocity(.45),
  note("~ ~ c5 ~ ~ ~ ~ ~ ~ ~ ~").slow(11).s("piano").release(4).velocity(.4),
  note("~ ~ ~ ~ ~ eb5 ~ ~ ~ ~ ~ ~ ~").slow(13).s("piano").release(4).velocity(.35),
  note("~ f4 ~ ~ ~ ~ ~ db4 ~ ~ ~ ~ ~ ~ ~ ~ ~").slow(17).s("violas").attack(3).release(6).velocity(.3),
  note("ab2").slow(19).s("cellos").attack(4).release(8).velocity(.35)
).room(.8).roomsize(8)`,
  },
  {
    id: 'rising',
    title: 'Rising',
    style: 'eno',
    minutes: 5,
    code: `// Rising: soft violins that swell and fade at different speeds, like dough proving
setcpm(15)
stack(
  note("a4 ~ ~ ~ ~").slow(5).s("violins").attack(3).release(5).velocity(.3),
  note("~ ~ ~ c5 ~ ~ ~").slow(7).s("violins").attack(3).release(5).velocity(.28),
  note("~ ~ ~ ~ ~ ~ e5 ~ ~ ~ ~").slow(11).s("violins").attack(3).release(6).velocity(.25),
  note("~ f3 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~").slow(13).s("cellos").attack(4).release(7).velocity(.35),
  note("~ ~ ~ ~ ~ ~ ~ ~ g4 ~ ~ ~ ~ ~ ~ ~ ~").slow(17).s("piano").release(4).velocity(.3)
).room(.75).roomsize(7)`,
  },
  {
    id: 'cooling-rack',
    title: 'Cooling rack',
    style: 'eno',
    minutes: 4,
    code: `// Cooling rack: high piano and harp ticking down, far apart
setcpm(16)
stack(
  note("e5 ~ ~ ~ ~ ~ ~").slow(7).s("piano").release(3).velocity(.35),
  note("~ ~ ~ ~ b4 ~ ~ ~ ~ ~ ~").slow(11).s("piano").release(3).velocity(.32),
  note("~ ~ ~ ~ ~ ~ ~ ~ f#5 ~ ~ ~ ~").slow(13).s("harp").release(2).velocity(.3),
  note("~ ~ a4 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~").slow(17).s("harp").release(2).velocity(.28),
  note("c3").slow(23).s("cellos").attack(5).release(8).velocity(.3)
).room(.8).roomsize(8)`,
  },
  {
    id: 'salt-cellar',
    title: 'Salt cellar',
    style: 'eno',
    minutes: 5,
    code: `// Salt cellar: a slow minor drift, piano answered by violas
setcpm(15)
stack(
  note("d4 ~ ~ ~ ~ ~ ~").slow(7).s("piano").release(4).velocity(.4),
  note("~ ~ ~ f4 ~ ~ ~ ~ ~ ~ ~").slow(11).s("piano").release(4).velocity(.35),
  note("~ ~ ~ ~ ~ ~ ~ ~ ~ a4 ~ ~ ~").slow(13).s("violas").attack(3).release(6).velocity(.28),
  note("~ ~ ~ ~ c5 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~").slow(17).s("piano").release(4).velocity(.3),
  note("d2").slow(19).s("contrabass").attack(4).release(8).velocity(.35)
).room(.8).roomsize(8)`,
  },
]

export const MIX: readonly AmbientTrack[] = [
  {
    id: 'long-table',
    title: 'Long table',
    style: 'mix',
    minutes: 5,
    code: `// Long table: a slow violin song over a drifting piano bed
setcpm(15)
stack(
  note("<d5@2 f#5 e5 d5@2 b4 a4@2 [b4 d5] e5@3 ~@2>").slow(2)
    .s("violins").attack(1).release(3).velocity(.45),
  note("d4 ~ ~ ~ ~ ~ ~").slow(7).s("piano").release(4).velocity(.35),
  note("~ ~ ~ a4 ~ ~ ~ ~ ~ ~ ~").slow(11).s("piano").release(4).velocity(.3),
  note("~ ~ ~ ~ ~ ~ f#4 ~ ~ ~ ~ ~ ~").slow(13).s("harp").release(2).velocity(.28),
  note("<d3 b2 g2 a2>").slow(4).segment(1).s("cellos").attack(3).release(6).velocity(.35)
).room(.7).roomsize(7)`,
  },
  {
    id: 'copper-pans',
    title: 'Copper pans',
    style: 'mix',
    minutes: 5,
    code: `// Copper pans: cellos sing low while piano notes hang above
setcpm(15)
stack(
  note("<g3@2 bb3 a3 g3@2 f3 eb3@2 f3 g3@3 ~@2>").slow(2)
    .s("cellos").attack(1).release(3).velocity(.5),
  note("bb4 ~ ~ ~ ~ ~ ~").slow(7).s("piano").release(4).velocity(.3),
  note("~ ~ ~ ~ d5 ~ ~ ~ ~ ~ ~").slow(11).s("piano").release(4).velocity(.28),
  note("~ ~ ~ ~ ~ ~ ~ ~ f5 ~ ~ ~ ~").slow(13).s("piano").release(4).velocity(.25),
  note("<[g3,d4] [eb3,bb3] [c3,g3] [d3,a3]>").slow(4).segment(1).s("violas").attack(3).release(6).velocity(.25)
).room(.7).roomsize(7)`,
  },
  {
    id: 'first-light',
    title: 'First light',
    style: 'mix',
    minutes: 4,
    code: `// First light: an early-morning tune for violins, harp loops turning underneath
setcpm(16)
stack(
  note("<c5@2 e5 g5 a5@2 g5 e5@2 d5 c5 d5@3 ~@2>").slow(2)
    .s("violins").attack(.8).release(3).velocity(.42),
  note("c4 ~ ~ ~ ~ ~ ~").slow(7).s("harp").release(2).velocity(.3),
  note("~ ~ g4 ~ ~ ~ ~ ~ ~ ~ ~").slow(11).s("harp").release(2).velocity(.28),
  note("~ ~ ~ ~ ~ ~ ~ ~ ~ e4 ~ ~ ~").slow(13).s("piano").release(4).velocity(.28),
  note("<c3 a2 f2 g2>").slow(4).segment(1).s("cellos").attack(3).release(6).velocity(.32)
).room(.65).roomsize(6)`,
  },
  {
    id: 'garden',
    title: 'Garden',
    style: 'mix',
    minutes: 5,
    code: `// Garden: violas carry a plain song, piano and harp fall around it like leaves
setcpm(15)
stack(
  note("<a4@2 c5 b4 a4@2 e4 f4@2 g4 a4@3 ~@2>").slow(2)
    .s("violas").attack(1).release(3).velocity(.48),
  note("e5 ~ ~ ~ ~ ~ ~").slow(7).s("piano").release(4).velocity(.3),
  note("~ ~ ~ ~ ~ c5 ~ ~ ~ ~ ~").slow(11).s("harp").release(2).velocity(.28),
  note("~ ~ ~ ~ ~ ~ ~ ~ ~ ~ g5 ~ ~").slow(13).s("piano").release(4).velocity(.25),
  note("<a2 f2 c3 e2>").slow(4).segment(1).s("contrabass").attack(3).release(6).velocity(.32)
).room(.7).roomsize(7)`,
  },
]
