/* eslint-disable object-curly-newline */
import { React, Avatar, Switch, Dialog, pluginMaster, $ as $0, constants, Authenticator,
  notice, autoNotices, openConfirmDialog } from '@plugin'
import { join } from 'path'
import versions from 'minecraft-protocol/src/version'
import $ from './langs'

const css: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    marginTop: 36,
    borderRadius: 4,
    display: 'flex',
    flexWrap: 'wrap' as 'wrap',
    padding: '0 0 30px 60px',
    height: 320,
    justifyContent: 'center',
    background: 'var(--secondary-color)',
    boxShadow: '0 8px 11px -5px rgba(0, 0, 0, 0.2), 0 17px 26px 2px rgba(0, 0, 0, 0.14), 0 6px 32px 5px rgba(0, 0, 0, 0.12)'
  },
  left: {
    top: 0,
    bottom: 0,
    width: 60,
    left: 0,
    textAlign: 'center',
    position: 'absolute',
    backdropFilter: 'brightness(1.2)',
    boxShadow: '0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12)'
  },
  avatar: {
    cursor: 'pointer',
    margin: '12px auto',
    transition: 'filter .6s',
    filter: 'brightness(0.5) blur(0.9px)'
  },
  console: {
    position: 'absolute',
    left: 76,
    right: 0,
    top: 34,
    bottom: 0
  },
  input: {
    position: 'absolute',
    left: 60,
    top: 0,
    width: 'calc(100% - 216px)'
  },
  send: {
    position: 'absolute',
    right: 70,
    padding: '8px 0',
    width: 70
  },
  more: {
    position: 'absolute',
    right: 0,
    padding: '8px 0',
    width: 70
  },
  add: {
    width: 60,
    textAlign: 'center',
    padding: '8px 0'
  },
  form: {
    textAlign: 'center',
    padding: '20px 10px',
    display: 'flex',
    flexWrap: 'wrap',
    height: 276
  },
  group: {
    width: '45%',
    display: 'inline-flex',
    margin: '8px auto',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  save: {
    display: 'block',
    margin: 'auto',
    width: '100%'
  },
  addGroup: {
    marginBottom: 8
  },
  switchLabel: {
    marginRight: 14
  },
  input2: {
    width: '100%'
  },
  ctrl: {
    padding: 20,
    textAlign: 'center',
    height: 276
  },
  chat: {
    padding: '10px 0',
    height: 276
  }
}

const selectedAvatar = { ...css.avatar, filter: undefined }

const AddBot: React.FC<{ instance: import('./index').default, open: boolean, onClose: () => void }> = p => {
  const added = {}
  Object.keys(p.instance.config).forEach(it => (added[it] = null))
  const profiles = pluginMaster.getAllProfiles().filter(it => typeof added[it.key] === 'undefined')
  const [key, setKey] = React.useState(profiles[0]?.key || '')
  const [host, setHost] = React.useState('127.0.0.1')
  const [version, setVersion] = React.useState(versions.defaultVersion)
  const onClose = () => {
    p.onClose()
    setKey(profiles[0]?.key || '')
    setHost('127.0.0.1')
    setVersion(versions.defaultVersion)
  }
  return <Dialog
    animation='zoom'
    maskAnimation='fade'
    onClose={onClose}
    visible={p.open}
    title={$.newBot}
    footer={[
      <button
        key='save'
        className='btn btn-primary'
        onClick={() => {
          autoNotices(p.instance.addBot(key, host, version)).finally(() => p.instance.applyToBot(key))
          onClose()
        }}
      >{$.create}</button>,
      <button key='cancel' className='btn btn-secondary' onClick={onClose}>{$0('CANCEL')}</button>
    ]}
  >
    <div style={css.addGroup}>
      <label style={css.switchLabel}>{$.selectAccount}</label>
      <select value={key} onChange={e => setKey(e.target.value)}>{profiles
        .map(it => <option value={it.key} key={it.key}>
          {it.displayName ? `${it.username} (${it.displayName})` : it.username}</option>)}
      </select>
    </div>
    <div style={css.addGroup}>
      <label style={css.switchLabel}>{$.hostname}</label>
      <input value={host} onChange={e => setHost(e.target.value)} />
    </div>
    <div style={css.addGroup}>
      <label style={css.switchLabel}>{$.version}</label>
      <select value={version} onChange={e => setVersion(e.target.value)}>{versions.supportedVersions
        .map(it => <option value={it} key={it}>{it}</option>)}
      </select>
    </div>
  </Dialog>
}

