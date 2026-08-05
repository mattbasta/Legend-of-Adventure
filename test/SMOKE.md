# Manual smoke checklist

Run before landing each phase. Start the server (`npm run build && node dist/index.js`
until Phase 1; `npm run dev` after), open http://localhost:8080/.

## Baseline (Phase 0)

- [ ] Page loads, level renders (town plaza at spawn), no console errors
- [ ] WASD/arrow movement works; camera follows
- [ ] Region slide: walk off the edge of the field → adjacent field loads
- [ ] Portal: enter a town house/shop → interior loads; exit returns to town
- [ ] Chest: attack (Space/L) a shop chest → items drop; walk over item → picked up
- [ ] Pot: smash a pot → item or ambush spawns, smash sound plays
- [ ] Inventory: cycle (J/K), use food (heals), drop (Q/U)
- [ ] Chat (T): multi-word message reaches a second client intact
- [ ] Slash command (e.g. `/bogus`): server stays alive, replies "Unknown command"

## NPCs (Phases 4-6, grows per phase)

- [ ] Sheep wander fields, bounce animation, stay out of water/walls (Phase 4)
- [ ] Sheep flee when attacked; killing one drops meat ~50% (Phase 5)
- [ ] Wolf chases the player and deals damage at melee range (Phase 5)
- [ ] Death → items drop, respawn at (0,0) 50,50, client survives (Phase 5)
- [ ] Dungeon: zombies chase; death waker shakes and spawns zombies (Phase 6)
- [ ] Town: soldiers guard, villagers wander and chatter (Phase 6)
- [ ] Attack a child in town → soldiers converge and retaliate (Phase 6)
- [ ] Soldier death drops a leveled sword (Phase 6)
