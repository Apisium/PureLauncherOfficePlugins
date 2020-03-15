/* eslint-disable no-unused-expressions, no-sequences */
import { join } from 'path'
import { remote } from 'electron'
import { version, id, author } from './package.json'
import { React, Plugin, plugin, event, history, pluginMaster, ReactRouter, fs, constants } from '@plugin'
import Page from './Page'
import $ from './langs'

@plugin({
  id,
  author,
  version,
  title: () => $.title,
  description: () => $.description
})
export default class Skins extends Plugin {
  public cssPath = join(constants.APP_PATH, 'custom-skin.css')
  private container = document.createElement('div')
  private element: HTMLStyleElement = document.createElement('style')

  constructor () {
    super()
    let dark = remote.nativeTheme.shouldUseDarkColors
    document.body.classList.add(dark ? 'dark-theme' : 'light-theme')
    remote.nativeTheme.on('updated', () => {
      if (dark === remote.nativeTheme.shouldUseDarkColors) return
      dark = !dark
      document.body.classList.remove('dark-theme', 'light-theme')
      document.body.classList.add(dark ? 'dark-theme' : 'light-theme')
    })
    document.body.append(this.element)
    pluginMaster.addExtensionsButton({
      key: 'skins',
      title: () => $.title,
      onClick () { history.push('/skins') }
    }, this)
    pluginMaster.addRoute(<ReactRouter.Route exact component={Page(this)} path='/skins' />, this)
    try { this.applyCss(fs.readFileSync(this.cssPath).toString()) } catch { /* empty */ }
  }

  @event()
  public changeLanguage (name: string) { $.setCurrentLanguage(name) }

  public applyCss (css: string) {
    const match = css.match(/\/\* *ElementCount: *(\d+) *\*\//i)
    let count = match && match[1] ? parseInt(match[1]) : 0
    if (isNaN(count) || count < 0) count = 0
    if (count) {
      if (count > 256) count = 256
      let i = this.container.childElementCount
      if (i < count) {
        const fragment = document.createDocumentFragment()
        while (i < count) {
          fragment.appendChild(document.createElement('div'))
          i++
        }
        this.container.appendChild(fragment)
      }
    }
    this.element.innerText = css
  }
}
