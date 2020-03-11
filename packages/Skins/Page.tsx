import { promises as fs } from 'fs'
import { React, $ as $0, Loading, autoNotices, notice } from '@plugin'

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    marginTop: 36,
    borderRadius: 4,
    display: 'flex',
    flexWrap: 'wrap' as 'wrap',
    paddingBottom: 30,
    height: 320,
    justifyContent: 'center',
    background: 'var(--secondary-color)',
    boxShadow: '0 8px 11px -5px rgba(0, 0, 0, 0.2), 0 17px 26px 2px rgba(0, 0, 0, 0.14), 0 6px 32px 5px rgba(0, 0, 0, 0.12)'
  },
  loading: { flex: 1, display: 'flex' },
  input: {
    resize: 'none',
    width: '100%',
    height: 'calc(100% - 20px)'
  },
  button: {
    padding: '8px 20px'
  }
}

export default (instance: import('./index').default) => {
  const Page: React.FC = () => {
    const [loading, setLoading] = React.useState(true)
    const [css, setCss] = React.useState('')
    React.useEffect(() => void fs.readFile(instance.cssPath).then(it => setCss(it.toString()), () => { /* empty */ })
      .finally(() => setLoading(false)), [])
    return <div style={styles.container}>
      {loading ? <div style={styles.loading}><Loading /></div> : <>
        <textarea value={css} style={styles.input} onChange={e => setCss(e.target.value)} />
        <button
          style={styles.button}
          className='btn btn-primary'
          onClick={() => {
            instance.applyCss(css)
            notice({ content: $0('Saving...') })
            autoNotices(fs.writeFile(instance.cssPath, css))
          }}
        >{$0('SAVE')}</button>
      </>}
    </div>
  }
  return Page
}
