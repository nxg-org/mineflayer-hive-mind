import type { Bot, Player } from "mineflayer";
import type { Entity } from "prismarine-entity";
import type { Item } from "prismarine-item";
import type { Vec3 } from "vec3";

/**
 * A collection of targets which the bot is currently
 * storing in memory. These are primarily used to allow
 * states to communicate with each other more effectively.
 */
export interface StateMachineTargets {
    entity?: Entity
    position?: Vec3
    item?: Item
    player?: Player
    blockFace?: Vec3
  
    entities?: Entity[]
    positions?: Vec3[]
    items?: Item[]
    players?: Player[]
  }
  

export class HiveBehavior {
    /**
     * The name of this behavior state.
     */
    static stateName: string = this.constructor.name;

    /**
     * Whether the behavior is allowed autonomy.
     */
    static autonomous: boolean = false;

    /**
     * Bot the state is related to.
     */
    readonly bot: Bot;

    /**
     * Data instance.
     */
    readonly data: StateMachineTargets;

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

    constructor(bot: Bot, data: StateMachineTargets) {
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
    shouldTransition?: () => boolean;
    onTransition?: () => void;
}

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class HiveTransition {
    readonly parentState: typeof HiveBehavior;
    readonly childState: typeof HiveBehavior;
    private triggerState: boolean = false;
    shouldTransition: () => boolean;
    onTransition: () => void;
    name?: string;
    
    constructor({ parent, child, name, shouldTransition = () => false, onTransition = () => {} }: HiveTransitionParameters) {
        this.parentState = parent;
        this.childState = child;
        this.shouldTransition = shouldTransition;
        this.onTransition = onTransition;
        this.name = name;
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
