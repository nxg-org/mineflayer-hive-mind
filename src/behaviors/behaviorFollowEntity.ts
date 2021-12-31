import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Movements, goals } from "mineflayer-pathfinder";
import mcDataLoader from "minecraft-data";
import { HiveBehavior } from "../HiveMindStates";

/**
 * Causes the bot to follow the target entity.
 *
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorFollowEntity implements HiveBehavior {
    movements?: Movements;
    bots: Bot[];
    target?: Entity;

    stateName: string = "followEntity";
    active: boolean = false;

    followDistance: number = 0;
    autonomous: boolean = true;

    constructor() {
        this.bots = [];
    }

    onStateEntered(...bots: Bot[]): void {
        this.bots = bots;
        const bot = bots[0];
        const mcData = mcDataLoader(bot.version);
        this.movements = new Movements(bot, mcData);
        this.target = bot.nearestEntity(e => e.type === "player" && !this.bots.map(b => b.entity).includes(e)) ?? undefined;
        this.startMoving(this.target)
    }

    onStateExited(): void {
        this.stopMoving();
        this.target = undefined;
    }

    exitCase(): boolean {
        const distances = this.distanceToTarget()
        return (distances.reduce((a, b) => a + b) / distances.length) < 3
    }


    setFollowTarget(entity: Entity): void {
        if (this.target === entity) {
            return;
        }

        this.target = entity;
        this.restart();
    }


    private stopMoving(): void {
        if (this.bots.length === 0) return;
        for (const bot of this.bots){
            const pathfinder = bot.pathfinder.setGoal(null);
        }

    }

    private startMoving(entity?: Entity): void {
        if (this.bots.length === 0) return;
        if (entity == null) return;
        for (const bot of this.bots){
            if (entity === this.target && bot.pathfinder.isMoving()) continue;
            const pathfinder = bot.pathfinder;
            const goal = new goals.GoalFollow(entity, this.followDistance);
            if (this.movements) pathfinder.setMovements(this.movements);
            pathfinder.setGoal(goal, true);
        }
    }


    restart(): void {
        if (!this.active) {
            return;
        }

        this.stopMoving();
        this.startMoving(this.target);
    }

    distanceToTarget(): number[] {
        if (this.bots.length === 0 || !this.target) return this.bots.map(b => 0)
        return this.bots.map(b => b.entity.position.distanceTo(this.target!.position))
    }
}
