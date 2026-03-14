import sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Добавляем state variables после setProvider
old = "const [provider, setProvider] = useState('groq');"
new_state = """const [provider, setProvider] = useState('groq');
  const [freeQ,setFreeQ]=useState("");
  const [freeA,setFreeA]=useState("");
  const [freeLoading,setFreeLoading]=useState(false);
  const [freeHistory,setFreeHistory]=useState([]);

  async function askAI(){
    if(!freeQ.trim())return;
    setFreeLoading(true);setFreeA("");
    try{
      const r=await api.apiRequest("/uz-market/quick-ask",{method:"POST",body:JSON.stringify({question:freeQ,provider,sector:null})});
      const answer=r.answer||r.content||JSON.stringify(r);
      setFreeA(answer);
      setFreeHistory(h=>[{q:freeQ,a:answer},...h].slice(0,10));
    }catch(e){setFreeA("\u041e\u0448\u0438\u0431\u043a\u0430: "+e.message);}finally{setFreeLoading(false);}
  }"""
text = text.replace(old, new_state)

# Добавляем UI блок перед STEPS progress bar
steps_bar = "{STEPS.map((_,i)=><div key={i}"
free_ui = """{/* Free Query Block */}
      <div style={{marginBottom:24,padding:20,background:"linear-gradient(135deg,#eff6ff,#faf5ff)",borderRadius:16,border:"1px solid #c7d2fe"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{fontSize:24}}>\U0001f916</span>
          <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>\u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435 AI \u043f\u0440\u043e \u0440\u044b\u043d\u043e\u043a \u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d\u0430</h2>
        </div>
        <p style={{margin:"0 0 12px",fontSize:13,color:C.muted}}>\u041b\u044e\u0431\u043e\u0439 \u0432\u043e\u043f\u0440\u043e\u0441 \u043e\u0431 \u044d\u043a\u043e\u043d\u043e\u043c\u0438\u043a\u0435, \u043e\u0442\u0440\u0430\u0441\u043b\u044f\u0445, \u043d\u0430\u043b\u043e\u0433\u0430\u0445, \u0437\u0430\u043a\u043e\u043d\u0430\u0445, \u0438\u043d\u0432\u0435\u0441\u0442\u0438\u0446\u0438\u044f\u0445 \u0432 \u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d\u0435</p>
        <div style={{display:"flex",gap:8}}>
          <input value={freeQ} onChange={e=>setFreeQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askAI()} placeholder="\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u041a\u0430\u043a\u0438\u0435 \u043d\u0430\u043b\u043e\u0433\u043e\u0432\u044b\u0435 \u043b\u044c\u0433\u043e\u0442\u044b \u0434\u043b\u044f IT \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0439?" style={{flex:1,padding:"12px 16px",border:"1px solid #c7d2fe",borderRadius:12,fontSize:14,background:"#fff"}}/>
          <button onClick={askAI} disabled={freeLoading||!freeQ.trim()} style={{padding:"12px 24px",borderRadius:12,border:"none",background:freeLoading?"#94a3b8":"linear-gradient(135deg,#3b82f6,#8b5cf6)",color:"#fff",cursor:freeLoading?"not-allowed":"pointer",fontSize:14,fontWeight:700,whiteSpace:"nowrap"}}>{freeLoading?"\u2728 \u0414\u0443\u043c\u0430\u044e...":"\U0001f916 \u0421\u043f\u0440\u043e\u0441\u0438\u0442\u044c"}</button>
        </div>
        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>{["\u0421\u0442\u0430\u0432\u043a\u0430 \u0426\u0411 \u0438 \u0438\u043d\u0444\u043b\u044f\u0446\u0438\u044f 2026","\u041b\u044c\u0433\u043e\u0442\u044b \u0421\u042d\u0417 \u0434\u043b\u044f \u043f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0441\u0442\u0432\u0430","\u041d\u0430\u043b\u043e\u0433\u0438 \u0434\u043b\u044f \u041e\u041e\u041e \u0432 \u0423\u0437\u0431\u0435\u043a\u0438\u0441\u0442\u0430\u043d\u0435","\u0424\u043e\u043d\u0434\u043e\u0432\u044b\u0439 \u0440\u044b\u043d\u043e\u043a UZSE \u043e\u0431\u0437\u043e\u0440","IT Park \u0443\u0441\u043b\u043e\u0432\u0438\u044f \u0438 \u043d\u0430\u043b\u043e\u0433\u0438"].map(q=><button key={q} onClick={()=>setFreeQ(q)} style={{padding:"6px 12px",borderRadius:16,border:"1px solid #e2e8f0",background:"#fff",fontSize:12,color:C.muted,cursor:"pointer"}}>{q}</button>)}</div>
        {freeA&&<div style={{marginTop:16,padding:16,background:"#fff",borderRadius:12,border:"1px solid #e2e8f0"}}><div style={{fontSize:12,color:C.primary,fontWeight:600,marginBottom:8}}>\U0001f916 AI \u043e\u0442\u0432\u0435\u0442:</div><div style={{fontSize:14,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{freeA}</div></div>}
        {freeHistory.length>1&&<details style={{marginTop:8}}><summary style={{cursor:"pointer",fontSize:12,color:C.muted}}>\U0001f4dc \u0418\u0441\u0442\u043e\u0440\u0438\u044f ({freeHistory.length})</summary><div style={{marginTop:8}}>{freeHistory.slice(1).map((h,i)=><div key={i} style={{padding:8,marginBottom:4,background:"#f8fafc",borderRadius:8,fontSize:12}}><strong style={{color:C.primary}}>Q:</strong> {h.q}<br/><strong style={{color:C.success}}>A:</strong> {h.a.substring(0,200)}...</div>)}</div></details>}
      </div>

      """ + "{STEPS.map((_,i)=><div key={i}"

text = text.replace(steps_bar, free_ui, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print("PATCHED OK, size:", len(text))