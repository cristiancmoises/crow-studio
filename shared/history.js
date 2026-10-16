export const history = {
  init: present=>({past:[],present:structuredClone(present),future:[]}),
  push:(state,present)=>JSON.stringify(state.present)===JSON.stringify(present)?state:({past:[...state.past,state.present].slice(-50),present:structuredClone(present),future:[]}),
  undo:state=>state.past.length?({past:state.past.slice(0,-1),present:state.past.at(-1),future:[state.present,...state.future]}):state,
  redo:state=>state.future.length?({past:[...state.past,state.present].slice(-50),present:state.future[0],future:state.future.slice(1)}):state
};
