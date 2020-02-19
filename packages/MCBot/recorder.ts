import $ from './langs'
import Client from './Client'
import crc32 from 'crc/lib/es6/crc32'
import { join } from 'path'
import { PacketMeta } from 'minecraft-protocol'
import { createWriteStream, WriteStream } from 'fs'
import { Yazl, constants, fs, version } from '@plugin'

export interface Recorder {
  recording: boolean
  record (): void
  pauseRecord (): void
  continueRecord (): void
  stopRecord (restart?: boolean): void
}

const ROOT = join(constants.GAME_ROOT, 'replay_recordings')

const BAD_PACKETS = [
  'compress',
  'unlock_recipes',
  'advancements',
  'select_advancement_tab',
  'update_health',
  'open_window',
  'close_window',
  'set_slot',
  'window_items',
  'open_sign_entity',
  'statistics',
  'experience',
  'camera',
  'abilities',
  'title'
]

const USELESS_PACKETS = [
  'keep_alive',
  'difficulty',
  'tab_complete',
  'transaction',
  'craft_progress_bar',
  'open_horse_window',
  'game_state_change',
  'set_cooldown',
  'craft_progress_bar',
  'trade_list',
  'craft_recipe_response',
  'open_book',
  'scoreboard_score',
  'teams',
  'map',
  'declare_commands',
  'scoreboard_display_objective',
  'scoreboard_objective'
]

const USELESS_PACKETS_MAPPING: Record<string, null> = { }
for (const id of BAD_PACKETS) USELESS_PACKETS_MAPPING[id] = null
for (const id of USELESS_PACKETS) USELESS_PACKETS_MAPPING[id] = null

const pad = (i: number) => i.toString().padStart(2, '0')

export default (bot: Client, key: string, instance: import('./index').default): Client & Recorder => {
  const ret: Client & Recorder = bot as any
  let stream: WriteStream
  let crc: number
  let startAfkTime: number
  let afkTime = 0
  let startTime: number
  let checkTimer: NodeJS.Timeout
  let dirName: string
  let fileName: string
  let tmcprName: string

  const fn = (parsed: { buffer: Buffer, metadata: PacketMeta, data: any }) => {
    if (startAfkTime) return
    try {
      const cfg = instance.config[key]
      if (typeof USELESS_PACKETS_MAPPING[parsed.metadata.name] === 'object') return
      switch (parsed.metadata.name) {
        case 'spawn_entity':
          if (cfg.removeItems && ret.data.entitiesByName && parsed.data.type ===
            ret.data.entitiesByName.item.id) return; break
        case 'spawn_entity_experience_orb': if (cfg.removeExperienceOrb) return; break
        case 'spawn_entity_living':
          if (!ret.data.entitiesByName) break
          if (cfg.removeBats && parsed.data.type === ret.data.entitiesByName.bat.id) return
          if (cfg.removePhantoms && parsed.data.type === ret.data.entitiesByName.phantom.id) return
          break
        case 'update_time':
          if (cfg.daytime >= 0 && cfg.daytime <= 24000) {
            parsed.buffer.writeBigInt64BE(BigInt(cfg.daytime), parsed.buffer.length - 8)
          }
          break
        case 'game_state_change':
          if (cfg.noWeather && (parsed.data.reason === 1 || parsed.data.reason === 2)) return; break
        case 'named_entity_spawn':
          if (Object.values(ret.players).some(it => it.visible)) ret.pauseRecord()
      }
      const head = Buffer.alloc(8)
      const currentTime = Date.now() - startTime - afkTime
      head.writeInt32BE(currentTime, 0)
      head.writeInt32BE(parsed.buffer.length, 4)
      crc = crc32(head, crc)
      stream.write(head)
      stream.write(parsed.buffer)
      crc = crc32(parsed.buffer, crc)
      if (cfg.splitTime > 10 * 60 * 1000 && currentTime > cfg.splitTime) ret.stopRecord(true)
    } catch (e) { console.error(e) }
  }

  const uuids = new Set<string>()
  ret.recording = false
  ret.pauseRecord = () => {
    if (!ret.recording || startAfkTime) return
    startAfkTime = Date.now()
  }
  ret.continueRecord = () => {
    if (!ret.recording || !startAfkTime) return
    afkTime += Date.now() - startAfkTime
    startAfkTime = 0
  }
  ret.record = () => {
    if (ret.recording) return
    const time = new Date()
    startTime = time.getTime()
    fileName = `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDay())}_${pad(time.getHours())}-${pad(time.getMinutes())}_${time.getMilliseconds()}.mcpr`
    dirName = join(ROOT, fileName + '.cache')
    tmcprName = join(dirName, 'recording.tmcpr')
    fs.ensureDirSync(dirName)
    crc = 0
    stream = createWriteStream(tmcprName)
    ret.recording = true
    ret.client.on('parsed', fn)
    const cfg = instance.config[key]
    if (cfg.withPlayerOnly && cfg.checkTime > 1000) {
      checkTimer = setInterval(() => Object.values(ret.players).every(it => !it.visible) &&
        ret.pauseRecord(), cfg.checkTime)
    }
    instance.addText(key, $.recording)
    instance.update()
  }
  ret.stopRecord = (restart = false) => {
    if (!ret.recording) return
    ret.recording = false
    clearInterval(checkTimer)
    instance.addText(key, $.stopRecording)
    instance.update()
    stream.end(() => {
      try {
        const zip = new Yazl.ZipFile()
        zip.outputStream.pipe(createWriteStream(join(ROOT, fileName)))
          .on('close', () => console.log('Done!')).on('error', console.error)
        zip.addFile(tmcprName, 'recording.tmcpr')
        zip.addBuffer(Buffer.from(crc.toString()), 'recording.tmcpr.crc32')
        zip.addBuffer(Buffer.from(JSON.stringify({
          singleplayer: false,
          serverName: '127.0.0.1',
          duration: Date.now() - startTime - afkTime,
          date: startTime,
          mcversion: ret.options.version,
          fileFormat: 'MCPR',
          fileFormatVersion: 14,
          protocol: (ret.options as any).protocolVersion,
          generator: 'PureLauncher-' + version,
          selfId: -1,
          players: [...uuids]
        })), 'metaData.json')
        zip.addBuffer(Buffer.from('{"requiredMods":[]}'), 'mods.json')
        zip.addBuffer(Buffer.from('[]'), 'markers.json')
        zip.end()
      } catch (e) {
        console.error(e)
      } finally {
        if (restart) ret.record()
      }
    })
  }
  ret.on('disconnect', () => ret.recording && ret.stopRecord())
  ret.client
    .on('player_info', data => data.data.forEach(obj => uuids.add(obj.UUID)))
    .on('connect', () => instance.config[key]?.autoRecording && ret.record())
  return ret
}
