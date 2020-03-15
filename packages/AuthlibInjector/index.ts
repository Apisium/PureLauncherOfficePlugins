/* eslint-disable object-curly-newline, @typescript-eslint/explicit-function-return-type */
import AuthlibInjectorAuthenticator, { AUTHLIB_INJECTOR, AuthlibInjectorProfile } from './AuthlibInjectorAuthenticator'
import { join } from 'path'
import { LaunchOption } from '@xmcl/core'
import { id, version, author } from './package.json'
import { Plugin, plugin, event, pluginMaster, profilesStore, fs, constants, types,
  download, getJson, $ as $0, openLoginDialog, openConfirmDialog } from '@plugin'
import $ from './langs'

const JAR_PATH = join(constants.APP_PATH, 'authlib-injector/authlib-injector.jar')
const JSON_URL = 'https://bmclapi2.bangbang93.com/mirrors/authlib-injector/artifact/latest.json'

type YggdrasilVersion = types.ResourceVersion & { yggdrasilUrl?: string }

@plugin({
  id,
  author,
  version,
  title: () => 'Authlib-Injector',
  description: () => $.description
})
export default class AuthlibInjector extends Plugin {
  private instance = new AuthlibInjectorAuthenticator()
  constructor () {
    super()
    pluginMaster.registerAuthenticator(AUTHLIB_INJECTOR, this, this.instance)
  }

  @event()
  public changeLanguage (name: string) { $.setCurrentLanguage(name) }

  @event()
  public async launchEnsureFiles () {
    const profile = profilesStore.getCurrentProfile()
    if (profile?.type !== AUTHLIB_INJECTOR || await fs.pathExists(JAR_PATH)) return
    const json = await getJson(JSON_URL)
    const url = json?.download_url
    if (!url) throw new Error($0('Network connection failed!'))
    try {
      const hash = json.checksums?.sha256
      await download({
        url,
        destination: JAR_PATH,
        checksum: hash ? { algorithm: 'sha256', hash } : undefined
      }, 'Authlib Injector')
    } catch (e) {
      await fs.unlink(JAR_PATH).catch(console.error)
      throw e
    }
  }

  @event()
  public async launchPostUpdate (_: string, profile: AuthlibInjectorProfile, json?: YggdrasilVersion) {
    if (!json?.yggdrasilUrl) return
    if (profile.type === AUTHLIB_INJECTOR && profile.url === json.yggdrasilUrl) return
    if (this.instance.getAllProfiles().some(it => it.url === json.yggdrasilUrl)) {
      openConfirmDialog({ text: $.notSelectedProfile })
    } else if (await openConfirmDialog({ text: $.noExistsProfile, cancelButton: true })) {
      openLoginDialog(AUTHLIB_INJECTOR, { url: json.yggdrasilUrl })
    }
    throw new Error($.incorrectAccount)
  }

  @event()
  public preLaunch (_: string, option: LaunchOption, profile: AuthlibInjectorProfile) {
    if (profile?.type !== AUTHLIB_INJECTOR) return
    option.yggdrasilAgent = {
      jar: JAR_PATH,
      server: profile.url,
      prefetched: profile.manifest ? btoa(JSON.stringify(profile.manifest)) : undefined
    }
  }

  @event()
  public dragIn (t: DataTransfer) {
    let data = t.getData('text/plain')
    if (!data.startsWith('authlib-injector:yggdrasil-server:') || !(data = data.slice(34))) return
    openLoginDialog(AUTHLIB_INJECTOR, { url: decodeURIComponent(data) })
  }

  @event()
  public protocolInstallResource (r: YggdrasilVersion) {
    if (!r || !types.isVersion(r) || !r.yggdrasilUrl || typeof r.yggdrasilUrl !== 'string') return
    if (this.instance.getAllProfiles().some(it => it.url === r.yggdrasilUrl)) return
    openLoginDialog(AUTHLIB_INJECTOR, { url: r.yggdrasilUrl })
  }
}
