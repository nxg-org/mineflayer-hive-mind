import EventEmitter from "events";
import type { Bot, Player } from "mineflayer";
import type { Entity } from "prismarine-entity";
import type { Item } from "prismarine-item";
import StrictEventEmitter from "strict-event-emitter-types";
import type { Vec3 } from "vec3";

/**
 * A collection of targets which the bot is currently
 * storing in memory. These are primarily used to allow
 * states to communicate with each other more effectively.
 */
export interface StateMachineData {
  entity?: Entity;
  position?: Vec3;
  item?: Item;
  player?: Player;
  blockFace?: Vec3;

  entities?: Entity[];
  positions?: Vec3[];
  items?: Item[];
  players?: Player[];
}

export interface NestedHiveMindEvents {
  stateEntered: (newBehavior: typeof HiveBehavior, data: StateMachineData) => void;
  stateExited: (oldBehavior: typeof HiveBehavior, data: StateMachineData) => void;
}

export class HiveBehavior extends (EventEmitter as { new (): StrictEventEmitter<EventEmitter, NestedHiveMindEvents> }) {
  /**
   * Bot the state is related to.
   */
  readonly bot: Bot;

  /**
   * Data instance.
   */
  readonly data: StateMachineData;

  /**
   * Gets whether or not this state is currently active.
   */
  active: boolean = false;

  /**
   * Called when the bot enters this behavior state.
   */
  onStateEntered?(): void {}

  /**
   * Called each tick to update this behavior.
   */
  update?(): void {}

  /**
   * Called when the bot leaves this behavior state.
   */
  onStateExited?(): void {}

  /**
   * Called if the behavior is anonymous per tick, checks if task is complete.
   */
  exitCase?(): boolean {
    return false;
  }

  constructor(bot: Bot, data: StateMachineData) {
    super();
    this.bot = bot;
    this.data = data;
  }
}

/**
 * The parameters for initializing a state transition.
 */
export interface HiveTransitionParameters {
  parent: typeof HiveBehavior;
  child: typeof HiveBehavior;
  name?: string;
  additionalArguments?: any[];
  shouldTransition?: (data: StateMachineData) => boolean;
  onTransition?: (data: StateMachineData) => void;
}

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class HiveTransition {
  readonly parentState: typeof HiveBehavior;
  readonly childState: typeof HiveBehavior;
  readonly additionalArguments?: any[];
  private triggerState: boolean = false;
  shouldTransition: (data: StateMachineData) => boolean;
  onTransition: (data: StateMachineData) => void;
  transitionName?: string;

  constructor({
    parent,
    child,
    name,
    additionalArguments,
    shouldTransition = (data) => false,
    onTransition = (data) => {},
  }: HiveTransitionParameters) {
    this.parentState = parent;
    this.childState = child;
    this.shouldTransition = shouldTransition;
    this.onTransition = onTransition;
    this.transitionName = name;
    this.additionalArguments = additionalArguments;
  }

  trigger(): void {
    // I may need to re-implement this later.
    // if (!this.parentState.active) {
    //     return;
    // }

    this.triggerState = true;
  }

  isTriggered(): boolean {
    return this.triggerState;
  }

  resetTrigger(): void {
    this.triggerState = false;
  }
}
