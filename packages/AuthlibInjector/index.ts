/* eslint-disable object-curly-newline, @typescript-eslint/explicit-function-return-type */
import AuthlibInjectorAuthenticator, { AUTHLIB_INJECTOR, AuthlibInjectorProfile } from './AuthlibInjectorAuthenticator'
import { join } from 'path'
import { version } from './package.json'
import { LaunchOption } from '@xmcl/core'
import { Plugin, plugin, event, pluginMaster, profilesStore, fs, constants,
  download, getJson, $ as $0, openLoginDialog } from '@plugin'
import $ from './langs'

const JAR_PATH = join(constants.APP_PATH, 'authlib-injector/authlib-injector.jar')
const JSON_URL = 'https://bmclapi2.bangbang93.com/mirrors/authlib-injector/artifact/latest.json'

@plugin({
  version,
  author: 'Shirasawa',
  title: () => 'Authlib-Injector',
  description: () => $.description,
  id: '@PureLauncher/multi-instances'
})
export default class AuthlibInjector extends Plugin {
  constructor () {
    super()
    pluginMaster.registerAuthenticator(AUTHLIB_INJECTOR, this, new AuthlibInjectorAuthenticator())
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
  public preLaunch (_: string, option: LaunchOption) {
    const profile = profilesStore.getCurrentProfile()
    if (profile?.type !== AUTHLIB_INJECTOR) return
    const server = (profile as AuthlibInjectorProfile).url
    // option.extraJVMArgs.push('-Dauthlibinjector.side=client', '-Dauthlibinjector.yggdrasil.prefetched=' + btoa(server))
    option.yggdrasilAgent = { jar: JAR_PATH, server }
  }

  @event()
  public dragIn (t: DataTransfer) {
    let data = t.getData('text/plain')
    if (!data.startsWith('authlib-injector:yggdrasil-server:') || !(data = data.slice(34))) return
    openLoginDialog(AUTHLIB_INJECTOR, { url: decodeURIComponent(data) })
  }
}
