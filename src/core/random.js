export class Random {
  constructor(seed = 194409) { this.state = seed >>> 0; }
  next = () => {
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    return this.state / 4294967296;
  };
}
