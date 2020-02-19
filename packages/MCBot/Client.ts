/* eslint-disable no-void */
import createClient from 'minecraft-protocol/src/createClient'
import { Command } from 'commander'
import { EventEmitter } from 'events'
import data from 'minecraft-data'

const deltaToAbs = (d: number, prev: number) => d / 4096 + prev

const MONSTERS = [
  'blaze',
  'cave_spider',
  'creeper',
  'drowned',
  'elder_guardian',
  'enderman',
  'endermite',
  'evoker_fangs',
  'ghast',
  'giant',
  'guardian',
  'husk',
  'illusioner',
  'magma_cube',
  'phantom',
  'pillager',
  'ravager',
  'silverfish',
  'skeleton',
  'slime',
  'spider',
  'stray',
  'vex',
  'vindicator',
  'witch',
  'wither',
  'wither_skeleton',
  'zombie',
  'zombie_pigman',
  'zombie_villager'
]

class Entity {
  public x = 0
  public y = 0
  public z = 0
  public yaw = 0
  public pitch = 0
  public entityId = 0
  public type = -1
  public uuid = ''
}
class Player extends Entity {
  public visible = false
  constructor (public uuid: string, public name: string) { super() }
}

type C = import('minecraft-protocol').Client
export default class Client extends EventEmitter {
  public readonly command = new Command().exitOverride()
  public readonly client: C
  public readonly send: C['write']
  public readonly uuid: string
  public readonly username: string
  public readonly entities: Record<string, Entity> = { }
  public readonly players: Record<string, Player> = { }
  public readonly playersOfEntityId: Record<number, Player> = {}
  public readonly data: ReturnType<typeof data>

  public x = 0
  public y = 0
  public z = 0
  public yaw = 0
  public pitch = 0
  public onGround = true

  public enableCommand = true
  public isShakeHand = true

  public monsters: Record<string, null> = { }
  public keepWalkTimer: NodeJS.Timeout
  public walkTimer: NodeJS.Timeout
  public digTimer: NodeJS.Timeout
  public useItemTimer: NodeJS.Timeout
  public attackTimer: NodeJS.Timeout
  public placeTimer: NodeJS.Timeout

