class Deferred<T> {
  resolve: (resolution: T) => void;
  reject: (error: any) => void;
  promise: Promise<T>;
  constructor() {
    this.resolve = () => {};
    this.reject = () => {};
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export default Deferred;
