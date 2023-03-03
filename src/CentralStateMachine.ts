import EventEmitter from "events";
import { Bot } from "mineflayer";
import StrictEventEmitter from "strict-event-emitter-types/types/src";
import { StateBehavior, StateTransition, StateMachineData } from "./StateBehavior";
import { NestedHiveMind } from "./NestedStateMachine";

export interface CentralHiveMindEvents {
  stateEntered: (cls: NestedHiveMind, newState: typeof StateBehavior) => void;
  stateExited: (cls: NestedHiveMind, oldState: typeof StateBehavior) => void;
}


export interface CentralStateMachineOptions {
  bot: Bot,
  root: typeof NestedHiveMind,
  data?: StateMachineData,
  autoStart?: boolean,
  autoUpdate?: boolean
}

export class CentralStateMachine extends (EventEmitter as {
  new (): StrictEventEmitter<EventEmitter, CentralHiveMindEvents>;
}) {
  readonly bot: Bot;
  readonly root: NestedHiveMind;

  readonly transitions: StateTransition[];
  readonly states: typeof StateBehavior[];
  readonly nestedHives: NestedHiveMind[];

  constructor({
    bot,
    root,
    data = {},
    autoStart = true,
    autoUpdate = true
  }: CentralStateMachineOptions) {
    super();
    this.bot = bot;
    this.root = new root(bot, data);
    this.states = [];
    this.transitions = [];
    this.nestedHives = [];
    this.findStatesRecursive(this.root);
    this.findTransitionsRecursive(this.root);
    this.findNewHiveMindNesteds(this.root);


    if (autoStart) {
      this.root.active = true;
      this.root.onStateEntered();

      if (autoUpdate) {

        // lazy impl, perhaps change later.
        this.bot.on("physicsTick", this.update);
      }
    }
  }


  public start() {
    if (this.root.active) throw "Hivemind already started! No need to start again.";
    this.root.active = true;
    this.root.onStateEntered();

    if (!this.bot.listeners("physicsTick").includes(this.update)) {
      this.bot.on("physicsTick", this.update);
    }
  }



  private findNewHiveMindNesteds(nested: NestedHiveMind, depth: number = 0): void {
    this.nestedHives.push(nested);
    nested.depth = depth;

    nested.on("stateEntered", (state) => this.emit("stateEntered", nested, state));
    nested.on("stateExited", (state) => this.emit("stateExited", nested, state));
 
    for (const state of nested.staticRef.states) {
      if (state instanceof NestedHiveMind) {
        this.findNewHiveMindNesteds(state, depth + 1);
      }
    }
  }

  private findStatesRecursive(nested: NestedHiveMind): void {
    for (const state of nested.staticRef.states) {
      this.states.push(state);

      if (state instanceof NestedHiveMind) {
        this.findStatesRecursive(state);
      }
    }
  }

  private findTransitionsRecursive(nested: NestedHiveMind): void {
    for (const trans of nested.staticRef.transitions) {
      this.transitions.push(trans);
    }

    for (const state of nested.staticRef.states) {
      if (state instanceof NestedHiveMind) {
        this.findTransitionsRecursive(state);
      }
    }
  }

  /**
   * Called each tick to update the root state machine.
   */
  public update = () => {
    this.root.update();
  };

}
