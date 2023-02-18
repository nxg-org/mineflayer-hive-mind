import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Movements, goals } from "mineflayer-pathfinder";
import { HiveBehavior } from "../HiveMindStates";

/**
 * Causes the bot to follow the target entity.
 *
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorFollowEntity extends HiveBehavior {
    static stateName: string = "followEntity";
    static autonomous: boolean = true;
    movements?: Movements;
    data?: Entity;
    followDistance: number = 0;



    constructor(bot: Bot) {
        super(bot);
    }

    onStateEntered = () => {
        const mcData = this.bot.registry;
        this.movements = new Movements(this.bot, mcData);
        this.data = this.bot.nearestEntity((e) => e.username === "Generel_Schwerz") ?? undefined;
        this.startMoving(this.data);
    };

    onStateExited(): void {
        this.stopMoving();
        this.data = undefined;
    }

    exitCase(): boolean {
        const distances = this.distanceToTarget();
        return distances < 3;
    }

    setFollowTarget(entity: Entity): void {
        if (this.data === entity) {
            return;
        }

        this.data = entity;
        this.restart();
    }

    private stopMoving(): void {
        this.bot.pathfinder.setGoal(null);
    }

    private startMoving(entity?: Entity): void {
        if (entity == null) return;
        if (entity === this.data && this.bot.pathfinder.isMoving()) return;
        const pathfinder = this.bot.pathfinder;
        const goal = new goals.GoalFollow(entity, this.followDistance);
        if (this.movements) pathfinder.setMovements(this.movements);
        pathfinder.setGoal(goal, true);
    }

    restart(): void {
        if (!this.active) {
            return;
        }

        this.stopMoving();
        this.startMoving(this.data);
    }

    distanceToTarget(): number {
        if (!this.data) return 0;
        return this.bot.entity.position.distanceTo(this.data.position);
    }
}
