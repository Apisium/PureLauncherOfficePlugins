import { locates } from '@plugin'

export const zhCN = {
  account: '账号',
  version: '版本',
  title: '游戏多开',
  launch: '启动游戏',
  launched: '启动成功!',
  launchFailed: '启动失败! 请先尝试使用自带的启动功能启动成功后再尝试!',
  launching: '游戏启动中...',
  cannotLogin: '无法验证账户!',
  noAccount: '你还没有选择账户!',
  description: '一个能让你同时开启多个游戏实例的插件.'
}

export default locates<typeof zhCN>({
  'zh-cn': zhCN,
  'en-us': {
    launch: 'Launch',
    account: 'ACCOUNT',
    version: 'VERSION',
    title: 'MultiInstances',
    launching: 'Game launching...',
    launchFailed: 'Failed to launch! Please try to use the built-in startup function to start successfully before trying again!',
    launched: 'Start up successful!',
    cannotLogin: 'Unable to verify the account.',
    noAccount: 'No account has been selected.',
    description: 'A plugin that allows you to run multiple game instances.'
  }
})
