import {useState,useEffect,useRef} from 'react'
import {Volume2,VolumeX,Sun,Moon,Flame,Heart} from 'lucide-react'
import {LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer} from 'recharts'
import {CATS,QS} from './data'

const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function useLS(k,d){
  const [v,s]=useState(()=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):d}catch{return d}})
  useEffect(()=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},[k,v]);return [v,s]
}
const beep=(on,ok)=>{if(!on)return;try{const c=new AudioContext(),o=c.createOscillator();o.frequency.value=ok?660:180;o.connect(c.destination);o.start();o.stop(c.currentTime+.15)}catch{}}
const pick=(c,n)=>shuffle(c==='all'?QS:QS.filter(q=>q.c===c)).slice(0,n).map(q=>({...q,o:shuffle(q.a)}))
const MODES={classic:['⚡ Classic','Очки + бонус за скорость'],blitz:['🔥 Blitz','8 секунд на вопрос'],survival:['❤️ Survival','До трёх ошибок'],exam:['📝 Exam','Без таймера и объяснений, итог в %']}
const ACH=[['First Win','🥇','Сыграй первую игру',P=>P.hist.length>0],['Brain Master','🧠','10 правильных подряд',P=>P.max>=10],['Perfect Score','💯','100% в одной игре',P=>P.hist.some(h=>h.pct===100)],['Explorer','🧭','5 разных категорий',P=>new Set(P.hist.map(h=>h.cat)).size>=5],['Quiz Legend','👑','5000 очков опыта',P=>P.xp>=5000]]
const lvl=xp=>Math.floor(xp/500)+1

function Modal({children}){return <div className="modal"><div className="panel">{children}</div></div>}

function Game({cfg,sound,onEnd,onExit}){
  const time=cfg.mode==='blitz'?8:cfg.mode==='exam'?0:cfg.time
  const [qs]=useState(()=>cfg.qs?cfg.qs.map(q=>({...q,o:shuffle(q.a)})):pick(cfg.cat,cfg.n))
  const [i,setI]=useState(0),[sel,setSel]=useState(),[score,setScore]=useState(0),[streak,setStreak]=useState(0),[max,setMax]=useState(0)
  const [lives,setLives]=useState(3),[log,setLog]=useState([]),[left,setLeft]=useState(time),[gain,setGain]=useState(0),[ask,setAsk]=useState(false)
  const lock=useRef(false),t0=useRef(Date.now()),q=qs[i]
  function answer(opt){
    if(lock.current||!q)return;lock.current=true
    const ok=opt===q.a[0],st=ok?streak+1:0
    const g=ok?100+(time?Math.round(50*Math.max(0,left)/time):0)+(st%5===0?100:0):0
    beep(sound,ok);setSel(opt??'—');setStreak(st);setMax(Math.max(max,st));setScore(score+g);setGain(g)
    if(!ok&&cfg.mode==='survival')setLives(lives-1)
    setLog([...log,{q,ok,sec:(Date.now()-t0.current)/1000}])
  }
  function next(){
    if(i+1>=qs.length||lives<=0)return onEnd({log,score,max})
    setI(i+1);setSel(undefined);setLeft(time);setGain(0);lock.current=false;t0.current=Date.now()
  }
  useEffect(()=>{if(!time||sel!==undefined||!q)return;const id=setInterval(()=>setLeft(l=>l-.1),100);return()=>clearInterval(id)},[time,sel,i])
  useEffect(()=>{if(time&&left<=0&&sel===undefined)answer(null)})
  useEffect(()=>{const h=e=>{
    if(e.key==='Escape')setAsk(a=>!a)
    else if(ask)return
    else if(/^[1-4]$/.test(e.key)&&q&&sel===undefined)answer(q.o[+e.key-1])
    else if(e.key==='Enter'&&sel!==undefined)next()}
    addEventListener('keydown',h);return()=>removeEventListener('keydown',h)})
  if(!q)return <div className="panel"><h2>Нет вопросов</h2><button onClick={onExit}>На главную</button></div>
  return <div className="game">
    <div className="bar"><span>{i+1}/{qs.length}</span><b>⭐ {score}</b>{streak>1&&<span><Flame size={16}/> {streak}</span>}
      {cfg.mode==='survival'&&<span>{[0,1,2].map(k=><Heart key={k} size={16} fill={k<lives?'#f43f5e':'none'}/>)}</span>}
      <button className="ghost" onClick={()=>setAsk(true)}>Выйти</button></div>
    <div className="track"><i style={{width:`${(i/qs.length)*100}%`}}/></div>
    {time>0&&<div className="track t"><i style={{width:`${Math.max(0,left/time)*100}%`,background:left<time/4?'var(--bad)':'var(--acc2)'}}/></div>}
    <h2 className="q">{q.q}</h2>
    <div className="opts">{q.o.map((o,k)=>
      <button key={o} disabled={sel!==undefined} className={sel===undefined?'':o===q.a[0]?'ok':o===sel?'bad':'dim'} onClick={()=>answer(o)}><kbd>{k+1}</kbd>{o}</button>)}</div>
    {sel!==undefined&&<div className="panel exp">
      <b>{sel===q.a[0]?`✅ Верно! +${gain}`:sel==='—'?'⏰ Время вышло':'❌ Неверно'}</b>
      {cfg.mode!=='exam'&&<p>{q.e}</p>}
      <button onClick={next}>{i+1>=qs.length||lives<=0?'Результаты':'Дальше (Enter)'}</button></div>}
    {ask&&<Modal><h3>Выйти из игры?</h3><p>Прогресс не сохранится.</p><button onClick={onExit}>Выйти</button> <button className="ghost" onClick={()=>setAsk(false)}>Продолжить</button></Modal>}
  </div>
}

