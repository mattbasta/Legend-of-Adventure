function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substr(1);
}
export default function () {
  return S4() + S4() + S4() + S4();
}
