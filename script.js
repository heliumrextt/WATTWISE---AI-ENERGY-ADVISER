/* ---------- DEMO DATA: replace with your real values ---------- */
// [name, watts, hours per day, quantity]
var apps=[["Air conditioner",1500,5,1],["Ceiling fan",75,10,3],["Refrigerator",150,9,1],["LED lights",10,6,6],["Water heater",2000,0.5,1],["Television",100,4,1],["Washing machine",500,0.5,1],["Laptop",60,6,1]];
// Units per month, January to December
var bills=[210,190,240,330,420,450,400,380,350,280,220,205];
var M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var lang="en";
var CO2=0.71; // approx kg CO2 per unit (India grid average, rough)

/* ---------- Helpers ---------- */
function $(i){return document.getElementById(i)}
function kwh(a){return a[1]*a[2]*a[3]*30/1000}
function tariff(){return parseFloat($("tariff").value)||7}
function fmt(n){return Math.round(n).toLocaleString("en-IN")}
function icon(n){
 var m=[[/air|ac\b/i,"❄️"],[/fan/i,"🌀"],[/fridge|refrig/i,"🧊"],[/light|led|bulb/i,"💡"],[/heater|geyser/i,"🚿"],[/tv|televis/i,"📺"],[/wash/i,"🧺"],[/laptop|computer|pc/i,"💻"]];
 for(var i=0;i<m.length;i++)if(m[i][0].test(n))return m[i][1];
 return "🔌"}