function Results({r,go,again,retry}){
  const n=r.log.length,c=r.log.filter(x=>x.ok).length,pct=n?Math.round(c/n*100):0
  const tot=r.log.reduce((s,x)=>s+x.sec,0),wrong=r.log.filter(x=>!x.ok)
  return <div><h1>{pct>=80?'🏆 Отлично!':pct>=50?'👍 Хорошо!':'💪 Есть куда расти'}</h1>
    <div className="grid">{[['Очки',r.score],['Верно',`${c}/${n}`],['Точность',pct+'%'],['Всего',Math.round(tot)+' с'],['В среднем',(n?tot/n:0).toFixed(1)+' с'],['Лучшая серия',r.max]].map(([a,b])=><div className="panel stat" key={a}><small>{a}</small><b>{b}</b></div>)}</div>
    {wrong.length>0&&<><h3>Ошибки</h3>{wrong.map(x=><div className="panel" key={x.q.q}><b>{x.q.q}</b><p>Правильно: <u>{x.q.a[0]}</u>. {x.q.e}</p></div>)}</>}
    <div className="row">{wrong.length>0&&<button onClick={()=>retry(wrong.map(x=>x.q))}>Повторить ошибки</button>}<button onClick={again}>Играть снова</button><button className="ghost" onClick={()=>go('home')}>На главную</button></div></div>
}

function Study({cat,go}){
  const [cards]=useState(()=>shuffle(cat==='all'?QS:QS.filter(q=>q.c===cat))),[i,setI]=useState(0),[f,setF]=useState(false)
  useEffect(()=>{const h=e=>{if(e.code==='Space'){e.preventDefault();setF(x=>!x)}};addEventListener('keydown',h);return()=>removeEventListener('keydown',h)},[])
  const c=cards[i];if(!c)return <button onClick={()=>go('home')}>Нет карточек</button>
  const move=d=>{setF(false);setI((i+d+cards.length)%cards.length)}
  return <div><h2>Карточки {i+1}/{cards.length}</h2>
    <button className={'card '+(f?'flip':'')} onClick={()=>setF(!f)}>{f?<><b>{c.a[0]}</b><p>{c.e}</p></>:c.q}</button>
    <p><small>Нажми на карточку или пробел, чтобы перевернуть</small></p>
    <div className="row"><button onClick={()=>move(-1)}>← Назад</button><button onClick={()=>move(1)}>Дальше →</button><button className="ghost" onClick={()=>go('home')}>На главную</button></div></div>
}

function Stats({P,setP,go}){
  const [ask,setAsk]=useState(false),best={}
  P.hist.forEach(h=>{best[h.name]=Math.max(best[h.name]||0,h.score)})
  const lb=Object.entries(best).sort((a,b)=>b[1]-a[1]).slice(0,10),med=['🥇','🥈','🥉']
  return <div><h2>Статистика</h2>
    {P.hist.length>1?<div className="panel" style={{height:240}}><ResponsiveContainer><LineChart data={P.hist.slice(-20).map((h,k)=>({k:k+1,score:h.score}))}><XAxis dataKey="k"/><YAxis/><Tooltip/><Line dataKey="score" stroke="#8b5cf6" strokeWidth={3}/></LineChart></ResponsiveContainer></div>:<p>Сыграй хотя бы две игры, чтобы увидеть график.</p>}
    <h3>Таблица лидеров (этого устройства)</h3>{lb.length?lb.map(([n,s],k)=><div className="panel lb" key={n}><span>{med[k]||k+1} {n}</span><b>{s}</b></div>):<p>Пока пусто.</p>}
    <h3>История</h3>{P.hist.slice().reverse().slice(0,10).map((h,k)=><div className="panel lb" key={k}><span>{h.name} · {h.mode} · {h.d}</span><b>{h.score} ({h.pct}%)</b></div>)}
    <div className="row"><button className="ghost" onClick={()=>go('home')}>На главную</button><button className="danger" onClick={()=>setAsk(true)}>Сбросить статистику</button></div>
    {ask&&<Modal><h3>Сбросить всё?</h3><p>Опыт, историю и достижения не вернуть.</p><button className="danger" onClick={()=>{setP({xp:0,hist:[],max:0,day:'',streak:0});setAsk(false)}}>Сбросить</button> <button className="ghost" onClick={()=>setAsk(false)}>Отмена</button></Modal>}</div>
}