  constructor (public options: import('minecraft-protocol').ClientOptions, public commandPrefix = '#') {
    super()
    const client = this.client = createClient(options)
    const setSerializer = (client as any).setSerializer
    ;(client as any).setSerializer = state => {
      setSerializer.call(client, state)
      ;(client as any).deserializer.on('data', parsed => {
        parsed.metadata.name = parsed.data.name
        parsed.data = parsed.data.params
        parsed.metadata.state = state
        client.emit('packet', parsed.data, parsed.metadata)
        client.emit(parsed.metadata.name, parsed.data, parsed.metadata)
        client.emit('raw.' + parsed.metadata.name, parsed.buffer, parsed.metadata)
        client.emit('raw', parsed.buffer, parsed.metadata)
        client.emit('parsed', parsed)
      })
    }
    this.data = data(options.version)
    this.send = (name: string, parmas: any) => {
      switch (name) {
        case 'position_look':
          this.x = parmas.x
          this.y = parmas.y
          this.z = parmas.z
          this.yaw = parmas.yaw
          this.pitch = parmas.pitch
          this.onGround = parmas.onGround
          break
        case 'position':
          this.x = parmas.x
          this.y = parmas.y
          this.z = parmas.z
          this.onGround = parmas.onGround
          break
        case 'look':
          this.yaw = parmas.yaw
          this.pitch = parmas.pitch
          this.onGround = parmas.onGround
      }
      client.write(name, parmas)
    }
    this.uuid = client.uuid
    this.username = client.username

    if (this.data && this.data.entitiesByName) {
      MONSTERS.forEach(it => {
        const e = this.data.entitiesByName[it]
        if (e) this.monsters[e.internalId] = null
      })
    }

    this.command.command('stop').action(() => this.stop())
    this.command.command('swap').action(() => this.swap())
    this.command.command('getOff').action(() => this.getOff())
    this.command.command('held [id]').action(id => this.setHeldItem(parseInt(id) || undefined))
    this.command.command('attack [distance]').action(distance => this.attack(parseFloat(distance) || undefined))
    this.command.command('getOn [distance]').action(distance => this.getOn(parseFloat(distance) || undefined))
    this.command.command('keepAttack [distance]').action(distance => this.keepAttack(parseFloat(distance) || undefined))
    this.command.command('drop [all]').action(all => this.drop(all === 'true'))
    this.command.command('useItem [left]').action(left => this.useItem(left === 'true'))
    this.command.command('keepUseItem [left]').action(left => this.keepUseItem(left === 'true'))
    this.command.command('look <player>').action((player: string) => this.lookPlayer(player))
    this.command.command('lookWith <player>').action((player: string) => this.lookWith(player))
    this.command.command('jump [height]').action(height => this.jump(parseFloat(height) || undefined))
    this.command.command('dig [distance]').action(distance => this.dig(parseFloat(distance) || undefined))
    this.command.command('keepDig [distance]').action(distance => this.keepDigging(parseFloat(distance) || undefined))
    this.command.command('respawn').action(() => this.respawn())
    this.command.command('keepWalk [step]').action(step => this.keepWalk(parseFloat(step) || undefined))
    this.command.command('place [left] [distance]')
      .action((left, distance) => this.place(left === 'true', parseFloat(distance) || undefined))
    this.command.command('keepPlace [left] [distance]')
      .action((left, distance) => this.keepPlace(left === 'true', parseFloat(distance) || undefined))
    this.command.command('walkTo <player> [step]')
      .action((player, step) => this.walkTo(player, parseFloat(step) || undefined))
    this.command.command('walk <dx> <dy> <dz> [step]').action((dx, dy, dz, step) => {
      const x = parseFloat(dx)
      const y = parseFloat(dy)
      const z = parseFloat(dz)
      console.log(dx, dy)
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) this.walk(x, y, z, parseFloat(step) || undefined)
    })

