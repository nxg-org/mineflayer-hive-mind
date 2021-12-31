import { Bot } from 'mineflayer'
import { HiveBehavior } from '../HiveMindStates'

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle extends HiveBehavior {
  stateName: string = 'idle'
  active: boolean = false
  autonomous: boolean = false
  bots: Bot[] = []

  constructor(bot: Bot) {
    super(bot)
  }
}