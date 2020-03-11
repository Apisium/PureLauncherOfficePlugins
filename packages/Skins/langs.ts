import { locates } from '@plugin'

export const zhCN = {
  title: '皮肤',
  description: '这个插件可以让你更换启动器的皮肤'
}

export default locates<typeof zhCN>({
  'zh-cn': zhCN,
  'en-us': {
    title: 'Skins',
    description: "This plugin allows you to change PureLauncher's skin"
  }
})
