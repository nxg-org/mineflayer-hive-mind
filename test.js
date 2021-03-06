const mineflayer = require('mineflayer')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalInvert, GoalFollow } = require('mineflayer-pathfinder').goals

mineflayer.multiple = (bots, constructor) => {
  const { Worker, isMainThread, workerData } = require('worker_threads')
  if (isMainThread) {
    const threads = []
    for (const i in bots) {
      threads.push(new Worker(__filename, { workerData: bots[i] }))
    }
  } else {
    constructor(workerData)
  }
}

const bots = []
for (let i = 0; i < 10; i++) {
  bots.push({ username: `Bot${i}` })
}

mineflayer.multiple(bots, ({ username }) => {
  const bot = mineflayer.createBot({ username, host: "localhost", version: "1.17.1", viewDistance: 'tiny' })

  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    // Once we've spawn, it is safe to access mcData because we know the version
    const mcData = require('minecraft-data')(bot.version)

    // We create different movement generators for different type of activity
    const defaultMove = new Movements(bot, mcData)
    defaultMove.allowFreeMotion = true
    bot.pathfinder.searchRadius = 10

    bot.on('path_update', (results) => {
      console.log('[' + username + '] I can get there in ' + results.path.length + ' moves. Computation took ' + results.time.toFixed(2) + ' ms.')
    })

    bot.on('goal_reached', (goal) => {
      console.log('[' + username + '] Here I am !')
    })

    bot.on('chat', (username, message) => {
      if (username === bot.username) return

      const target = bot.players[username].entity
      if (message === 'follow') {
        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalFollow(target, 5), true)
      } else if (message === 'avoid') {
        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalInvert(new GoalFollow(target, 5)), true)
      } else if (message === 'stop') {
        bot.pathfinder.setGoal(null)
      }
    })
  })
})