/* eslint-disable @typescript-eslint/explicit-function-return-type */
import AuthlibInjectorAuthenticator, { AUTHLIB_INJECTOR, AuthlibInjectorProfile } from './AuthlibInjectorAuthenticator'
import { join } from 'path'
import { createHash } from 'crypto'
import { version } from './package.json'
import { LaunchOption } from '@xmcl/core'
import { Plugin, plugin, event, pluginMaster, profilesStore, fs, constants, download, getJson, $ as $0 } from '@plugin'
import $ from './langs'

const JAR_PATH = join(constants.APP_PATH, 'authlib-injector/authlib-injector.jar')
const JSON_URL = 'https://bmclapi2.bangbang93.com/mirrors/authlib-injector/artifact/latest.json'

@plugin({
  version,
  author: 'Shirasawa',
  title: () => 'Authlib-Injector',
  description: () => $.description,
  id: '@Shirasawa/multi-instances'
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
      await download({ url, file: JAR_PATH }, 'Authlib Injector')
      const hash = json.checksums?.sha256
      // eslint-disable-next-line promise/param-names
      if (hash && hash !== await new Promise<string>((resolve, e) => {
        const s = createHash('sha1').setEncoding('hex')
        fs.createReadStream(JAR_PATH).on('error', e).pipe(s).on('error', e)
          .on('finish', () => resolve(s.read()))
      })) throw new Error($.downloadFailed)
    } catch (e) {
      await fs.unlink(JAR_PATH).catch(console.error)
      throw e
    }
  }

  @event()
  public preLaunch (_: string, option: LaunchOption) {
    const profile = profilesStore.getCurrentProfile()
    if (profile?.type !== AUTHLIB_INJECTOR) return
    option.yggdrasilAgent = { jar: JAR_PATH, server: (profile as AuthlibInjectorProfile).url }
  }
}
