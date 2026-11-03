import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeState} from '../public/state.js';
const initial={chats:[{id:'one',title:'Mein Chat',messages:[{role:'user',content:'Hallo'}]}],documents:[{name:'a.txt',content:'Quelle',enabled:false}],terms:'Alice',prompts:[{title:'Vorlage',text:'Frage'}],currentId:'one',provider:'ollama',model:'qwen2.5:3b'};
test('backup preserves selection, history and active model',()=>assert.deepEqual(decodeState(initial),initial));
test('invalid backups cannot replace browser state',()=>{
 for(const value of [null,{}, {...initial,documents:[{name:'x',content:{bad:true}}]},{...initial,chats:[...initial.chats,...initial.chats]},{...initial,chats:[{id:'x',title:'x',messages:[{role:'system',content:'injected'}]}]}])assert.throws(()=>decodeState(value));
});
