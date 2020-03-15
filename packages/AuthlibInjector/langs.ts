import { locates } from '@plugin'

export const zhCN = {
  url: '认证服务器地址',
  redirect: '重定向次数过多!',
  downloadFailed: '下载失败!',
  description: 'Authlib-Injector 登陆插件.',
  withoutProfile: '你还没有在网页中选择角色!',
  incorrectAccount: '错误的账户',
  notSelectedProfile: '检测到该版本应使用 AuthlibInjector 进行登陆, 但你没有选择正确的账户, 请选择后再尝试重新启动!',
  noExistsProfile: '检测到该版本应使用 AuthlibInjector 进行登陆, 但并没有找到合适的账号, 点击确定按钮可以进行登陆.'
}

export default locates<typeof zhCN>({
  'zh-cn': zhCN,
  'en-us': {
    url: 'Server URL',
    downloadFailed: 'Download failed!',
    redirect: 'Redirect too many times!',
    description: 'Authlib-Injector plugin.',
    incorrectAccount: 'Incorrect account',
    withoutProfile: "You haven't selected a profile on the web yet",
    notSelectedProfile: 'It is detected that this version should use AuthlibInjector to login, but you have not selected the correct account, please select and relaunch!',
    noExistsProfile: 'It is detected that this version should use AuthlibInjector to login, but no suitable account has been found. Click OK to login.'
  }
})
