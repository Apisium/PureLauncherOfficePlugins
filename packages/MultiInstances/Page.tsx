/* eslint-disable @typescript-eslint/explicit-function-return-type, object-curly-newline */
import { React, Reqwq, ProfilesStore, pluginMaster, $ as $0, xmcl, openConfirmDialog, getSuitableMemory, fs,
  version as launcherBrand, constants, notice, Avatar, getVersionTypeText, resolveJavaPath } from '@plugin'
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
        {accounts.map(it => <option value={it.key} key={it.key}>{it.username} ({it.type})</option>)}
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
        try {
          if (!await authenticator.validate(account, true)) {
            throw new Error($0('Current account is invalid, please re-login!'))
          }
        } catch (e) {
          if (!e || !e.connectFailed || !await openConfirmDialog({
            text: $0('Network connection failed. Do you want to play offline?'),
            cancelButton: true
          })) {
            console.error(e)
            notice({ content: $.cannotLogin, error: true })
            return
          }
        }
        try {
          const v = { version }
          await pluginMaster.emitSync('launchResolveVersion', v)
          await pluginMaster.emitSync('launchPostResolvedVersion', v)

          await pluginMaster.emit('launchPreUpdate', v.version)
          await pluginMaster.emit('launchPostUpdate', v.version)

          const versionId = await ps.resolveVersion(v.version)
          await ps.checkModsDirectoryOfVersion(versionId,
            (await fs.readJson(constants.RESOURCES_VERSIONS_INDEX_PATH, { throws: false }) || { })[version])
          await pluginMaster.emit('launchEnsureFiles', versionId)

          const versionDir = join(constants.VERSIONS_PATH, versionId)
          const javaPath = await resolveJavaPath(ps.extraJson.javaPath)
          const json = (await fs.readJson(constants.RESOURCES_VERSIONS_INDEX_PATH, { throws: false }) || { })[versionId]
          const option: import('@xmcl/core').LaunchOption & { prechecks: import('@xmcl/core').LaunchPrecheck[] } = {
            launcherBrand,
            minMemory: 512,
            properties: {},
            userType: 'mojang',
            version: versionId,
            launcherName: 'pure-launcher',
            accessToken: a.accessToken || '',
            versionType: getVersionTypeText(),
            resourcePath: constants.GAME_ROOT,
            extraExecOption: { detached: true },
            javaPath: ps.extraJson.javaPath || 'javaw',
            gameProfile: { id: a.uuid, name: a.username },
            prechecks: ps.extraJson.noChecker ? [] : undefined,
            extraJVMArgs: (ps.extraJson.javaArgs || '').split(' '),
            maxMemory: getSuitableMemory(!!JSON.parse(localStorage.getItem('javaArches') || '{}')[javaPath]),
            gamePath: json?.isolation || (await fs.readJson(join(versionDir, versionId + '.json'),
              { throws: false }))?.isolation ? versionDir : constants.GAME_ROOT
          }
          await pluginMaster.emitSync('preLaunch', versionId, option, a)
          const p = (await launch(option))
            .on('error', e => {
              console.error(e)
              notice({ content: $.launchFailed + ': ' + e.message, error: true })
            })
            .on('exit', code => code && notice({ content: $.launchFailed + ': ' + code, error: true }))
          await pluginMaster.emit('postLaunch', p, versionId, option)
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
