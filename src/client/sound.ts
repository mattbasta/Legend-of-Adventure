import * as comm from "./comm";
import * as entities from "./entities";

const buzz = require("buzz"); // ts-ignore

type BuzzSound = {
  getStateCode(): number;
  setVolume(volume: number): BuzzSound;
  play(): BuzzSound;
  fadeOut(duration: number, cb?: () => void): BuzzSound;
  fadeTo(volume: number, duration: number): BuzzSound;
};

const sounds: Record<string, BuzzSound> = {};
const loops: Record<string, BuzzSound> = {};
let playingLoop: string | null = null;

export function loadSound(name: string, url: string) {
  if (name in sounds) return;
  sounds[name] = new buzz.sound(url, {
    formats: ["mp3"],
    preload: true,
    autoload: true,
    loop: false,
  });
}

// Play sound
comm.messages.on("snd", function (body) {
  const data = body.split(":");
  const sX = parseFloat(data[1]);
  const sY = parseFloat(data[2]);
  const following = entities.getFollowing();
  const dist = Math.sqrt(
    Math.pow(sX - following.x, 2) + Math.pow(sY - following.y, 2)
  );
  playSound(data[0], dist);
});

loadSound("bleat", "static/sounds/bleat");
loadSound("chest_smash", "static/sounds/chest_smash");
loadSound("hit_grunt0", "static/sounds/hit_grunt0");
loadSound("hit_grunt1", "static/sounds/hit_grunt1");
loadSound("hit_grunt2", "static/sounds/hit_grunt2");
loadSound("hit_grunt3", "static/sounds/hit_grunt3");
loadSound("pot_smash", "static/sounds/pot_smash");
loadSound("pot_smash", "static/sounds/pot_smash");
loadSound("potion0", "static/sounds/potion0");
loadSound("potion1", "static/sounds/potion1");
loadSound("wolf_howl", "static/sounds/wolf_howl");
loadSound("zombie_groan", "static/sounds/zombie_groan");
loadSound("zombie_attack", "static/sounds/zombie_attack");

export function loadLoop(name: string, url: string) {
  if (name in loops) return;
  loops[name] = new buzz.sound(url, {
    formats: ["ogg", "mp3"],
    preload: true,
    autoload: true,
    loop: true,
  });
}

export function playSound(name: string, distance: number) {
  if (!(name in sounds)) return;
  if (distance > 25) return;
  var sound = sounds[name];
  var sc = sound.getStateCode();
  if (sc >= 2) {
    distance /= 2.5;
    sound.setVolume(Math.max(100 - distance * distance, 0));
    sound.play();
  }
}

// loadLoop('daylight', 'static/music/daylight');
// playLoop('daylight');

export function playLoop(name: string) {
  if (playingLoop == name) return;

  if (!playingLoop) {
    loops[name].play().setVolume(0).fadeTo(10, 1000);
    playingLoop = name;
    return;
  }

  loops[playingLoop].fadeOut(2000, function () {
    playingLoop = name;
    // FIXME: Bad things might happen if playLoop is called again
    // within four seconds of it being called once.
    loops[name].play().setVolume(0).fadeTo(20, 2000);
  });
}
