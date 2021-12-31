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
export class BehaviorFollowEntity extends HiveBehavior {
    static stateName: string = "followEntity";
    static autonomous: boolean = true;
    movements?: Movements;
    target?: Entity;
    followDistance: number = 0;



    constructor(bot: Bot) {
        super(bot);
    }

    onStateEntered = () => {
        const mcData = mcDataLoader(this.bot.version);
        this.movements = new Movements(this.bot, mcData);
        this.target = this.bot.nearestEntity((e) => e.username === "Generel_Schwerz") ?? undefined;
        this.startMoving(this.target);
    };

    onStateExited(): void {
        this.stopMoving();
        this.target = undefined;
    }

    exitCase(): boolean {
        const distances = this.distanceToTarget();
        return distances < 3;
    }

    setFollowTarget(entity: Entity): void {
        if (this.target === entity) {
            return;
        }

        this.target = entity;
        this.restart();
    }

    private stopMoving(): void {
        this.bot.pathfinder.setGoal(null);
    }

    private startMoving(entity?: Entity): void {
        if (entity == null) return;
        if (entity === this.target && this.bot.pathfinder.isMoving()) return;
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
        this.startMoving(this.target);
    }

    distanceToTarget(): number {
        if (!this.target) return 0;
        return this.bot.entity.position.distanceTo(this.target.position);
    }
}
