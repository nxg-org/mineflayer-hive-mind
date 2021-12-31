import { Bot } from "mineflayer";

/**
 * A simple behavior state plugin for handling AI state machine
 * changes.
 */
export interface HiveBehavior {
    autonomous: boolean;
    /**
     * The name of this behavior state.
     */
    stateName: string;

    /**
     * Gets whether or not this state is currently active.
     */
    active: boolean;
    /**
     * Called when the bot enters this behavior state.
     */
    onStateEntered?: (...bots: Bot[]) => void;

    /**
     * Called each tick to update this behavior.
     */
    update?: () => void;

    /**
     * Called when the bot leaves this behavior state.
     */
    onStateExited?: () => void;

    /**
     * Called if the behavior is anonymous per tick, checks if task is complete.
     */
    exitCase?: () => boolean;
}

/**
 * The parameters for initializing a state transition.
 */
export interface HiveTransitionParameters {
    parent: HiveBehavior;
    child: HiveBehavior;
    name?: string;
    shouldTransition?: () => boolean;
    onTransition?: () => void;
}

/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class HiveTransition {
    readonly parentState: HiveBehavior;
    readonly childState: HiveBehavior;
    private triggerState: boolean = false;
    shouldTransition: () => boolean;
    onTransition: () => void;
    name?: string;

    /**
     * Creates a new one-way state transition between two states.
     *
     * @param parent - The state to move from.
     * @param child - The state to move to.
     * @param name - The name of this transition.
     * @param shouldTransition - Runs each tick to check if this transition should be called.
     * @param onTransition - Called when this transition is run.
     * @param transitionName - The unique name of this transition.
     */
    constructor({ parent, child, name, shouldTransition = () => false, onTransition = () => {} }: HiveTransitionParameters) {
        this.parentState = parent;
        this.childState = child;
        this.shouldTransition = shouldTransition;
        this.onTransition = onTransition;
        this.name = name;
    }

    /**
     * Triggers this transition to occur on the next Minecraft tick,
     * regardless of the "shouldTransition" function.
     *
     * @throws Exception if this transition is not yet bound to a
     * state machine.
     */
    trigger(): void {
        if (!this.parentState.active) {
            return;
        }

        this.triggerState = true;
    }

    /**
     * Checks if this transition if currently triggered to run. This is
     * separate from the shouldTransition function.
     *
     * @returns True if this transition was triggered to occur.
     */
    isTriggered(): boolean {
        return this.triggerState;
    }

    /**
     * Resets the triggered state to false.
     */
    resetTrigger(): void {
        this.triggerState = false;
    }
}
