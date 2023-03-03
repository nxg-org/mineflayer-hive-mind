import EventEmitter from "events";
import { Bot } from "mineflayer";
import StrictEventEmitter from "strict-event-emitter-types/types/src";
import { HiveBehavior, HiveTransition, StateMachineData } from "./HiveMindStates";
import { NewHiveMindNested } from "./NewHiveMindNested";

export interface CentralHiveMindEvents {
  stateEntered: (cls: NewHiveMindNested, newState: typeof HiveBehavior) => void;
  stateExited: (cls: NewHiveMindNested, oldState: typeof HiveBehavior) => void;
}


export interface CentralHiveMindOptions {
  bot: Bot,
  root: typeof NewHiveMindNested,
  data?: StateMachineData,
  autoStart?: boolean,
  autoUpdate?: boolean
}

export class CentralHiveMind extends (EventEmitter as {
  new (): StrictEventEmitter<EventEmitter, CentralHiveMindEvents>;
}) {
  readonly bot: Bot;
  readonly root: NewHiveMindNested;

  readonly transitions: HiveTransition[];
  readonly states: typeof HiveBehavior[];
  readonly nestedHives: NewHiveMindNested[];

  constructor({
    bot,
    root,
    data = {},
    autoStart = true,
    autoUpdate = true
  }: CentralHiveMindOptions) {
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



  private findNewHiveMindNesteds(nested: NewHiveMindNested, depth: number = 0): void {
    this.nestedHives.push(nested);
    nested.depth = depth;

    nested.on("stateEntered", (state) => this.emit("stateEntered", nested, state));
    nested.on("stateExited", (state) => this.emit("stateExited", nested, state));
 
    for (const state of nested.staticRef.states) {
      if (state instanceof NewHiveMindNested) {
        this.findNewHiveMindNesteds(state, depth + 1);
      }
    }
  }

  private findStatesRecursive(nested: NewHiveMindNested): void {
    for (const state of nested.staticRef.states) {
      this.states.push(state);

      if (state instanceof NewHiveMindNested) {
        this.findStatesRecursive(state);
      }
    }
  }

  private findTransitionsRecursive(nested: NewHiveMindNested): void {
    for (const trans of nested.staticRef.transitions) {
      this.transitions.push(trans);
    }

    for (const state of nested.staticRef.states) {
      if (state instanceof NewHiveMindNested) {
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
