// Fixed-capacity FIFO for chart history; oldest items are overwritten.
export class RingBuffer {
  #items;
  #start = 0;
  #length = 0;

  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('capacity must be >= 1');
    this.#items = new Array(capacity);
  }

  get capacity() { return this.#items.length; }
  get length() { return this.#length; }

  push(item) {
    const end = (this.#start + this.#length) % this.capacity;
    this.#items[end] = item;
    if (this.#length < this.capacity) this.#length++;
    else this.#start = (this.#start + 1) % this.capacity;
  }

  toArray() {
    return Array.from({ length: this.#length }, (_, i) => this.#items[(this.#start + i) % this.capacity]);
  }
}
