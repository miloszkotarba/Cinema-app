import{_ as R}from"./add-vZ5Esz7A.js";import{a as b}from"./axios-QLjAsgXu.js";import{_ as S,a as L}from"./AlertDisplay-ZM8wSD_9.js";import{h as z}from"./ErrorHandler-0YoZ9Z16.js";import{_ as A,r as y,o as E,h as I,a as e,c as a,g as h,b as t,w as f,t as o,d as c,F as p,e as m,i as r,p as V,f as $,B as D}from"./index-elwunUWg.js";import{_ as F}from"./MainPage-GSCsHXFk.js";/* empty css                                                     */import"./logo-djfQEiQd.js";const G="data:image/svg+xml,%3c?xml%20version='1.0'%20?%3e%3csvg%20viewBox='0%200%2024%2024'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%3e%3cpath%20d='M0%200h24v24H0z'%20fill='none'/%3e%3cpath%20d='M12%2020h8v2h-8C6.477%2022%202%2017.523%202%2012S6.477%202%2012%202s10%204.477%2010%2010a9.956%209.956%200%200%201-2%206h-2.708A8%208%200%201%200%2012%2020zm0-10a2%202%200%201%201%200-4%202%202%200%200%201%200%204zm-4%204a2%202%200%201%201%200-4%202%202%200%200%201%200%204zm8%200a2%202%200%201%201%200-4%202%202%200%200%201%200%204zm-4%204a2%202%200%201%201%200-4%202%202%200%200%201%200%204z'/%3e%3c/g%3e%3c/svg%3e",u=i=>(V("data-v-2a227b11"),i=i(),$(),i),N={class:"admin-container"},U=u(()=>t("header",null,[t("h1",null,"Filmy"),t("div",{class:"icon"},[t("img",{src:G,alt:"Movie Icon"})])],-1)),j={class:"indent"},O=u(()=>t("img",{src:R,alt:"Button add"},null,-1)),H={key:0},K={key:1},P={key:2},Q={class:"helper"},T={class:"left"},q={class:"name"},J={key:0,class:"genres",id:"movieGenres"},W=u(()=>t("span",null,"Gatunek: ",-1)),X={key:0},Y={key:1,class:"director"},Z={class:"light"},ss={key:2,class:"releaseDate"},ts={class:"light"},es={key:3,class:"releaseCountry"},as={class:"light"},ns={key:4,class:"duration"},os={class:"light"},cs={class:"ageRestriction"},rs={class:"light"},is={key:5,class:"cast",id:"movieCast"},ls=u(()=>t("span",null,"Aktorzy: ",-1)),_s={key:6,class:"description"},ds={class:"light"},ps={class:"photo",style:{margin:"1rem 0"}},hs=["src"],us={class:"right"},gs=["onClick"],ys={__name:"GetAllMovies",setup(i){const l=y(null),g="https://api.kino-screenix.pl/api/v1/movies",k=y([]),v=y(!0),w=async()=>{try{const n=await b.get(g);k.value=n.data.movies}catch(n){z(n,l)}finally{v.value=!1}},B=async n=>{try{await b.delete(g+`/${n}`),await w(),L.addAlert("Usunięto film.","success","/admin/filmy")}catch(C){z(C,l)}},x=n=>typeof n=="string"||n instanceof String?n.replace(/['"]+/g,""):n;return E(w),(n,C)=>{const M=I("RouterLink");return e(),a(p,null,[h(S),t("div",N,[U,t("div",j,[h(M,{to:{name:"adminFilmyCreate"},class:"btn-add",style:{"text-decoration":"none"}},{default:f(()=>[O]),_:1}),l.value?(e(),a("div",H,o(l.value),1)):c("",!0),v.value?(e(),a("div",K,"Loading...")):(e(),a("div",P,[(e(!0),a(p,null,m(k.value,s=>(e(),a("div",{key:s._id,class:"movie"},[t("div",Q,[t("div",T,[t("span",q,o(s.title),1),s.genres&&s.genres.length>0?(e(),a("span",J,[W,(e(!0),a(p,null,m(s.genres,(_,d)=>(e(),a("span",{key:d,class:"light"},[r(o(x(_)),1),d!==s.genres.length-1?(e(),a("span",X,", ")):c("",!0)]))),128))])):c("",!0),s.director?(e(),a("span",Y,[r("Reżyser: "),t("span",Z,o(s.director),1)])):c("",!0),s.release&&s.release.year?(e(),a("span",ss,[r("Data wydania: "),t("span",ts,o(s.release.year),1)])):c("",!0),s.release&&s.release.country?(e(),a("span",es,[r("Kraj wydania: "),t("span",as,o(s.release.country),1)])):c("",!0),s.duration?(e(),a("span",ns,[r("Czas trwania: "),t("span",os,o(s.duration)+" min",1)])):c("",!0),t("span",cs,[r(" Ograniczenia wiekowe: "),t("span",rs,o(s.ageRestriction?s.ageRestriction:"-"),1)]),s.cast&&s.cast.length>0?(e(),a("span",is,[ls,(e(!0),a(p,null,m(s.cast,(_,d)=>(e(),a("span",{key:d,class:"light"},o(x(_)),1))),128))])):c("",!0),s.description?(e(),a("span",_s,[r("Opis: "),t("span",ds,o(s.description),1)])):c("",!0),t("div",ps,[t("img",{src:s.posterUrl,alt:"Movie poster",style:{"max-width":"200px"}},null,8,hs)])]),t("div",us,[h(M,{to:{name:"EditMovie",params:{id:s._id}},class:"btn btn-edit",style:{"text-decoration":"none",color:"black"}},{default:f(()=>[r(" Edytuj ")]),_:2},1032,["to"]),t("button",{onClick:_=>B(s._id),class:"btn btn-delete"},"Usuń",8,gs)])])]))),128))]))])])],64)}}},ms=A(ys,[["__scopeId","data-v-2a227b11"]]),zs={__name:"MoviesView",setup(i){return(l,g)=>(e(),D(F,null,{PageContent:f(()=>[h(ms)]),_:1}))}};export{zs as default};
