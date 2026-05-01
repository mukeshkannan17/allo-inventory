const fs = require('fs');
const content = `"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StockItem { warehouseId: string; warehouseName: string; warehouseLocation: string; totalUnits: number; reservedUnits: number; availableUnits: number; }
interface Product { id: string; name: string; sku: string; description: string; price: number; stock: StockItem[]; }
const EMOJIS: Record<string, string> = { "TSK-001": "⚡", "MVB-002": "🔥", "SRF-003": "🌙", "PPW-004": "💪", "HGS-005": "✨", "OFO-006": "🐟" };

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Record<string, string>>({});

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
      const defaults: Record<string, string> = {};
      data.forEach((p: Product) => { const a = p.stock.find(s => s.availableUnits > 0); if (a) defaults[p.id] = a.warehouseId; });
      setSelectedWarehouse(defaults);
    } catch { setError("Failed to load"); } finally { setLoading(false); }
  }

  async function handleReserve(productId: string) {
    const warehouseId = selectedWarehouse[productId];
    if (!warehouseId) return;
    setReserving(productId); setError(null);
    try {
      const res = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, warehouseId, quantity: 1 }) });
      const data = await res.json();
      if (res.status === 409) { setError("Out of stock!"); return; }
      if (!res.ok) { setError(data.error || "Failed"); return; }
      router.push("/reservation/" + data.id);
    } catch { setError("Network error."); } finally { setReserving(null); }
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:48,height:48,border:"3px solid #ff6b35",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}></div>
        <p style={{color:"#666",fontFamily:"monospace",fontSize:14}}>loading inventory...</p>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0a",color:"#fff"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Mono:wght@400;500&display=swap'); *{box-sizing:border-box} .card{background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;transition:all 0.3s} .card:hover{border-color:#ff6b35;transform:translateY(-4px);box-shadow:0 20px 60px rgba(255,107,53,0.15)} .rbtn{background:#ff6b35;color:#fff;border:none;padding:14px 28px;border-radius:50px;font-family:'DM Mono',monospace;font-size:13px;cursor:pointer;transition:all 0.2s;width:100%} .rbtn:hover:not(:disabled){background:#ff8c5a;transform:scale(1.02)} .rbtn:disabled{background:#222;color:#444;cursor:not-allowed;transform:none} .wpill{padding:6px 12px;border-radius:20px;border:1px solid #333;background:transparent;color:#888;font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;transition:all 0.2s} .wpill.on{border-color:#ff6b35;color:#ff6b35;background:rgba(255,107,53,0.1)} @keyframes fi{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} .fi{animation:fi 0.5s ease forwards;opacity:0}"}</style>

      <header style={{borderBottom:"1px solid #1a1a1a",padding:"20px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"rgba(10,10,10,0.95)",backdropFilter:"blur(20px)",zIndex:100}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900}}>allo<span style={{color:"#ff6b35"}}>.</span>health</h1>
          <p style={{color:"#444",fontFamily:"'DM Mono',monospace",fontSize:11,marginTop:2}}>premium wellness inventory</p>
        </div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#444",background:"#111",border:"1px solid #222",padding:"8px 16px",borderRadius:8}}>{products.length} products</div>
      </header>

      <main style={{maxWidth:1200,margin:"0 auto",padding:"60px 40px"}}>
        <div style={{marginBottom:60,textAlign:"center"}} className="fi">
          <p style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"#ff6b35",letterSpacing:3,marginBottom:16}}>RESERVE · CONFIRM · DELIVER</p>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:52,fontWeight:900,lineHeight:1.1,marginBottom:16}}>Wellness,<br/><span style={{color:"#ff6b35",fontStyle:"italic"}}>reserved</span> for you.</h2>
          <p style={{color:"#555",fontSize:15,maxWidth:380,margin:"0 auto",lineHeight:1.7}}>Lock in your items for 10 minutes. No rushing, no missing out.</p>
        </div>

        {error && <div style={{background:"rgba(255,107,53,0.1)",border:"1px solid rgba(255,107,53,0.3)",borderRadius:12,padding:"16px 20px",marginBottom:32,fontFamily:"'DM Mono',monospace",fontSize:13,color:"#ff6b35",marginTop:-20}}>⚠ {error}</div>}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:24}}>
          {products.map((product, i) => {
            const total = product.stock.reduce((s,w) => s+w.availableUnits, 0);
            const selW = product.stock.find(s => s.warehouseId === selectedWarehouse[product.id]);
            const canR = selW && selW.availableUnits > 0;
            const emoji = ({"TSK-001":"⚡","MVB-002":"🔥","SRF-003":"🌙","PPW-004":"💪","HGS-005":"✨","OFO-006":"🐟"} as Record<string,string>)[product.sku] || "📦";
            return (
              <div key={product.id} className="card fi" style={{animationDelay:(i*0.08)+"s"}}>
                <div style={{height:4,background:"linear-gradient(90deg,#ff6b35,#ff8c5a)"}}></div>
                <div style={{padding:28}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                    <div style={{width:52,height:52,background:"#1a1a1a",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{emoji}</div>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,padding:"4px 10px",borderRadius:20,background:total>5?"rgba(34,197,94,0.1)":total>0?"rgba(255,165,0,0.1)":"rgba(239,68,68,0.1)",color:total>5?"#4ade80":total>0?"#ffa500":"#f87171",border:"1px solid "+(total>5?"rgba(34,197,94,0.3)":total>0?"rgba(255,165,0,0.3)":"rgba(239,68,68,0.3)")}}>{total>0?total+" left":"sold out"}</span>
                  </div>
                  <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:21,fontWeight:700,marginBottom:4,lineHeight:1.3}}>{product.name}</h3>
                  <p style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#444",marginBottom:10}}>{product.sku}</p>
                  <p style={{color:"#666",fontSize:13,lineHeight:1.6,marginBottom:20}}>{product.description}</p>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,paddingTop:16,borderTop:"1px solid #1a1a1a"}}>
                    <span style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:"#ff6b35"}}>₹{product.price.toLocaleString()}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#333"}}>per unit</span>
                  </div>
                  <p style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#444",marginBottom:8,letterSpacing:1}}>WAREHOUSE</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
                    {product.stock.map(s => (
                      <button key={s.warehouseId} className={"wpill"+(selectedWarehouse[product.id]===s.warehouseId?" on":"")} onClick={()=>setSelectedWarehouse(p=>({...p,[product.id]:s.warehouseId}))} disabled={s.availableUnits===0} style={{opacity:s.availableUnits===0?0.3:1}}>
                        {s.warehouseName} ({s.availableUnits})
                      </button>
                    ))}
                  </div>
                  <button className="rbtn" onClick={()=>handleReserve(product.id)} disabled={!canR||reserving===product.id}>
                    {reserving===product.id?"reserving...":!canR?"out of stock":"reserve for 10 min →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{marginTop:80,textAlign:"center",borderTop:"1px solid #1a1a1a",paddingTop:40}}>
          <p style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#2a2a2a"}}>reservations held for 10 minutes · concurrency-safe · powered by next.js + neon</p>
        </div>
      </main>
    </div>
  );
}`;
fs.writeFileSync('app/page.tsx', content);
console.log('done! New design written.');