import { version } from './package.json'
import { Plugin, plugin, event, pluginMaster, React, LiveRoute, history } from '@plugin'
import $ from './langs'
import page from './Page'

@plugin({
  version,
  author: 'Shirasawa',
  title: () => $.title,
  description: () => $.description,
  id: '@PureLauncher/multi-instances'
})
export default class MultiInstances extends Plugin {
  constructor () {
    super()
    pluginMaster.addExtensionsButton({
      key: 'multi-instances',
      title: () => $.title,
      onClick () { history.push('/multiInstances') }
    }, this)
    pluginMaster.addRoute(<LiveRoute exact component={page} path='/multiInstances' />, this)
  }

  @event()
  public changeLanguage (name: string) { $.setCurrentLanguage(name) }
}
