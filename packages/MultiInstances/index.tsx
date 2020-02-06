/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { version } from './package.json'
import { Plugin, plugin, event, pluginMaster, React, LiveRoute, history } from '@plugin'
import langs, { zhCN } from './langs'
import page from './Page'

let currentLangs = 'en-us'
const $ = (key: keyof typeof zhCN) => (langs[currentLangs] && langs[currentLangs][key]) || zhCN[key] || ''

@plugin({
  version,
  author: 'Shirasawa',
  title: () => $('title'),
  description: () => $('description'),
  id: '@Shirasawa/multi-instances'
})
export default class MyPlugin extends Plugin {
  constructor () {
    super()
    pluginMaster.addExtensionsButton({
      key: 'multi-instances',
      title: () => $('title'),
      onClick () { history.push('/multiInstances') }
    }, this)
    pluginMaster.addRoute(<LiveRoute exact component={page($)} path='/multiInstances' />, this)
  }

  @event()
  public changeLanguage (name: string) { currentLangs = name }
}
