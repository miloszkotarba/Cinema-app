import{_ as f}from"./ticket-icon-8sPuAbkp.js";import{a as v}from"./axios-QLjAsgXu.js";import{_ as k}from"./AlertDisplay-ZM8wSD_9.js";import{h as y}from"./ErrorHandler-0YoZ9Z16.js";import{_ as g,r as i,o as x,h as b,a as e,c as s,g as _,b as t,t as r,d as B,F as m,e as C,w as u,i as L,p as w,f as E,B as I}from"./index-elwunUWg.js";import{_ as P}from"./MainPage-GSCsHXFk.js";/* empty css                                                     */import"./logo-djfQEiQd.js";const V=a=>(w("data-v-4fb7cf44"),a=a(),E(),a),N={class:"admin-container"},S=V(()=>t("header",null,[t("h1",null,"Cennik"),t("div",{class:"icon"},[t("img",{src:f,alt:"Prices Icon"})])],-1)),T={class:"indent"},D={key:0},R={key:1},$={key:2},F={class:"left"},j={class:"name"},q={class:"quantity"},z={class:"right"},M={__name:"Prices",setup(a){const o=i(null),d="https://api.kino-screenix.pl/api/v1/tickets",l=i([]),p=i(!0);return x(async()=>{try{const n=await v.get(d);l.value=n.data.tickets}catch(n){y(n,o)}finally{p.value=!1}}),(n,G)=>{const h=b("RouterLink");return e(),s(m,null,[_(k),t("div",N,[S,t("div",T,[o.value?(e(),s("div",D,r(o.value),1)):B("",!0),p.value?(e(),s("div",R,"Loading...")):(e(),s("div",$,[(e(!0),s(m,null,C(l.value,c=>(e(),s("div",{key:c._id,class:"room"},[t("div",F,[t("span",j,"Bilet "+r(c.name),1),t("span",q,"Cena: "+r(c.price)+" zł",1)]),t("div",z,[_(h,{to:{name:"EditTicket",params:{id:c._id}},class:"btn btn-edit",style:{"text-decoration":"none",color:"black"}},{default:u(()=>[L(" Edytuj ")]),_:2},1032,["to"])])]))),128))]))])])],64)}}},U=g(M,[["__scopeId","data-v-4fb7cf44"]]),Z={__name:"PricesView",setup(a){return(o,d)=>(e(),I(P,null,{PageContent:u(()=>[_(U)]),_:1}))}};export{Z as default};
