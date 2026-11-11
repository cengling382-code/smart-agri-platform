function T(){const e=new Date,o=c=>String(c).padStart(2,"0");return`${e.getFullYear()}${o(e.getMonth()+1)}${o(e.getDate())}`}function j(e,o){const c=URL.createObjectURL(o),i=document.createElement("a");i.href=c,i.download=e,document.body.appendChild(i),i.click(),i.remove(),setTimeout(()=>URL.revokeObjectURL(c),1e3)}const x=e=>{const o=e==null?"":String(e);return/[",\n\r]/.test(o)?`"${o.replace(/"/g,'""')}"`:o};function w(e,o,c,i=[]){const s=[...i.map(l=>x(l)),o.map(x).join(","),...c.map(l=>l.map(x).join(","))],a=new Blob(["\uFEFF"+s.join(`\r
`)],{type:"text/csv;charset=utf-8"});j(`${e}_${T()}.csv`,a)}const R=30;function P(e,o,c,i){const g=180+i.length*36+48,n=document.createElement("canvas");n.width=1240,n.height=g;const t=n.getContext("2d");t.fillStyle="#ffffff",t.fillRect(0,0,1240,g),t.fillStyle="#1f2d24",t.font='700 34px "Microsoft YaHei", "PingFang SC", sans-serif',t.fillText(e,48,72),t.fillStyle="#6b7380",t.font='20px "Microsoft YaHei", "PingFang SC", sans-serif',t.fillText(o,48,110);const f=136,d=(1240-48*2)/Math.max(1,c.length);return t.fillStyle="#eef2ec",t.fillRect(48,f,1240-48*2,44),t.fillStyle="#2f4a38",t.font='700 20px "Microsoft YaHei", "PingFang SC", sans-serif',c.forEach((u,r)=>{t.fillText(String(u),48+r*d+10,f+28,d-16)}),t.font='19px "Microsoft YaHei", "PingFang SC", sans-serif',i.forEach((u,r)=>{const p=f+44+r*36;r%2&&(t.fillStyle="#fafbfa",t.fillRect(48,p,1240-48*2,36)),t.fillStyle="#3c4650",u.forEach((m,S)=>{t.fillText(String(m??""),48+S*d+10,p+25,d-16)}),t.strokeStyle="#e6e9e6",t.beginPath(),t.moveTo(48,p+36),t.lineTo(1192,p+36),t.stroke()}),{data:n.toDataURL("image/jpeg",.92),width:1240,height:g}}function W(e){const o=new TextEncoder,c=[],i=[];let s=0;const a=n=>{const t=typeof n=="string"?o.encode(n):n;c.push(t),s+=t.length},l=(n,t,f)=>{i[n]=s,a(`${n} 0 obj
${t}`),f&&(a(`stream
`),a(f),a(`
endstream`)),a(`
endobj
`)};a(`%PDF-1.4
`);const $=e.map((n,t)=>`${3+t*3} 0 R`).join(" ");l(1,`<< /Type /Catalog /Pages 2 0 R >>
`),l(2,`<< /Type /Pages /Kids [${$}] /Count ${e.length} >>
`),e.forEach((n,t)=>{const f=3+t*3,d=f+1,u=f+2,r=595,p=Math.round(595*n.height/n.width),m=`q
${r} 0 0 ${p} 0 0 cm
/Im0 Do
Q
`;l(f,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${r} ${p}] /Resources << /XObject << /Im0 ${u} 0 R >> >> /Contents ${d} 0 R >>
`),l(d,`<< /Length ${m.length} >>
`,m);const S=String(n.data).split(",")[1]||"",b=atob(S),y=new Uint8Array(b.length);for(let H=0;H<b.length;H++)y[H]=b.charCodeAt(H);l(u,`<< /Type /XObject /Subtype /Image /Width ${n.width} /Height ${n.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${y.length} >>
`,y)});const h=2+e.length*3,C=s;let g=`xref
0 ${h+1}
0000000000 65535 f 
`;for(let n=1;n<=h;n++)g+=`${String(i[n]||0).padStart(10,"0")} 00000 n 
`;return a(g),a(`trailer
<< /Size ${h+1} /Root 1 0 R >>
startxref
${C}
%%EOF
`),new Blob(c,{type:"application/pdf"})}function E(e,{title:o,meta:c="",headers:i,rows:s}){const a=[];for(let l=0;l<s.length;l+=R){const $=s.slice(l,l+R),h=s.length>R?`${c}（第 ${a.length+1} 页）`:c;a.push(P(o,h,i,$))}a.length||a.push(P(o,c,i,[])),j(`${e}_${T()}.pdf`,W(a))}export{E as a,w as d};