// Animated count-up for the meter numbers
function setNum(el,to,pre){
 var from=el._v||0;el._v=to;
 if(window.matchMedia("(prefers-reduced-motion:reduce)").matches){el.textContent=pre+fmt(to);return}
 var t0=performance.now();
 (function f(t){var p=Math.min(1,(t-t0)/600);el.textContent=pre+fmt(from+(to-from)*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(t0)}

/* ---------- Appliance table ---------- */
function buildRows(){
 $("rows").innerHTML=apps.map(function(a,i){return "<tr><td><input class='n' value='"+a[0]+"' data-i='"+i+"' data-k='0'></td>"+[1,2,3].map(function(k){return "<td><input type='number' min='0' step='any' value='"+a[k]+"' data-i='"+i+"' data-k='"+k+"'></td>"}).join("")+"</tr>"}).join("")}
$("rows").addEventListener("input",function(e){var i=e.target.dataset.i,k=e.target.dataset.k;if(i==null)return;apps[i][k]=k==0?e.target.value:(parseFloat(e.target.value)||0);update()});
$("tariff").addEventListener("input",update);
$("bills").addEventListener("input",function(){var v=this.value.split(",").map(parseFloat).filter(function(x){return !isNaN(x)});if(v.length==12){bills=v;drawForecast()}else{$("fnote").textContent="Enter exactly 12 numbers to update the forecast."}});

/* ---------- Forecast: linear regression with seasonal terms ---------- */
function solve(A,b){var n=b.length;for(var i=0;i<n;i++){var p=i;for(var r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;var t=A[i];A[i]=A[p];A[p]=t;t=b[i];b[i]=b[p];b[p]=t;for(var r=i+1;r<n;r++){var f=A[r][i]/A[i][i];for(var c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i]}}
 var x=[];for(var i=n-1;i>=0;i--){var s=b[i];for(var c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x}
function feat(t){return [1,t,Math.sin(2*Math.PI*t/12),Math.cos(2*Math.PI*t/12)]}
function forecast(){
 var A=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],b=[0,0,0,0];
 bills.forEach(function(y,t){var f=feat(t);for(var i=0;i<4;i++){b[i]+=f[i]*y;for(var j=0;j<4;j++)A[i][j]+=f[i]*f[j]}});
 var w=solve(A,b);
 var fit=bills.map(function(_,t){return feat(t).reduce(function(s,v,i){return s+v*w[i]},0)});
 var mae=bills.reduce(function(s,y,t){return s+Math.abs(y-fit[t])},0)/12;
 var out=[12,13,14].map(function(t){return Math.max(0,feat(t).reduce(function(s,v,i){return s+v*w[i]},0))});
 return {out:out,mae:mae}}

function drawForecast(){
 $("bills").value=bills.join(", ");
 var f=forecast(),all=bills.concat(f.out),mx=Math.max.apply(null,all)*1.1,W=640,H=230,bw=W/15;
 var s="<svg viewBox='0 0 "+W+" "+(H+30)+"' role='img' aria-label='Monthly units, 12 months history and 3 months forecast'>";
 all.forEach(function(v,i){var h=v/mx*H,x=i*bw+6,fc=i>=12;
  s+="<rect x='"+x+"' y='"+(H-h)+"' width='"+(bw-12)+"' height='"+h+"' rx='4' fill='"+(fc?"var(--amber)":"var(--bar)")+"'/>";
  s+="<text x='"+(x+(bw-12)/2)+"' y='"+(H-h-4)+"' text-anchor='middle' font-size='11' fill='var(--ink)'>"+Math.round(v)+"</text>";
  s+="<text x='"+(x+(bw-12)/2)+"' y='"+(H+16)+"' text-anchor='middle' font-size='11' fill='var(--mute)'>"+M[i%12]+"</text>"});
 s+="</svg>";
 $("chart").innerHTML=s;
 $("fnote").innerHTML="Amber bars are forecasts: <b>"+f.out.map(function(v,i){return M[i]+" "+Math.round(v)}).join(", ")+" units</b>. Average error on the past 12 months: ±"+Math.round(f.mae)+" units. <small>Simulated data, so this only shows the method.</small>";
 renderTips()}

/* ---------- Advice (English and Hindi) ---------- */
var T={en:{
 title:"Your personalised tips",
 top:function(n,p,k){return "<b>"+n+"</b> uses "+p+"% of your appliance load ("+k+" units a month). This is where saving matters most."},
 ac:function(k,c){return "Set the AC to 26°C instead of 22°C. Each degree saves about 6%, which is roughly "+k+" units (₹"+c+") a month."},
 gz:function(k,c){return "Put the water heater on a timer for 15 minutes. This can save about "+k+" units (₹"+c+") a month."},
 st:function(k,c){return "Switch off TV, laptop and chargers at the plug instead of standby. This can save about "+k+" units (₹"+c+")."},
 fc:function(m,u){return "The forecast shows "+m+" as your highest coming month at about "+u+" units. Start these habits before then."},
 wi:function(x){return "Raise AC temperature by <b id='acV'>"+x+"</b>°C"},
 wr:function(u,c,g){return "Saves about "+u+" units, ₹"+c+" and "+g+" kg CO₂ every month."},
 note:"Tips are generated from your numbers by rules. The full project can pass the same numbers to an LLM for more natural wording."},
hi:{
 title:"आपके लिए सुझाव",
 top:function(n,p,k){return "<b>"+n+"</b> आपके उपकरणों की "+p+"% बिजली ("+k+" यूनिट प्रति माह) खर्च करता है। बचत यहीं सबसे ज़्यादा होगी।"},
 ac:function(k,c){return "AC को 22°C की जगह 26°C पर चलाएँ। हर डिग्री पर लगभग 6% बचत होती है, यानी करीब "+k+" यूनिट (₹"+c+") प्रति माह।"},
 gz:function(k,c){return "गीज़र को टाइमर पर 15 मिनट के लिए चलाएँ। इससे लगभग "+k+" यूनिट (₹"+c+") प्रति माह बच सकते हैं।"},
 st:function(k,c){return "TV, लैपटॉप और चार्जर को स्टैंडबाय पर छोड़ने के बजाय प्लग से बंद करें। इससे लगभग "+k+" यूनिट (₹"+c+") बच सकते हैं।"},
 fc:function(m,u){return "पूर्वानुमान के अनुसार "+m+" आगे का सबसे ज़्यादा खपत वाला महीना होगा (लगभग "+u+" यूनिट)। इससे पहले ये आदतें अपनाएँ।"},
 wi:function(x){return "AC का तापमान <b id='acV'>"+x+"</b>°C बढ़ाएँ"},
 wr:function(u,c,g){return "हर महीने लगभग "+u+" यूनिट, ₹"+c+" और "+g+" किग्रा CO₂ की बचत।"},
 note:"ये सुझाव आपके आँकड़ों से नियमों द्वारा बने हैं। पूरे प्रोजेक्ट में यही आँकड़े LLM को देकर और स्वाभाविक भाषा में सुझाव बनाए जा सकते हैं।"}};

function find(re){return apps.filter(function(a){return re.test(a[0])})}
function sumKwh(re){return find(re).reduce(function(s,a){return s+kwh(a)},0)}
function savings(){
 var list=[],ac=sumKwh(/air|ac\b/i),gz=sumKwh(/heater|geyser/i),st=sumKwh(/tv|televis|laptop|charger/i);
 if(ac>0)list.push({k:"ac",u:ac*0.24});
 if(gz>0)list.push({k:"gz",u:gz*0.25});
 if(st>0)list.push({k:"st",u:st*0.1});
 return list}

function renderWhatIf(){
 var t=T[lang],x=parseInt($("acT").value),u=sumKwh(/air|ac\b/i)*0.06*x;
 $("wiLabel").innerHTML=t.wi(x);
 $("whatif").textContent=t.wr(Math.round(u),fmt(u*tariff()),Math.round(u*CO2))}
$("acT").addEventListener("input",renderWhatIf);

function renderTips(){
 var t=T[lang],r=tariff(),tot=apps.reduce(function(s,a){return s+kwh(a)},0);
 var s=apps.slice().sort(function(a,b){return kwh(b)-kwh(a)})[0];
 var h="";
 if(s&&tot>0)h+="<div class='tip'>"+t.top(s[0],Math.round(kwh(s)/tot*100),Math.round(kwh(s)))+"</div>";
 savings().forEach(function(x){h+="<div class='tip'>"+t[x.k](Math.round(x.u),fmt(x.u*r))+"</div>"});
 var f=forecast(),mi=f.out.indexOf(Math.max.apply(null,f.out));
 h+="<div class='tip'>"+t.fc(M[mi],Math.round(f.out[mi]))+"</div>";
 $("tips").innerHTML=h;$("sTitle").textContent=t.title;$("sNote").textContent=t.note;
 renderWhatIf()}

/* ---------- Meters and bar chart ---------- */
function update(){
 var r=tariff(),tot=apps.reduce(function(s,a){return s+kwh(a)},0);
 var sv=savings().reduce(function(s,x){return s+x.u},0);
 setNum($("mUnits"),tot,"");setNum($("mCost"),tot*r,"₹");setNum($("mSave"),sv*r,"₹");setNum($("mCo2"),tot*CO2,"");
 var mx=Math.max.apply(null,apps.map(kwh).concat([1]));
 $("bars").innerHTML=apps.slice().sort(function(a,b){return kwh(b)-kwh(a)}).map(function(a){
  return "<div class='row'><span class='l'>"+icon(a[0])+" "+a[0]+"</span><span class='t'><span class='f' style='width:"+(kwh(a)/mx*100)+"%'></span></span><span class='v'>"+fmt(kwh(a))+" units · ₹"+fmt(kwh(a)*r)+"</span></div>"}).join("");
 renderTips()}

/* ---------- Tabs and language buttons ---------- */
document.querySelectorAll(".tabs button").forEach(function(b){b.addEventListener("click",function(){
 document.querySelectorAll(".tabs button").forEach(function(x){x.setAttribute("aria-selected",x===b)});
 ["a","f","s","m"].forEach(function(id){$(id).hidden=id!==b.dataset.t})})});
["en","hi"].forEach(function(l){$(l).addEventListener("click",function(){lang=l;$("en").setAttribute("aria-pressed",l=="en");$("hi").setAttribute("aria-pressed",l=="hi");renderTips()})});

/* ---------- Start ---------- */
buildRows();update();drawForecast();