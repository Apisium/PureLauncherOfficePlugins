/* eslint-disable object-curly-newline */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { React, Reqwq, ProfileStore, pluginMaster, $ as $0, xmcl,
  version as launcherBrand, constants, notice } from '@plugin'

const { Launcher: { default: { launch } } } = xmcl

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
  { width: 180, marginBottom: 20 }
]

const { useStore } = Reqwq
export default $ => () => {
  const noTitle = $0('No Title')
  const lastRelease = $0('last-release')
  const lastSnapshot = $0('last-snapshot')
  const ps = useStore(ProfileStore)
  const accounts = pluginMaster.getAllProfiles()
  const versions = Object.entries(ps.profiles)
  const [account, setAccount] = React.useState(accounts[0]?.key)
  const [version, setVersion] = React.useState(versions[0]?.[0])
  return <div style={css[0]}>
    <div style={css[1]}>
      <span style={css[2]}>{$('account')}: </span>
      <select style={css[3]} onChange={e => setAccount(e.target.value)} value={account}>
        {accounts.map(it => <option value={it.key} key={it.key}>{it.username}</option>)}
      </select>
    </div>
    <div style={css[1]}>
      <span style={css[2]}>{$('version')}: </span>
      <select style={css[4]} onChange={e => setVersion(e.target.value)} value={version}>
        {versions.map(([key, it]) => <option value={key} key={key}>
          { `${it.type === 'latest-release' ? lastRelease
            : it.type === 'latest-snapshot' ? lastSnapshot : it.name || noTitle} (${it.lastVersionId})`}
        </option>)}
      </select>
    </div>
    <button
      className='btn btn-primary'
      onClick={async () => {
        const a = accounts.find(it => it.key === account)
        if (!a) {
          notice({ content: $('noAccount'), error: true })
          return
        }
        notice({ content: $('launching') })
        const authenticator = pluginMaster.logins[a.type]
        try { if (!await authenticator.validate(account)) await authenticator.refresh(account) } catch (e) {
          console.error(e)
          notice({ content: $('cannotLogin'), error: true })
          return
        }
        try {
          await launch({
            launcherBrand,
            properties: {},
            userType: 'mojang',
            gamePath: constants.GAME_ROOT,
            launcherName: 'pure-launcher',
            version: await ps.resolveVersion(version),
            extraJVMArgs: (ps.extraJson.javaArgs || '').split(' '),
            accessToken: a.accessToken || '',
            gameProfile: { id: a.uuid, name: a.username },
            javaPath: ps.extraJson.javaPath || 'javaw',
            ensureNatives: () => Promise.resolve(),
            ensureLibraries: () => Promise.resolve(),
            extraExecOption: {
              detached: true
            }
          })
          notice({ content: $('launched') })
        } catch (e) {
          console.error(e)
          notice({ content: $('launchFailed'), error: true })
        }
      }}
    >{$('launch')}</button>
  </div>
}
