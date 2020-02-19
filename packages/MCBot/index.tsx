/* eslint-disable no-unused-expressions */
import { version } from './package.json'
import { React, Plugin, plugin, event, history, pluginMaster, LiveRoute, fs, constants } from '@plugin'
import { join } from 'path'
import { render } from '@xmcl/text-component'
import Page from './Page'
import $ from './langs'
import Client from './Client'
import setupRecorder, { Recorder } from './recorder'

const CONFIG_PATH = join(constants.APP_PATH, 'mc-bot-config.json')

const renderDom = (info: ReturnType<typeof render>, elm: HTMLElement) => {
  console.log(info)
  elm.style.cssText = info.style
  elm.innerText = info.text || ''
  info.children.forEach(it => {
    const span = document.createElement('span')
    renderDom(it, span)
    elm.appendChild(span)
  })
}

@plugin({
  version,
  author: 'Shirasawa',
  title: () => 'MCBot',
  description: () => 'bot',
  id: '@Shirasawa/mc-bot'
})
export default class MCBot extends Plugin {
  public config = {}
  public clients: Record<string, Client & Recorder> = { }
  public update = () => { /* empty */ }
  constructor () {
    super()
    pluginMaster.addExtensionsButton({
      key: 'multi-instances',
      title: () => 'MCBot',
      onClick () { history.push('/mcbot') }
    }, this)
    pluginMaster.addRoute(<LiveRoute exact component={Page(this)} path='/mcbot' />, this)
    try {
      this.config = fs.readJsonSync(CONFIG_PATH) || { }
    } catch {
      this.config = { }
    }
  }

  @event()
  public loaded () {
    setTimeout(() => history.push('/mcbot'), 2000)
  }

  @event()
  public changeLanguage (name: string) { $.setCurrentLanguage(name) }

  public saveConfig () {
    return fs.writeJson(CONFIG_PATH, this.config).catch(console.error)
  }

  public addBot (key: string, host: string, version: string) {
    if (!key) return
    this.config[key] = {
      host,
      version,
      enableCommand: false,
      autoReconnect: true,
      shakeHand: true,
      commandPrefix: '#',
      autoRespawn: true,

      removeItems: false,
      removeExperienceOrb: false,
      removeBats: false,
      removePhantoms: false,
      noWeather: false,
      dayTime: -1,
      withPlayerOnly: false,
      checkTime: 15000,
      splitTime: -1,
      autoRecording: false
    }
    this.update()
    return this.saveConfig()
  }

  public async deleteBot (key: string) {
    if (key in this.clients) throw new Error('Please disconnect!')
    delete this.config[key]
    this.update()
    await fs.writeJson(CONFIG_PATH, this.config).catch(console.error)
  }

  public async connect (key: string) {
    if (key in this.clients) return
    const cfg = this.config[key]
    const user = pluginMaster.getAllProfiles().find(it => it.key === key)
    if (!user) return
    const authenticator = pluginMaster.logins[user.type]
    try { if (!await authenticator.validate(key)) await authenticator.refresh(key) } catch (e) {
      console.error(e)
      return
    }
    const hostname = (cfg.host || '').split(':', 2)

    const client = this.clients[key] = setupRecorder(new Client({
      host: hostname[0],
      port: parseInt(hostname[1]) || 25565,
      version: cfg.version,
      username: user.username,
      clientToken: user.clientToken,
      accessToken: user.accessToken
    }, cfg.commandPrefix), key, this)
    this.applyToBot(key)
    this.update()
    const disconnect = data => {
      this.addText(key, `${$.disconnect}: ${data.reason}`)
      if (cfg.autoReconnect) {
        this.addText(key, $.autoReconnectMsg)
        setTimeout(() => client.client.connect(cfg.host, cfg.port), 5000)
      } else {
        delete this.clients[key]
        this.update()
      }
    }
    client.client
      .on('connect', () => this.addText(key, $.connected))
      .on('disconnect', disconnect)
      .on('kick_disconnect', disconnect)
      .on('chat', data => {
        const chat = document.getElementById(key + '-chat')
        if (!chat) return
        const elm = document.createElement('p')
        renderDom(render(JSON.parse(data.message)), elm)
        elm.style.margin = '0'
        chat.appendChild(elm)
      })
      .on('error', e => {
        console.error(e)
        delete this.clients[key]
        this.update()
      })
      .on('update_health', data => {
        if (data.health < 1) {
          this.addText(key, $.dead)
          if (cfg.autoRespawn) client.respawn()
        }
      })
  }

  addText (key: string, text: string) {
    if (!key || !text) return
    const chat = document.getElementById(key + '-chat')
    if (!chat) return
    const elm = document.createElement('p')
    elm.style.margin = '0'
    elm.innerText = text
    chat.appendChild(elm)
  }

  applyToBot (key: string) {
    const cfg = this.config[key]
    const bot = this.clients[key]
    if (!cfg || !bot) return
    bot.commandPrefix = cfg.commandPrefix
    bot.enableCommand = cfg.enableCommand
    bot.isShakeHand = cfg.shakeHand
  }
}
