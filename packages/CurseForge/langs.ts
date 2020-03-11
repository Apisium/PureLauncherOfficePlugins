import { locates } from '@plugin'

export const zhCN = {
  readFile: '读入文件',
  twitch: 'Twitch 协议支持',
  installModPack: '安装模组包',
  description: 'CurseForge 资源安装器',
  installed: '当前模组包已经安装了, 如需重新安装请手动删除版本文件夹.'
}

export default locates<typeof zhCN>({
  'zh-cn': zhCN,
  'en-us': {
    readFile: 'Reading file',
    twitch: 'Twitch Protocol',
    installModPack: 'Install mods pack',
    description: 'The installer of CurseForge resources.',
    installed: 'The current mods pack has been installed. Please remove it manually if you need to reinstall it.'
  }
})