export default (instance: import('./index').default) => {
  const MultiInstances: React.FC = () => {
    const logins: Record<string, Authenticator.Profile> = { }
    pluginMaster.getAllProfiles().forEach(it => (logins[it.key] = it))
    const keys = Object.keys(instance.config).filter(it => typeof logins[it] === 'object')
    const cannotAdd = keys.length > 6
    const [account, setAccount] = React.useState(keys[0] || '')
    const [page, setPage] = React.useState(0)
    const [open, setOpen] = React.useState(false)
    const [msg, setMsg] = React.useState('')
    const cfg = account && instance.config[account]
    const bot = account && instance.clients[account]
    React.useMemo(() => {
      setPage(0)
      if (account) return
      setAccount(keys[0] || '')
      setMsg('')
    }, [cfg])
    const [flag, setFlag] = React.useState(false)
    const update = instance.update = () => setFlag(!flag)
    return <div style={css.container}>
      <AddBot open={open} onClose={() => setOpen(false)} instance={instance} />
      <div style={css.left}>
        <button disabled={cannotAdd} className='btn btn-secondary' style={css.add}
          onClick={() => !cannotAdd && setOpen(true)}>{$.add}</button>
        {keys.map(it => <Avatar
          data-sound
          key={it}
          onClick={() => setAccount(it)}
          src={[logins[it].skinUrl, join(constants.SKINS_PATH, it + '.png')]}
          style={account === it ? selectedAvatar : css.avatar}
        />)}
      </div>
      <input disabled={!bot} style={css.input} value={msg} onChange={e => setMsg(e.target.value)}></input>
      <button className='btn btn-primary' disabled={!keys.length || !account} style={css.send} onClick={() => {
        if (bot) {
          bot.client.write('chat', { message: msg })
          setMsg('')
        } else instance.connect(account)
      }}>
        {bot ? $.send : $.connect}</button>
      <button className='btn btn-secondary' disabled={!keys.length || !account} style={css.more}
        onClick={() => setPage(bot ? (page === 2 ? 0 : page + 1) : (page === 0 ? 2 : 0))}>
        {bot ? (page === 0 ? $.ctrl : page === 1 ? $.setting : $.chat) : (page ? $.chat : $.setting)}</button>
      <div style={css.console}>
        {page === 0 ? <div className='scrollable' key={account}
          id={account ? account + '-chat' : undefined} style={css.chat}></div>
          : page === 1
            ? <div key='ctrl' className='scrollable' style={css.ctrl}>
              <button className='btn btn-primary' onClick={() => bot.stop()}>{$.stop}</button>
              <button className='btn btn-primary' onClick={() => bot.jump()}>{$.jump}</button>
              <button className='btn btn-primary' onClick={() => bot.respawn()}>{$.respawn}</button>
              <button className='btn btn-primary' onClick={() => bot.swap()}>{$.swap}</button>
              <button className='btn btn-primary' onClick={() => bot.getOn()}>{$.getOn}</button>
              <button className='btn btn-primary' onClick={() => bot.getOff()}>{$.getOff}</button>
              <button className='btn btn-primary' onClick={() => bot.drop()}>{$.drop}</button>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.keepWalk}</label>
                <Switch checked={!!bot.keepWalkTimer} readOnly onClick={() => {
                  if (bot.keepWalkTimer) {
                    clearInterval(bot.keepWalkTimer)
                    bot.keepWalkTimer = null
                  } else bot.keepWalk()
                  update()
                }} />
              </div>
              <button className='btn btn-primary' onClick={() => bot.useItem()}>{$.useItem}</button>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.keepUseItem}</label>
                <Switch checked={!!bot.useItemTimer} readOnly onClick={() => {
                  if (bot.useItemTimer) {
                    clearInterval(bot.useItemTimer)
                    bot.useItemTimer = null
                  } else bot.keepUseItem()
                  update()
                }} />
              </div>
              <button className='btn btn-primary' onClick={() => bot.attack()}>{$.attack}</button>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.keepAttack}</label>
                <Switch checked={!!bot.attackTimer} readOnly onClick={() => {
                  if (bot.attackTimer) {
                    clearInterval(bot.attackTimer)
                    bot.attackTimer = null
                  } else bot.keepDigging()
                  update()
                }} />
              </div>
              <button className='btn btn-primary' onClick={() => bot.dig()}>{$.dig}</button>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.keepDig}</label>
                <Switch checked={!!bot.digTimer} readOnly onClick={() => {
                  if (bot.digTimer) {
                    clearInterval(bot.digTimer)
                    bot.digTimer = null
                  } else bot.keepDigging()
                  update()
                }} />
              </div>
              <button className='btn btn-primary' onClick={() => bot.place()}>{$.place}</button>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.keepPlace}</label>
                <Switch checked={!!bot.placeTimer} readOnly onClick={() => {
                  if (bot.placeTimer) {
                    clearInterval(bot.placeTimer)
                    bot.placeTimer = null
                  } else bot.keepPlace()
                  update()
                }} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.recording}</label>
                <Switch checked={bot.recording} readOnly onClick={() => bot.recording ? bot.stopRecord() : bot.record()} />
              </div>
              <div style={css.save}>
                <button className='btn btn-danger' onClick={() => {
                  bot.disconnect()
                  delete instance.clients[account]
                  setPage(0)
                }}>{$.disconnect}</button></div>
            </div>
            : cfg && <form key='setting' style={css.form} className='scrollable'
              id='bot-setting' onSubmit={e => e.preventDefault()}>
              <div style={css.save}><button className='btn btn-primary' onClick={() => {
                const form = document.getElementById('bot-setting') as HTMLFormElement
                if (!form) return
                const data = { }
                form.querySelectorAll('[name]')
                  .forEach((v: HTMLInputElement) => (data[v.name] = v.type === 'checkbox' ? v.checked
                    : v.type === 'number' ? parseFloat(v.value) : v.value))
                instance.config[account] = data
                autoNotices(instance.saveConfig())
              }}>{$.save}</button></div>
              <div style={css.group}>
                <label>{$.hostname}</label>
                <input name='host' style={css.input2} defaultValue={cfg.host} />
              </div>
              <div style={css.group}>
                <label>{$.version}</label>
                <select name='version' style={{ width: '100%' }} defaultValue={cfg.version}>{versions.supportedVersions
                  .map(it => <option value={it} key={it}>{it}</option>)}
                </select>
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.enableCommand}</label>
                <Switch name='command' defaultChecked={!!cfg.enableCommand} />
              </div>
              <div style={css.group}>
                <label>{$.commandPrefix}</label>
                <input style={css.input2} name='commandPrefix' defaultValue={cfg.commandPrefix} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.shakeHand}</label>
                <Switch name='shakeHand' defaultChecked={!!cfg.shakeHand} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.autoReconnect}</label>
                <Switch name='autoReconnect' defaultChecked={!!cfg.autoReconnect} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.autoRecording}</label>
                <Switch name='autoRecording' defaultChecked={!!cfg.autoRecording} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.autoRespawn}</label>
                <Switch name='autoRespawn' defaultChecked={!!cfg.autoRespawn} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.removeItems}</label>
                <Switch name='removeItems' defaultChecked={!!cfg.removeItems} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.removeExperienceOrb}</label>
                <Switch name='removeExperienceOrb' defaultChecked={!!cfg.removeExperienceOrb} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.removeBats}</label>
                <Switch name='removeBats' defaultChecked={!!cfg.removeBats} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.removePhantoms}</label>
                <Switch name='removePhantoms' defaultChecked={!!cfg.removePhantoms} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.noWeather}</label>
                <Switch name='noWeather' defaultChecked={!!cfg.noWeather} />
              </div>
              <div style={css.group}>
                <label style={css.switchLabel}>{$.withPlayerOnly}</label>
                <Switch name='withPlayerOnly' defaultChecked={!!cfg.withPlayerOnly} />
              </div>
              <div style={css.group}>
                <label>{$.dayTime}</label>
                <input style={css.input2} type='number' name='dayTime' defaultValue={cfg.dayTime} />
              </div>
              <div style={css.group}>
                <label>{$.checkTime}</label>
                <input style={css.input2} type='number' name='checkTime' defaultValue={cfg.checkTime} />
              </div>
              <div style={css.group}>
                <label>{$.splitTime}</label>
                <input style={css.input2} type='number' name='splitTime' defaultValue={cfg.splitTime} />
              </div>
              <div style={css.save}>
                <button className='btn btn-danger' onClick={() => openConfirmDialog({
                  cancelButton: true,
                  title: $0('Warning!'),
                  text: $.confirmDelete
                }).then(ok => {
                  if (ok) {
                    notice({ content: $.deleting })
                    autoNotices(instance.deleteBot(account))
                  }
                })}>{$0('Delete')}</button></div>
            </form>
        }
      </div>
    </div>
  }
  return MultiInstances
}
