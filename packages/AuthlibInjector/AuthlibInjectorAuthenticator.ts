import { Authenticator, $ as $0, constants, fs, profilesStore, fetchJson, getJson } from '@plugin'
import { join } from 'path'
import $ from './langs'

const { default: Auth, registerAuthenticator } = Authenticator

export const ROOT_PATH = join(constants.APP_PATH, 'authlib-injector')
export const DATABASE_PATH = join(ROOT_PATH, 'database.json')
fs.ensureDirSync(ROOT_PATH)

export interface AuthlibInjectorProfile extends Authenticator.Profile {
  url: string
  serverName?: string
  displayUrl: string
}

interface Request {
  accessToken: string
  clientToken: string
  selectedProfile?: Profile
  properties: Array<{ name: string, value: any }>
}

interface Textures {
  textures: {
    SKIN: { url: string }
  }
}

interface Profile { id: string, name: string }

const resolveUrl = async (url: string) => {
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, { cache: 'no-cache' })
    if (res.headers.has('X-Authlib-Injector-API-Location')) {
      const temp = res.headers.get('X-Authlib-Injector-API-Location')
      url = temp.includes('://') ? temp : join(url, temp)
    } else return url
  }
  throw new Error($.redirect)
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('./logo.png')

export const AUTHLIB_INJECTOR = 'AuthlibInjector'
@registerAuthenticator({
  name: AUTHLIB_INJECTOR,
  title: (_: any, p: AuthlibInjectorProfile) => 'Authlib Injector' + (p ? p.serverName
    ? ` (${p.serverName} - ${p.displayUrl})` : ` (${p.displayUrl})` : ''),
  logo: join(__dirname, logo),
  fields: [
    {
      name: 'url',
      title: () => $.url,
      inputProps: { required: true, autoFocus: true }
    },
    {
      name: 'email',
      title: () => $0('Email'),
      inputProps: { type: 'email', required: true }
    },
    {
      name: 'password',
      title: () => $0('Password'),
      inputProps: { type: 'password', required: true }
    }
  ]
})
export default class AuthlibInjectorAuthenticator extends Auth implements Authenticator.SkinChangeable {
  private db: Record<string, AuthlibInjectorProfile> = { }

  constructor () {
    super()
    try { this.db = fs.readJsonSync(DATABASE_PATH, { throws: false }) || { } } catch (e) { console.error(e) }
    console.log(this.db)
  }

  public async login (options: { url: string, email: string, password: string }) {
    this.db = await fs.readJson(DATABASE_PATH, { throws: false }) || { }
    if (Object.values(this.db).some(it => it.username.toLowerCase() === options.email.toLowerCase())) {
      throw new Error($0('You have already logged in with this account!'))
    }
    let url = options.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    url = await resolveUrl(url)
    const json: Request = await fetchJson(join(url, 'authserver/authenticate'), true, {
      requestUser: true,
      username: options.email,
      password: options.password,
      clientToken: profilesStore.clientToken,
      agent: { name: 'Minecraft', version: 1 }
    }).catch(e => {
      console.error(e)
      throw new Error($0('Network connection failed!'))
    })
    if (!json || (json as any).errorMessage) {
      throw new Error(((json || { }) as any).errorMessage || $0('Network connection failed!'))
    }
    if (!json.accessToken || !json.selectedProfile?.id) throw new Error($.withoutProfile)
    const p = json.selectedProfile
    this.db[p.id] = {
      url,
      key: p.id,
      uuid: p.id,
      type: AUTHLIB_INJECTOR,
      displayName: options.email,
      clientToken: profilesStore.clientToken,
      accessToken: json.accessToken,
      username: p.name,
      displayUrl: options.url,
      serverName: (await getJson(url).catch(console.error))?.meta?.serverName,
      skinUrl: await this.getSkin(url, p.id, p.name)
    }
    await fs.writeJson(DATABASE_PATH, this.db)
    return p.id
  }

  public async logout (key: string) {
    this.db = await fs.readJson(DATABASE_PATH, { throws: false }) || { }
    const p = this.db[key]
    if (!p) return
    delete this.db[key]
    await fs.writeJson(DATABASE_PATH, this.db)
    const json = await fetchJson(join(p.url, 'authserver/invalidate'), true,
      { accessToken: p.accessToken, clientToken: p.clientToken })
      .catch(e => {
        console.error(e)
        throw new Error($0('Network connection failed!'))
      })
    if (!json) return
    throw new Error(json.errorMessage)
  }

  public async refresh (key: string) {
    await this.checkLogined(key)
    const p = this.db[key]
    const json = await fetchJson(join(p.url, 'authserver/refresh'), true,
      { accessToken: p.accessToken, clientToken: p.clientToken })
      .catch(e => {
        console.error(e)
        throw new Error($0('Network connection failed!'))
      })
    if (!json || (json as any).errorMessage) {
      throw new Error(((json || { }) as any).errorMessage || $0('Network connection failed!'))
    }
    if (!json.accessToken || !json.selectedProfile?.id || !json.user?.username) throw new Error($.withoutProfile)

    const sp = json.selectedProfile
    Object.assign(this.db[p.uuid], {
      displayName: sp.name,
      clientToken: profilesStore.clientToken,
      accessToken: json.accessToken,
      username: json.user.username,
      skinUrl: await this.getSkin(p.url, p.uuid, json.user.username)
    })
    await fs.writeJson(DATABASE_PATH, this.db)
  }

  public async validate (key: string) {
    await this.checkLogined(key)
    const p = this.db[key]
    if (!p) return
    const json = await fetchJson(join(p.url, 'authserver/validate'), true,
      { accessToken: p.accessToken, clientToken: p.clientToken })
      .catch(e => {
        console.error(e)
        throw new Error($0('Network connection failed!'))
      })
    if (json) {
      console.log(json.errorMessage)
      return true
    } else return false
  }

  public getData (key: string) {
    const p = this.db[key]
    if (!p) throw new Error($0('Account does not exists!'))
    return p
  }

  public getAllProfiles () {
    return Object.values(this.db)
  }

  public async changeSkin (key: string, path: string, slim: boolean) {
    console.log(key, path, slim)
    // TODO:
  }

  private async checkLogined (key: string) {
    this.db = await fs.readJson(DATABASE_PATH, { throws: false }) || { }
    if (!(key in this.db)) throw new Error($0('Account does not exists!'))
  }

  private async getSkin (url: string, id: string, name: string) {
    const p = await getJson(join(url, 'sessionserver/session/minecraft/profile/' + id)).catch(console.error)
    if (p) {
      const data = p.properties?.find(it => it.name === 'textures')?.value
      if (data) {
        try {
          const url = (JSON.parse(atob(data)) as Textures)?.textures?.SKIN?.url
          if (url) return url
        } catch (e) { console.error(e) }
      }
    }
    return 'https://minotar.net/skin/' + name
  }
}
