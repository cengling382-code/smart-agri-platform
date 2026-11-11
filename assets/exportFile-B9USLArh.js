function T(){const e=new Date,o=i=>String(i).padStart(2,"0");return`${e.getFullYear()}${o(e.getMonth()+1)}${o(e.getDate())}`}function j(e,o){const i=URL.createObjectURL(o),l=document.createElement("a");l.href=i,l.download=e,document.body.appendChild(l),l.click(),l.remove(),setTimeout(()=>URL.revokeObjectURL(i),1e3)}const x=e=>{const o=e==null?"":String(e);return/[",\n\r]/.test(o)?`"${o.replace(/"/g,'""')}"`:o};function w(e,o,i,l=[]){const s=[...l.map(c=>x(c)),o.map(x).join(","),...i.map(c=>c.map(x).join(","))],a=new Blob(["\uFEFF"+s.join(`\r
`)],{type:"text/csv;charset=utf-8"});j(`${e}_${T()}.csv`,a)}const R=30;function P(e,o,i,l){const g=180+l.length*36+48,n=document.createElement("canvas");n.width=1240,n.height=g;const t=n.getContext("2d");t.fillStyle="#ffffff",t.fillRect(0,0,1240,g),t.fillStyle="#1f2d24",t.font='700 34px "Microsoft YaHei", "PingFang SC", sans-serif',t.fillText(e,48,72),t.fillStyle="#6b7380",t.font='20px "Microsoft YaHei", "PingFang SC", sans-serif',t.fillText(o,48,110);const f=136,d=(1240-48*2)/Math.max(1,i.length);return t.fillStyle="#eef2ec",t.fillRect(48,f,1240-48*2,44),t.fillStyle="#2f4a38",t.font='700 20px "Microsoft YaHei", "PingFang SC", sans-serif',i.forEach((u,r)=>{t.fillText(String(u),48+r*d+10,f+28,d-16)}),t.font='19px "Microsoft YaHei", "PingFang SC", sans-serif',l.forEach((u,r)=>{const p=f+44+r*36;r%2&&(t.fillStyle="#fafbfa",t.fillRect(48,p,1240-48*2,36)),t.fillStyle="#3c4650",u.forEach(($,H)=>{t.fillText(String($!=null?$:""),48+H*d+10,p+25,d-16)}),t.strokeStyle="#e6e9e6",t.beginPath(),t.moveTo(48,p+36),t.lineTo(1192,p+36),t.stroke()}),{data:n.toDataURL("image/jpeg",.92),width:1240,height:g}}function W(e){const o=new TextEncoder,i=[],l=[];let s=0;const a=n=>{const t=typeof n=="string"?o.encode(n):n;i.push(t),s+=t.length},c=(n,t,f)=>{l[n]=s,a(`${n} 0 obj
${t}`),f&&(a(`stream
`),a(f),a(`
endstream`)),a(`
endobj
`)};a(`%PDF-1.4
`);const m=e.map((n,t)=>`${3+t*3} 0 R`).join(" ");c(1,`<< /Type /Catalog /Pages 2 0 R >>
`),c(2,`<< /Type /Pages /Kids [${m}] /Count ${e.length} >>
`),e.forEach((n,t)=>{const f=3+t*3,d=f+1,u=f+2,r=595,p=Math.round(595*n.height/n.width),$=`q
${r} 0 0 ${p} 0 0 cm
/Im0 Do
Q
`;c(f,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${r} ${p}] /Resources << /XObject << /Im0 ${u} 0 R >> >> /Contents ${d} 0 R >>
`),c(d,`<< /Length ${$.length} >>
`,$);const H=String(n.data).split(",")[1]||"",S=atob(H),y=new Uint8Array(S.length);for(let b=0;b<S.length;b++)y[b]=S.charCodeAt(b);c(u,`<< /Type /XObject /Subtype /Image /Width ${n.width} /Height ${n.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${y.length} >>
`,y)});const h=2+e.length*3,C=s;let g=`xref
0 ${h+1}
0000000000 65535 f 
`;for(let n=1;n<=h;n++)g+=`${String(l[n]||0).padStart(10,"0")} 00000 n 
`;return a(g),a(`trailer
<< /Size ${h+1} /Root 1 0 R >>
startxref
${C}
%%EOF
`),new Blob(i,{type:"application/pdf"})}function E(e,{title:o,meta:i="",headers:l,rows:s}){const a=[];for(let c=0;c<s.length;c+=R){const m=s.slice(c,c+R),h=s.length>R?`${i}（第 ${a.length+1} 页）`:i;a.push(P(o,h,l,m))}a.length||a.push(P(o,i,l,[])),j(`${e}_${T()}.pdf`,W(a))}export{E as a,j as b,w as d};
