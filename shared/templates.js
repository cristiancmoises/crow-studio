import { makeElement as el,parsePage } from './scene.js';
export const formats=[
  {id:'social',name:'Post para Instagram',short:'Post',width:1080,height:1080,description:'1080 × 1080 px'},
  {id:'presentation',name:'Apresentação',short:'Apresentação',width:1920,height:1080,description:'1920 × 1080 px'},
  {id:'story',name:'Story',short:'Story',width:1080,height:1920,description:'1080 × 1920 px'},
  {id:'poster',name:'Cartaz A4',short:'Cartaz',width:794,height:1123,description:'794 × 1123 px'},
  {id:'cover',name:'Capa para vídeo',short:'Capa de vídeo',width:1280,height:720,description:'1280 × 720 px'}
];
const text=(t,x,y,w,h,size,fill='#ffffff',extra={})=>el('text',{text:t,x,y,w,h,fontSize:size,fill,...extra});
const rect=(x,y,w,h,fill,radius=0,extra={})=>el('rect',{x,y,w,h,fill,radius,...extra});
const circle=(x,y,d,fill,extra={})=>el('ellipse',{x,y,w:d,h:d,fill,...extra});
function template(id,name,category,bg,width,height,elements,tags=[]) {
  return {id,name,category,tags,page:parsePage({id,name:'Página 1',width,height,background:bg,elements})};
}
export const templates=[
  template('flight','Ideias ganham asas','presentation','#0b181c',1920,1080,[
    rect(80,80,52,8,'#67e8e3'),text('CROW STUDIO / CRIATIVIDADE LIVRE',154,65,1100,50,24,'#a7c0c5'),
    circle(1270,170,720,'#1c6466'),circle(1360,260,540,'#3fc8c6'),circle(1460,360,340,'#8ff6e3'),
    rect(1390,140,88,820,'#0b181c',0,{rotation:35}),
    text('Ideias\nganham\nasas.',100,250,1200,650,160,'#f4f9f5',{fontStyle:'bold'}),
    text('Um novo olhar para o que vem a seguir.',108,920,1100,60,35,'#b6d0d1'),text('01 / 2026',1660,990,220,40,22,'#9ab8b9')
  ],['tecnologia','criatividade']),
  template('editorial','Menos ruído, mais essência','social','#e5e5d8',1080,1080,[
    text('ESTÚDIO / VOLUME 01',65,65,800,60,25,'#283a29'),circle(570,100,700,'#c4ceae'),
    rect(750,130,75,700,'#526e46',0,{rotation:22}),rect(870,100,75,700,'#7f9c66',0,{rotation:22}),
    text('menos\nruído.\nmais\nessência.',65,230,950,700,129,'#223329',{fontFamily:'Georgia'}),
    rect(70,965,940,2,'#283a29'),text('CRIAR É ENCONTRAR O ESSENCIAL.',70,990,900,45,22,'#283a29')
  ],['minimalista','natureza']),
  template('beyond','Além do óbvio','social','#c9a9f4',1080,1080,[
    circle(570,-160,640,'#29223f'),circle(660,-70,460,'#b58be7'),
    text('IDEIAS QUE MOVEM',66,70,850,50,26,'#282037'),text('ALÉM\nDO\nÓBVIO.',55,270,1000,650,180,'#29223f',{fontFamily:'Impact'}),
    rect(70,935,420,70,'#29223f',35),text('DESCUBRA SEU PRÓXIMO PASSO',95,955,390,50,19,'#e7d3ff')
  ],['criativo','roxo']),
  template('coffee','Uma pausa bem feita','poster','#d86136',794,1123,[
    text('CAFÉ DE ORIGEM / FEITO COM TEMPO',55,55,700,60,20,'#fff0c9'),
    text('BOM\nDIA.',40,190,700,560,190,'#fff0c9',{fontFamily:'Impact'}),
    circle(435,640,260,'#f3cd7f'),circle(475,680,180,'#513021'),
    text('UMA PAUSA\nBEM FEITA.',55,825,600,150,53,'#fff0c9',{fontStyle:'bold'}),text('SEU CAFÉ. SEU MOMENTO.',55,1040,700,45,23,'#fff0c9')
  ],['café','comércio']),
  template('motion','O futuro tem movimento','story','#e9f44d',1080,1920,[
    text('NOVA COLEÇÃO / 2026',75,80,920,60,30,'#17191b'),
    circle(450,630,850,'#17191b'),circle(580,760,590,'#e9f44d'),circle(710,890,330,'#17191b'),
    text('O FUTURO\nTEM\nMOVIMENTO.',60,280,1000,800,150,'#17191b',{fontFamily:'Impact'}),
    text('Encontre seu ritmo.\nCrie o que vem depois.',80,1530,900,200,58,'#17191b'),
    rect(80,1770,920,2,'#17191b'),text('ARRASTE A IDEIA PARA CIMA ↑',80,1810,920,60,26,'#17191b')
  ],['moda','amarelo']),
  template('workshop','Design sem limites','presentation','#f5eee2',1920,1080,[
    rect(1180,0,740,1080,'#db4a35'),circle(1270,200,530,'#f6bc5e'),
    el('triangle',{x:1320,y:320,w:450,h:450,fill:'#913d39',rotation:20}),
    text('WORKSHOP CRIATIVO',95,85,1000,70,30,'#6c4535'),text('Design\nsem limites.',80,270,1100,580,146,'#2c302f',{fontFamily:'Georgia'}),
    text('Experimente. Combine. Reinvente.',95,880,1100,80,42,'#6c4535'),text('INSCRIÇÕES ABERTAS',95,990,1000,40,25,'#6c4535')
  ],['evento','educação']),
  template('podcast','Conversas que ficam','cover','#18214b',1280,720,[
    circle(820,-150,700,'#5969c9'),circle(900,-70,540,'#b6b6f3'),
    text('PODCAST / EP. 01',55,55,1000,60,24,'#c2cafa'),text('Conversas\nque ficam.',50,180,1050,400,100,'#ffffff',{fontStyle:'bold'}),
    rect(60,610,260,55,'#c2cafa',28),text('DÊ PLAY NA IDEIA',83,627,250,40,17,'#18214b')
  ],['podcast','mídia']),
  template('launch','Chegou o novo','social','#151516',1080,1080,[
    text('SEU PRÓXIMO FAVORITO.',65,65,950,60,26,'#d8d8cf'),
    rect(600,310,400,550,'#e2a976',180,{rotation:12}),rect(700,350,70,430,'#eedbc2',30,{rotation:12}),
    text('CHEGOU\nO NOVO.',55,240,990,520,150,'#f5f2e7',{fontFamily:'Impact'}),
    rect(70,900,400,80,'#e2a976',40),text('CONHEÇA A COLEÇÃO',105,926,380,50,25,'#19191b')
  ],['loja','lançamento']),
  template('quote','Um pensamento por dia','social','#ede0d9',1080,1080,[
    text('“',70,100,900,300,300,'#a04738',{fontFamily:'Georgia'}),text('Toda grande\nideia começa\ncom um\ne se?',80,315,930,610,110,'#582f29',{fontFamily:'Georgia'}),
    rect(85,970,70,3,'#a04738'),text('UM PENSAMENTO POR DIA',185,951,800,60,25,'#a04738')
  ],['frase','editorial']),
  template('night','Depois das seis','poster','#342e63',794,1123,[
    circle(150,125,500,'#e5a2be'),circle(265,240,270,'#342e63'),
    text('MÚSICA / ENCONTROS / BOAS HISTÓRIAS',45,55,750,55,18,'#f3dce8'),
    text('DEPOIS\nDAS SEIS.',40,640,750,300,108,'#f3dce8',{fontFamily:'Impact'}),
    text('SEXTA-FEIRA · 18H',45,1000,700,60,28,'#e5a2be')
  ],['evento','música']),
  template('portfolio','Feito para explorar','presentation','#182d32',1920,1080,[
    rect(1180,140,580,800,'#b9cabe',250),rect(1250,210,440,660,'#587d74',200),
    text('PORTFÓLIO / 2026',90,85,1300,70,30,'#a8bdb8'),text('Feito para\nexplorar.',80,310,1300,500,160,'#e7efe7',{fontFamily:'Georgia'}),
    text('Novas perspectivas. Possibilidades infinitas.',95,940,1500,70,37,'#a8bdb8')
  ],['portfólio','natureza']),
  template('sale','Pequenos preços, grandes ideias','story','#f2a9bd',1080,1920,[
    text('UMA SELEÇÃO ESPECIAL PARA VOCÊ',70,90,950,80,30,'#4b2243'),circle(390,570,920,'#d6496b'),
    text('PEQUENOS\nPREÇOS.\nGRANDES\nIDEIAS.',55,420,1000,1050,139,'#4b2243',{fontFamily:'Impact'}),
    rect(80,1660,920,100,'#4b2243',50),text('ENCONTRE O SEU FAVORITO →',145,1695,840,65,32,'#fbe0e8')
  ],['oferta','loja'])
];