export default function App(){
  const [theme,setTheme]=useLS('qs_theme','dark'),[sound,setSound]=useLS('qs_sound',true),[name,setName]=useLS('qs_name','')
  const [P,setP]=useLS('qs_profile',{xp:0,hist:[],max:0,day:'',streak:0})
  const [S,setS]=useLS('qs_settings',{cat:'all',n:10,time:15,mode:'classic'})
  const [view,setView]=useState('home'),[cfg,setCfg]=useState(null),[res,setRes]=useState(null),[toast,setToast]=useState(''),[key,setKey]=useState(0)
  useEffect(()=>{document.documentElement.dataset.theme=theme},[theme])
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3000);return()=>clearTimeout(t)},[toast])
  const start=c=>{setCfg(c);setKey(k=>k+1);setView('play')}
  const total=QS.length,avail=S.cat==='all'?total:QS.filter(q=>q.c===S.cat).length
  function end(r){
    const n=r.log.length,pct=n?Math.round(r.log.filter(x=>x.ok).length/n*100):0
    const today=new Date().toDateString(),y=new Date(Date.now()-864e5).toDateString()
    const streak=P.day===today?P.streak:P.day===y?P.streak+1:1
    const xp=P.xp+r.score
    if(lvl(xp)>lvl(P.xp))setToast(`🎉 Новый уровень: ${lvl(xp)}!`)
    setP({xp,max:Math.max(P.max,r.max),day:today,streak,hist:[...P.hist,{name:name||'Игрок',cat:cfg.cat,mode:cfg.mode,score:r.score,pct,d:new Date().toLocaleDateString()}].slice(-100)})
    setRes(r);setView('results')
  }
  const best=Math.max(0,...P.hist.map(h=>h.score))
  return <div className="app">
    <header><a onClick={()=>setView('home')} className="logo">⛈️ QuizStorm</a>
      <div><button className="ghost" aria-label="Звук" onClick={()=>setSound(!sound)}>{sound?<Volume2/>:<VolumeX/>}</button>
      <button className="ghost" aria-label="Тема" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun/>:<Moon/>}</button></div></header>
    <main>
    {view==='home'&&<>
      <h1>Think fast. Learn more. Win together.</h1>
      <div className="panel"><input placeholder="Твой никнейм" value={name} maxLength={16} onChange={e=>setName(e.target.value)} aria-label="Никнейм"/>
        <div className="row"><span>Уровень {lvl(P.xp)}</span><div className="track grow"><i style={{width:`${(P.xp%500)/5}%`}}/></div><span>{P.xp%500}/500 XP</span></div>
        <div className="row"><span>🏆 Рекорд: {best}</span><span><Flame size={14}/> Серия дней: {P.streak}</span></div></div>
      <h3>Режим</h3><div className="grid">{Object.entries(MODES).map(([k,[t,d]])=><button key={k} className={'mode '+(S.mode===k?'on':'')} onClick={()=>setS({...S,mode:k})}><b>{t}</b><small>{d}</small></button>)}</div>
      <h3>Категория · вопросов: {avail}</h3><div className="row wrap"><button className={'chip '+(S.cat==='all'?'on':'')} onClick={()=>setS({...S,cat:'all'})}>🎲 Все</button>{Object.entries(CATS).map(([k,v])=><button key={k} className={'chip '+(S.cat===k?'on':'')} onClick={()=>setS({...S,cat:k})}>{v}</button>)}</div>
      <div className="row wrap"><label>Вопросов <select value={S.n} onChange={e=>setS({...S,n:+e.target.value})}>{[10,15,20,30].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Таймер <select value={S.time} onChange={e=>setS({...S,time:+e.target.value})}><option value={0}>Выкл</option>{[10,15,20,30].map(x=><option key={x} value={x}>{x} с</option>)}</select></label></div>
      <div className="row"><button disabled={!name.trim()||!avail} onClick={()=>start({...S,n:Math.min(S.n,avail)})}>▶ Начать игру</button>
        <button className="ghost" onClick={()=>setView('study')}>🃏 Карточки</button><button className="ghost" onClick={()=>setView('stats')}>📊 Результаты</button></div>
      {!name.trim()&&<small>Введи никнейм, чтобы начать.</small>}
      <h3>Достижения</h3><div className="grid">{ACH.map(([t,e,d,f])=><div key={t} className={'panel ach '+(f(P)?'':'lock')}><span>{e}</span><b>{t}</b><small>{d}</small></div>)}</div></>}
    {view==='play'&&<Game key={key} cfg={cfg} sound={sound} onEnd={end} onExit={()=>setView('home')}/>}
    {view==='results'&&res&&<Results r={res} go={setView} again={()=>start(cfg)} retry={qs=>start({...cfg,qs,mode:'classic'})}/>}
    {view==='study'&&<Study cat={S.cat} go={setView}/>}
    {view==='stats'&&<Stats P={P} setP={setP} go={setView}/>}
    </main>
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>
}