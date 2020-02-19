/* eslint-disable object-curly-newline */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { React, Reqwq, ProfilesStore, pluginMaster, $ as $0, xmcl,
  version as launcherBrand, constants, notice, Avatar, getVersionTypeText } from '@plugin'
import { join } from 'path'
import $ from './langs'

const { Core: { launch } } = xmcl

const css: any[] = [
  {
    marginTop: 36,
    borderRadius: 4,
    display: 'flex',
    flexWrap: 'wrap',
    padding: '30px 0',
    justifyContent: 'center',
    background: 'var(--secondary-color)',
    boxShadow: '0 8px 11px -5px rgba(0, 0, 0, 0.2), 0 17px 26px 2px rgba(0, 0, 0, 0.14), 0 6px 32px 5px rgba(0, 0, 0, 0.12)'
  },
  { width: '100%', textAlign: 'center' },
  { letterSpacing: 1 },
  { width: 180, marginBottom: 10 },
  { width: 180, marginBottom: 20 },
  {
    width: 120,
    height: 120,
    marginBottom: 30,
    boxShadow: '0 6px 7px -4px rgba(0, 0, 0, 0.2), 0px 11px 15px 1px rgba(0, 0, 0, 0.14),' +
      ' 0px 4px 20px 3px rgba(0, 0, 0, 0.12)'
  }
]

const { useStore } = Reqwq
const MultiInstances: React.FC = () => {
  const noTitle = $0('No Title')
  const lastRelease = $0('last-release')
  const lastSnapshot = $0('last-snapshot')
  const ps = useStore(ProfilesStore)
  const accounts = pluginMaster.getAllProfiles()
  const versions = Object.entries(ps.profiles)
  const [account, setAccount] = React.useState(accounts[0]?.key)
  const [version, setVersion] = React.useState(versions[0]?.[0])
  const a = accounts.find(it => it.key === account)
  return <div style={css[0]}>
    <Avatar
      data-sound
      key={ps.i}
      style={css[5]}
      src={a ? [
        a.skinUrl,
        join(constants.SKINS_PATH, a.key + '.png')
      ] : null}
    />
    <div style={css[1]}>
      <span style={css[2]}>{$.account}: </span>
      <select style={css[3]} onChange={e => setAccount(e.target.value)} value={account}>
        {accounts.map(it => <option value={it.key} key={it.key}>{it.username}</option>)}
      </select>
    </div>
    <div style={css[1]}>
      <span style={css[2]}>{$.version}: </span>
      <select style={css[4]} onChange={e => setVersion(e.target.value)} value={version}>
        {versions.map(([key, it]) => <option value={key} key={key}>
          {`${it.type === 'latest-release' ? lastRelease
            : it.type === 'latest-snapshot' ? lastSnapshot : it.name || noTitle} (${it.lastVersionId})`}
        </option>)}
      </select>
    </div>
    <button
      className='btn btn-primary'
      onClick={async () => {
        if (!a) {
          notice({ content: $.noAccount, error: true })
          return
        }
        notice({ content: $.launching })
        const authenticator = pluginMaster.logins[a.type]
        try { if (!await authenticator.validate(account)) await authenticator.refresh(account) } catch (e) {
          console.error(e)
          notice({ content: $.cannotLogin, error: true })
          return
        }
        try {
          const versionId = await ps.resolveVersion(version)
          const option: import('@xmcl/core').LaunchOption = {
            launcherBrand,
            properties: {},
            userType: 'mojang',
            version: versionId,
            gamePath: constants.GAME_ROOT,
            launcherName: 'pure-launcher',
            accessToken: a.accessToken || '',
            versionType: getVersionTypeText(),
            javaPath: ps.extraJson.javaPath || 'javaw',
            gameProfile: { id: a.uuid, name: a.username },
            extraJVMArgs: (ps.extraJson.javaArgs || '').split(' '),
            extraExecOption: { detached: true }
          }
          await pluginMaster.emitSync('preLaunch', versionId, option)
          await launch(option)
          notice({ content: $.launched })
        } catch (e) {
          console.error(e)
          notice({ content: $.launchFailed, error: true })
        }
      }}
    >{$.launch}</button>
  </div>
}

export default MultiInstances
