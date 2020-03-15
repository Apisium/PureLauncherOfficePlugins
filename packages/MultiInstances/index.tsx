import { id, version, author } from './package.json'
import { Plugin, plugin, event, pluginMaster, React, LiveRoute, history } from '@plugin'
import $ from './langs'
import page from './Page'

@plugin({
  id,
  author,
  version,
  title: () => $.title,
  description: () => $.description
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
