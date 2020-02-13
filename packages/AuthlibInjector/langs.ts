import { locates } from '@plugin'

export const zhCN = {
  url: '认证服务器地址',
  redirect: '重定向次数过多!',
  downloadFailed: '下载失败!',
  description: 'Authlib-Injector 登陆插件.',
  withoutProfile: '你还没有在网页中选择角色!'
}

export default locates<typeof zhCN>({
  'zh-cn': zhCN,
  'en-us': {
    url: 'Server URL',
    downloadFailed: 'Download failed!',
    redirect: 'Redirect too many times!',
    description: 'Authlib-Injector plugin.',
    withoutProfile: "You haven't selected a profile on the web yet"
  }
})
