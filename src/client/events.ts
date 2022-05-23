type ListenerMapping = Record<string | number, Array<any>>;
type Listener<T extends Array<any>> = (...args: T) => void;

export interface Listenable<Mapping extends ListenerMapping> {
  on<U extends keyof Mapping>(name: U, listener: Listener<Mapping[U]>): void;
  one<U extends keyof Mapping>(name: U, listener: Listener<Mapping[U]>): void;
}

type ListenerMap<T> = T extends Record<string | number, Listener<Array<any>>>
  ? T
  : never;

export default class EventTarget<M extends ListenerMapping>
  implements Listenable<M>
{
  listeners: ListenerMap<M> = {} as ListenerMap<M>;
  oneListeners: ListenerMap<M> = {} as ListenerMap<M>;

  fire<L extends keyof M>(name: L, ...args: M[L]) {
    if (name in this.listeners) {
      for (let i = 0; i < this.listeners[name].length; i++) {
        this.listeners[name][i](...args);
      }
    }
    if (name in this.oneListeners) {
      for (let i = 0; i < this.oneListeners[name].length; i++) {
        this.oneListeners[name][i](...args);
      }
      delete this.oneListeners[name];
    }
  }
  on<L extends keyof M>(name: L, listener: Listener<M[L]>) {
    this.listeners[name] ||= [] as any;
    this.listeners[name].push(listener);
  }
  one<L extends keyof M>(name: L, listener: Listener<M[L]>) {
    this.oneListeners[name] ||= [] as any;
    this.oneListeners[name].push(listener);
  }

  waitFor<L extends keyof M>(name: L): Promise<M[L]> {
    return new Promise<M[L]>((resolve) => {
      this.one(name, (...args) => resolve(args));
    });
  }

  endpoint(): Listenable<M> {
    return {
      on: this.on.bind(this),
      one: this.one.bind(this),
    };
  }
}
