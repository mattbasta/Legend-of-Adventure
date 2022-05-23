const noop = () => 0;

export type MovementFunction = (ticks: number) => number;
export type Movement = [MovementFunction, MovementFunction];

const itemHover: Movement = [
  noop,
  (ticks) => (Math.sin((ticks / 1000) * 2 * Math.PI) + 1) * -5,
];

const sheepBounce: Movement = [
  noop,
  (ticks) => Math.abs(Math.sin((ticks / 500) * 2 * Math.PI)) * -5,
];

const shake: Movement = [
  () => Math.random() * 10 - 5,
  () => Math.random() * 10 - 5,
];

export default {
  itemHover,
  sheepBounce,
  shake,
};
