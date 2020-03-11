/* eslint-disable object-curly-newline */
import { remote } from 'electron'
import { join, basename } from 'path'
import { version } from './package.json'
import { Plugin, plugin, event, pluginMaster, React, Switch, $ as $0, download, genId, fs, constants,
  notice, xmcl, addTask, requestInstallResources, createVersionSelector, profilesStore } from '@plugin'
import $ from './langs'
import fileName from 'filenamify'
import * as request from 'request'
import cloudScraper from 'cloudscraper'

const jar = request.jar()
const { Installer: { CurseforgeInstaller, ForgeInstaller }, Unzip } = xmcl
type InstallView = import('@plugin').types.InstallView

interface CurseForgeResource {
  name: string
  summary: string
  slug: string
  authors: Array<{ name: string }>
  latestFiles: Array<{ id: number, gameVersion: string[], downloadUrl: string, fileName: string }>
  categorySection: {
    name: string
    gameId: number
    packageType: number
  }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const currentWindow = remote.getCurrentWindow()

@plugin({
  version,
  author: 'Shirasawa',
  title: () => 'CurseForge',
  description: () => $.description,
  id: '@PureLauncher/multi-instances'
})
export default class MultiInstances extends Plugin {
  constructor () {
    super()
    if (localStorage.getItem('useTwitchProtocol') !== 'false') remote.app.setAsDefaultProtocolClient('twitch')
    pluginMaster.addSetting(<div className='group' style={{ paddingTop: 28 }}>
      <Switch
        defaultChecked={localStorage.getItem('useTwitchProtocol') !== 'false'}
        onChange={({ target: { checked } }) => {
          localStorage.setItem('useTwitchProtocol', checked.toString())
          if (checked) remote.app.setAsDefaultProtocolClient('twitch')
        }}
        coverStyle={{ marginRight: 16 }}
      />
      <label>{$.twitch}</label>
    </div>, this)
  }

  @event()
  public changeLanguage (name: string) { $.setCurrentLanguage(name) }

  @event()
  public async customProtocol (url: string) {
    const destination = join(remote.app.getPath('temp'), genId())
    try {
      if (!url.startsWith('twitch://')) return
      notice({ content: $0('Loading...') })
      const text = new DOMParser().parseFromString(await cloudScraper({
        jar,
        cloudflareMaxTimeout: 10000,
        uri: 'https://' + url.replace(/^twitch:\/+/, '')
      }), 'text/xml')
      currentWindow.flashFrame(true)
      const elm = text.getElementsByTagName('project')[0]
      if (!elm) throw new Error('No project element!')
      const json: CurseForgeResource = await fetch('https://addons-ecs.forgesvc.net/api/v2/addon/' +
        elm.getAttribute('id'), { cache: 'no-cache' }).then(it => it.json())
      if (json.categorySection.gameId !== 432) throw new Error('The resource is not for Minecraft!')
      const obj: InstallView = { request: true, throws: true }
      const resource: any = {
        id: json.slug,
        title: json.name,
        description: json.summary,
        author: json.authors?.map(it => it.name)
      }
      const fileId = parseInt(elm.getAttribute('file'))
      const file = json.latestFiles.find(it => it.id === fileId)
      if (!file || isNaN(fileId)) throw new Error('No such file id: ' + fileId)
      switch (json.categorySection.packageType) {
        case 1:
          resource.type = 'Save'
          break
        case 3:
          resource.type = 'ResourcePack'
          break
        case 5:
          resource.type = 'Version'
          resource.mcVersion = file.gameVersion?.[0]
          break
        case 6:
          resource.type = 'Mod'
          obj.render = createVersionSelector(obj)
          break
        default:
          throw new Error('Not support resource type: ' + json.categorySection.name)
      }
      if (!await requestInstallResources(resource, obj)) {
        notice({ content: $0('canceled') + '!' })
        return
      }
      notice({ content: $0('Installing resources...') })
      await download({ url: file.downloadUrl, destination }, undefined, file.fileName)
      switch (json.categorySection.packageType) {
        case 1:
          await fs.ensureDir(constants.WORLDS_PATH)
          await Unzip.extract(destination, constants.WORLDS_PATH, { replaceExisted: true })
          break
        case 3:
          await fs.ensureDir(constants.RESOURCE_PACKS_PATH)
          await fs.move(destination, join(constants.RESOURCE_PACKS_PATH, basename(file.fileName)))
          break
        case 5:
          await this.zipDragIn(await Unzip.open(destination), null, false)
          break
        case 6: {
          let id = obj.selectedVersion
          if (!id || !(id = await profilesStore.resolveVersion(id))) throw new Error('No such version: ' + id)
          const dir = join(constants.VERSIONS_PATH, id, 'mods')
          await fs.ensureDir(dir)
          await fs.move(destination, join(dir, basename(file.fileName)))
        }
      }
      notice({ content: $0('Successfully installed resources!') })
    } catch (e) {
      console.error(e)
      notice({ error: true, content: $0('Failed to install resources') + '!' })
    } finally {
      if (await fs.pathExists(destination)) await fs.unlink(destination)
    }
  }

  @event()
  public async zipDragIn (zip: import('@xmcl/unzip').CachedZipFile, _: any, request = true) {
    if (!zip.entries['manifest.json']) {
      if (request) throw new Error('This file is not a CurseForge mod pack!')
      return
    }
    const data = await addTask(CurseforgeInstaller.readManifestTask(zip), $.readFile).wait()
    if (request) {
      if (await requestInstallResources({
        type: 'Version',
        id: data.name,
        mcVersion: data.minecraft.version,
        version: data.version || ''
      })) notice({ content: $0('Installing resources...') })
      else {
        notice({ content: $0('canceled') + '!' })
        return
      }
    }
    if (!data.minecraft?.version) throw new Error('Not Minecraft version provide!')
    let forge = data.minecraft.modLoaders?.find(it => it.primary)?.id
    const versionId = fileName(data.name)
    const dir = join(constants.VERSIONS_PATH, versionId)
    const jsonPath = join(dir, versionId + '.json')
    if (await fs.pathExists(jsonPath)) {
      notice({ content: $.installed })
      return
    }
    if (!forge?.startsWith('forge-')) throw new Error('Unsupported mod loader: ' + forge)
    forge = forge.replace('forge-', '')
    const mcversion = data.minecraft.version
    const forgeVersionId = mcversion + '-' + forge + '-Forge'
    if (!await fs.pathExists(join(constants.VERSIONS_PATH, forgeVersionId, forgeVersionId + '.json'))) {
      await ForgeInstaller.installTask({
        mcversion,
        version: forge,
        installer: {
          path: `/maven/net/minecraftforge/forge/${mcversion}-${forge}/forge-${mcversion}-${forge}-installer.jar`
        },
        universal: {
          path: `/maven/net/minecraftforge/forge/${mcversion}-${forge}/forge-${mcversion}-${forge}-universal.jar`
        }
      }, constants.GAME_ROOT, {
        versionId: forgeVersionId,
        java: profilesStore.extraJson.javaPath,
        mavenHost: profilesStore.downloadProvider.forge
      })
    }
    await fs.ensureDir(dir)
    await addTask(CurseforgeInstaller.installCurseforgeModpackTask(zip, dir, { queryFileUrl: (project: number, file: number) => fetch(
      `https://addons-ecs.forgesvc.net/api/v2/addon/${project}/file/${file}/download-url`, { cache: 'no-cache' }
    ).then(it => it.json())
    }), $.installModPack).wait()
    await fs.writeJson(jsonPath, { id: versionId, inheritFrom: forgeVersionId, isolation: true })
  }
}