    this.client.on('named_entity_spawn', data => {
      const obj = this.players[data.playerUUID]
      if (!obj) return
      obj.x = data.x
      obj.y = data.y
      obj.z = data.z
      obj.yaw = data.yaw
      obj.pitch = data.pitch
      obj.entityId = data.entityId
      this.playersOfEntityId[obj.entityId] = obj
    })
      .on('chat', data => {
        if (!this.enableCommand) return
        const t = JSON.parse(data.message).extra
        if (!t) return
        const text: string = t.map(it => it.text).join('')
        const i = text.indexOf(this.commandPrefix)
        if (!~i) return
        const cmd = text.slice(i + this.commandPrefix.length).split(' ')
        cmd.unshift(this.commandPrefix, '#')
        try { this.command.parse(cmd) } catch (e) { console.log(e) }
      })
      .on('player_info', data => {
        data.data.forEach(obj => {
          const uuid = obj.UUID
          switch (data.action) {
            case 0:
              this.players[uuid] = new Player(uuid, obj.name)
              break
            case 4: {
              const p = this.players[uuid]
              if (!p) break
              delete this.players[uuid]
              delete this.playersOfEntityId[p.entityId]
            }
          }
        })
      })
      .on('entity_look', data => {
        const p = this.playersOfEntityId[data.entityId]
        if (p) {
          p.visible = true
          p.yaw = data.yaw
          p.pitch = data.pitch
        }
        const e = this.entities[data.entityId]
        if (e) {
          e.yaw = data.yaw
          e.pitch = data.pitch
        }
      })
      .on('entity_move_look', data => {
        const p = this.playersOfEntityId[data.entityId]
        if (p) {
          if (data.dX) p.x = deltaToAbs(data.dX, p.x)
          if (data.dY) p.y = deltaToAbs(data.dY, p.y)
          if (data.dZ) p.z = deltaToAbs(data.dZ, p.z)
          p.visible = true
          p.yaw = data.yaw
          p.pitch = data.pitch
        }
        const e = this.entities[data.entityId]
        if (e) {
          if (data.dX) e.x = deltaToAbs(data.dX, e.x)
          if (data.dY) e.y = deltaToAbs(data.dY, e.y)
          if (data.dZ) e.z = deltaToAbs(data.dZ, e.z)
          e.yaw = data.yaw
          e.pitch = data.pitch
        }
      })
      .on('rel_entity_move', data => {
        const p = this.playersOfEntityId[data.entityId]
        if (p) {
          p.visible = true
          if (data.dX) p.x = deltaToAbs(data.dX, p.x)
          if (data.dY) p.y = deltaToAbs(data.dY, p.y)
          if (data.dZ) p.z = deltaToAbs(data.dZ, p.z)
        }
        const e = this.entities[data.entityId]
        if (e) {
          if (data.dX) e.x = deltaToAbs(data.dX, e.x)
          if (data.dY) e.y = deltaToAbs(data.dY, e.y)
          if (data.dZ) e.z = deltaToAbs(data.dZ, e.z)
        }
      })
      .on('entity_teleport', data => {
        const p = this.playersOfEntityId[data.entityId]
        if (p) {
          p.visible = true
          p.x = data.x
          p.y = data.y
          p.z = data.z
          p.yaw = data.yaw
          p.pitch = data.pitch
        }
        const e = this.entities[data.entityId]
        if (e) {
          e.x = data.x
          e.y = data.y
          e.z = data.z
          e.yaw = data.yaw
          e.pitch = data.pitch
        }
      })
      .on('position', data => {
        this.x = data.x
        this.y = data.y
        this.z = data.z
        this.yaw = data.yaw
        this.pitch = data.pitch
        this.onGround = data.onGround
        this.send('teleport_confirm', { teleportId: data.teleportId })
      })
      .on('entity_destroy', data => data.entityIds.forEach(it => {
        const p = this.playersOfEntityId[it]
        if (p) p.visible = false
        if (typeof this.entities[it] !== 'undefined') delete this.entities[it]
      }))
      .on('disconnect', data => this.emit('disconnect', data.reason))
      .on('kick_disconnect', data => this.emit('disconnect', data.reason))
      .on('spawn_entity_living', data => {
        const entity = new Entity()
        entity.x = data.x
        entity.y = data.y
        entity.z = data.z
        entity.entityId = data.entityId
        entity.uuid = data.entityUUID
        entity.type = data.type
        entity.pitch = data.pitch
        entity.yaw = data.yaw
        this.entities[data.entityId] = entity
      })
  }

  public getPlayer (name: string) {
    name = name.toLowerCase()
    for (const it in this.players) {
      const p = this.players[it]
      if (p.name.toLowerCase() === name) return p
    }
  }

  public getPlayerByUUID (uuid: string) { return this.players[uuid] }

  public getNearsetPlayer () {
    let player: Player
    let i = Infinity
    for (const it in this.players) {
      const p = this.players[it]
      if (p.visible) continue
      const j = Math.sqrt((p.x - this.x) ** 2 + (p.y - this.y) ** 2 + (p.z - this.z) ** 2)
      if (j < i) {
        i = j
        player = p
      }
    }
    return player
  }

  public getVisiblePlayers () { return Object.values(this.players).filter(it => it.visible) }

  public getDistance (e: Entity) { return Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2 + (e.z - this.z) ** 2) }

  public lookWith (player: string) {
    if (!player) return
    player = player.toLowerCase()
    const p = this.getPlayer(player)
    if (p) this.send('look', { yaw: p.yaw, pitch: p.pitch })
  }

  public look (e: Entity) {
    if (!e) return
    const dx = this.x - e.x
    const dy = this.y - e.y
    const dz = this.z - e.z
    this.send('look', {
      pitch: Math.atan2(dy, Math.sqrt(dx ** 2 + dz ** 2)) * 180 / Math.PI,
      yaw: Math.atan2(dx, -dz) * 180 / Math.PI
    })
  }

  public lookPlayer (player: string) {
    if (!player) return
    this.look(this.getPlayer(player.toLowerCase()))
  }

  public respawn () { this.send('client_command', { actionId: 0 }) }

  public keepWalk (step = 0.5) {
    if (this.keepWalkTimer) clearInterval(this.keepWalkTimer)
    this.keepWalkTimer = setInterval(() => {
      const pitch = this.pitch / 180 * Math.PI
      const yaw = this.yaw / 180 * Math.PI
      this.send('position', {
        x: this.x - Math.cos(pitch) * Math.sin(yaw) * step,
        y: this.y - Math.sin(pitch) * step,
        z: this.z + Math.cos(pitch) * Math.cos(yaw) * step,
        onGround: this.onGround
      })
    }, 100)
  }

  public walk (x = 0, y = 0, z = 0, step = 0.2, cb?: () => void) {
    if (this.walkTimer) clearInterval(this.walkTimer)
    const max = Math.max(Math.abs(x), Math.abs(y), Math.abs(z))
    const len = max / step
    const dx = x / max * step
    const dy = y / max * step
    const dz = z / max * step
    let i = 0
    this.walkTimer = setInterval(() => {
      if (i > len) {
        clearInterval(this.walkTimer)
        this.walkTimer = null
        if (cb) cb()
        return
      }
      this.send('position', {
        x: this.x + dx,
        y: this.y + dy,
        z: this.z + dz,
        onGround: this.onGround
      })
      i++
    }, 50)
  }

  public walkTo (player: string, step = 0.2) {
    if (!player) return
    player = player.toLowerCase()
    const p = this.getPlayer(player)
    if (!p) return
    this.walk(p.x - this.x, p.y - this.y, p.z - this.z, step)
  }

  public stop () {
    if (this.keepWalkTimer) {
      clearInterval(this.keepWalkTimer)
      this.keepWalkTimer = null
    }
    if (this.walkTimer) {
      clearInterval(this.walkTimer)
      this.walkTimer = null
    }
    if (this.digTimer) {
      clearInterval(this.digTimer)
      this.digTimer = null
    }
    if (this.useItemTimer) {
      clearInterval(this.useItemTimer)
      this.useItemTimer = null
    }
    if (this.attackTimer) {
      clearInterval(this.attackTimer)
      this.attackTimer = null
    }
    if (this.placeTimer) {
      clearInterval(this.placeTimer)
      this.placeTimer = null
    }
    this.emit('stop')
  }

  public jump (height = 1) {
    this.send('position', {
      x: this.x,
      y: (this.y | 0) + height,
      z: this.z,
      onGround: this.onGround
    })
    setTimeout(() => {
      this.send('position', {
        x: this.x,
        y: (this.y | 0) - height,
        z: this.z,
        onGround: this.onGround
      })
    }, 100)
  }

  public dig (distance = 1) {
    const pitch = this.pitch / 180 * Math.PI
    const yaw = this.yaw / 180 * Math.PI
    const location = {
      x: Math.round(this.x - Math.cos(pitch) * Math.sin(yaw) * distance - 0.5),
      y: Math.round(this.y - Math.sin(pitch) * distance) + 1,
      z: Math.round(this.z + Math.cos(pitch) * Math.cos(yaw) * distance)
    }
    this.send('block_dig', {
      location,
      face: 1,
      status: 0
    })
    this.send('block_dig', {
      location,
      face: 1,
      status: 2
    })
  }

  public keepDigging (distance?: number) {
    if (this.digTimer) clearInterval(this.digTimer)
    this.digTimer = setInterval(() => {
      this.dig(distance)
      if (this.isShakeHand) this.shakeHand()
    }, 40)
  }

  public useItem (left = false) {
    this.send('use_item', { hand: +left })
  }

  public keepUseItem (left?: boolean) {
    if (this.useItemTimer) clearInterval(this.useItemTimer)
    this.useItemTimer = setInterval(() => this.useItem(left), 200)
  }

  public swap () {
    this.send('block_dig', { location: { x: 0, y: 0, z: 0 }, face: 0, status: 6 })
  }

  public drop (all = false) {
    this.send('block_dig', { location: { x: 0, y: 0, z: 0 }, face: 0, status: all ? 3 : 4 })
  }

  public getNearestEntity (distance = 6, filter?: (e: Entity) => any) {
    let entities = Object.values(this.entities)
    if (filter) entities = entities.filter(filter)
    const ret = entities.map((it, i) => [this.getDistance(it), i]).sort((a, b) => a[0] - b[0])[0]
    return ret && ret[0] <= distance ? { entity: entities[ret[1]], distance: ret[0] } : undefined
  }

  public getOn (distance?: number) {
    if (!this.data.entitiesByName) return
    const boat = this.data.entitiesByName.boat.id
    const minecart = this.data.entitiesByName.minecart.id
    const e = this.getNearestEntity(distance, it => it.type === boat || it.type === minecart)
    if (e) this.send('use_entity', { target: e.entity.entityId, mouse: 0, x: 0, y: 0, z: 0, hand: 0 })
  }

  public getOff () {
    this.send('steer_vehicle', { sideways: 1, forward: 1, jump: 2 })
  }

  public attack (distance?: number) {
    const e = this.getNearestEntity(distance, it => typeof this.monsters[it.type] === 'object')
    if (!e) return
    this.look(e.entity)
    this.send('use_entity', { target: e.entity.entityId, mouse: 1, x: 0, y: 0, z: 0, hand: 0 })
    if (this.isShakeHand) this.shakeHand()
  }

  public shakeHand (hand = 0) { this.send('arm_animation', { hand }) }

  public keepAttack (distance?: number) {
    if (this.attackTimer) clearInterval(this.attackTimer)
    this.attackTimer = setInterval(() => this.attack(distance), 600)
  }

  public setHeldItem (slotId = 0) { this.send('held_item_slot', { slotId }) }

  public place (left = false, distance = 1) {
    const pitch = this.pitch / 180 * Math.PI
    const yaw = this.yaw / 180 * Math.PI
    const location = {
      x: Math.round(this.x - Math.cos(pitch) * Math.sin(yaw) * distance - 0.5),
      y: Math.round(this.y - Math.sin(pitch) * distance),
      z: Math.round(this.z + Math.cos(pitch) * Math.cos(yaw) * distance)
    }
    const hand = +left
    this.send('block_place', { hand, location, direction: 1, cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5, insideBlock: false })
  }

  public keepPlace (left?: boolean, distance?: number) {
    if (this.placeTimer) clearInterval(this.placeTimer)
    this.placeTimer = setInterval(() => this.place(left, distance), 200)
  }

  public disconnect () {
    this.client.end('Disconnected')
    this.emit('disconnect')
  }
}

