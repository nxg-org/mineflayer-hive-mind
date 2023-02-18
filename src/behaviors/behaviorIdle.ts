import { Bot } from 'mineflayer'
import { HiveBehavior } from '../HiveMindStates'

/**
 * The bot will stand idle and do... nothing.
 */
export class BehaviorIdle extends HiveBehavior {

  constructor(bot: Bot) {
    super(bot)
  }
}