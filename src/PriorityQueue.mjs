import FlatQueue from "flatqueue";

/* ************************************************************************** */
/* PriorityQueue */

/* Provides a more standard and intuitive interface for FlatQueue */

export default class PriorityQueue {

  constructor () { this.heap = new FlatQueue(); }

  insert (priority, value) { return this.heap.push(value, priority); }

  remove() { return this.heap.pop(); }

  peek() { return this.heap.peek(); }

  peekPriority() { return this.heap.peekValue(); }

  get size () { return this.heap.length; }

  clear () {
    return this.heap.clear();
    // this.heap.shrink();
    this.heap.ids.length = this.heap.values.length = this.heap.length;
  }
}