// const c = new Client({
//   host: 'hz.apisium.cn',
//   port: 25587,
//   username: 'ShirasawaSama',
//   version: '1.14.4'
// })

// setInterval(() => c.look('ShirasawaSama'), 100)

// c.command.command('dance').action(async () => {
//   const vt = 0.1
//   const maxt = Math.PI * 2
//   const maxi = Math.ceil(maxt / vt)
//   const size = 0.4
//   for (let i = 0, t = 0; i <= maxi; i++) {
//     const x = -210 + 16 * size * Math.sin(t) ** 3
//     const y = 80 + (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * size
//     t += vt
//     c.send('position', {
//       x,
//       y,
//       z: 150,
//       onGround: c.onGround
//     })
//     await new Promise(resolve => setTimeout(resolve, 50))
//   }
// })
// c
//   .on('chat', data => {
//     let text = ''
//     const formats = []
//     const msg = JSON.parse(data.message)
//     const t = msg.extra
//     if (t && t.length) {
//       t.forEach(it => {
//         text += '%c' + it.text
//         // let format = ''g
//         // if (it.color) format += `color:${it.color};`
//         // formats.push(format)
//       })
//     }
//     formats.unshift(text + (msg.text || ''))
//     console.log.apply(null, formats)
//   })
//   .on('update_health', data => {
//     if (data.health < 1) {
//       c.respawn()
//       console.log('你去世了')
//     }
//   })
