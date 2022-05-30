import { Entity } from "../../types";

type Handler = (sup: () => Promise<void>, ...args: any) => void | Promise<void>;

class SupHandled extends Error {}

abstract class EntityBehavior {
  mixinInstances: Array<EntityBehavior>;
  mixins(): Array<new (entity: Entity) => EntityBehavior> {
    return [];
  }

  abstract getType(): string;
  abstract initialize(): Record<string, Handler>;

  private entity: Entity;
  private handlers: Record<string, Handler>;
  protected state: Record<string, any> = {};
  private constructor(entity: Entity) {
    this.entity = entity;
    this.mixinInstances = this.mixins().map((mixin) => new mixin(entity));
    this.handlers = this.initialize();
  }

  destroy() {
    this.clearSchedule();
    for (const mixin of this.mixinInstances) {
      mixin.destroy();
    }
  }

  updateState(state: Record<string, any>) {
    this.state = { ...this.state, state };
  }
  updateEntity(updates: Partial<Entity>) {}

  scheduleHandles: Array<NodeJS.Timer> = [];
  schedule(handlerName: string, inMs: number, ...args: any) {
    this.scheduleHandles.push(
      setTimeout(() => {
        this.enqueueSelf(handlerName, args);
      }, inMs)
    );
  }
  protected clearSchedule() {
    this.scheduleHandles.forEach((handle) => clearTimeout(handle));
    this.scheduleHandles = [];
  }

  queue: Array<[handlerName: string, args: Array<any>]> = [];
  protected enqueueSelf(handlerName: string, args: Array<any>) {
    if (!this.handlers[handlerName]) {
      return;
    }
    this.queue.push([handlerName, args]);
  }

  private canInvokeHandler(handlerName: string) {
    return !!this.handlers[handlerName];
  }
  private async invokeHandler(handlerName: string, args: Array<any>) {
    const handler = this.handlers[handlerName];
    const sup = async () => {
      for (const mixin of this.mixinInstances) {
        if (mixin.canInvokeHandler(handlerName)) {
          await mixin.invokeHandler(handlerName, args);
          throw new SupHandled();
        }
      }
    };
    try {
      await handler(sup, ...args);
    } catch (e) {
      if (e instanceof SupHandled) {
        return;
      } else {
        throw e;
      }
    }
  }
  async tick() {
    const queue = this.queue;
    this.queue = [];
    for (const [handler, args] of this.queue) {
      await this.invokeHandler(handler, args);
    }
  }
}

// handlers -> routines -> events + state updates
//    ^-----------^--- state
