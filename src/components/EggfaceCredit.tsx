import type { Dish } from '../lib/dish'
import { EGGFACE_APP } from '../lib/eggface'

/** On the Eggface easter-egg dish: where the character (and the tune) come from. */
export function EggfaceCredit({ d }: { d: Dish }) {
  if (d.easter !== 'eggface') return null
  return (
    <p className="mono-label mono-label--note">
      EGGFACE IS FROM EGGFACE MUSIC LAND, MY BROTHER’S GAME. ITS SONG SPELLS E G G F A C E.{' '}
      <a href={EGGFACE_APP}>PLAY IT ON THE APP STORE →</a>
    </p>
  )
}
