import test from 'node:test';
import assert from 'node:assert/strict';
import {liveSearch} from '../public/js/live-search.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('Typing is debounced and only the latest filter is requested',async()=>{
 const requests=[],shown=[];
 const search=liveSearch(async q=>{requests.push(q);return q;},q=>shown.push(q),assert.fail,10);
 search.search('k');search.search('ke');search.search('keyboard');
 await wait(40);assert.deepEqual(requests,['keyboard']);assert.deepEqual(shown,['keyboard']);search.cancel();
});
test('A stale response cannot overwrite newer results even when abort is ignored',async()=>{
 const pending=new Map(),shown=[];
 const search=liveSearch(q=>new Promise(resolve=>pending.set(q,resolve)),q=>shown.push(q),assert.fail,1);
 search.search('old',true);await wait(10);search.search('new',true);await wait(10);
 pending.get('new')('new');await wait(0);pending.get('old')('old');await wait(0);
 assert.deepEqual(shown,['new']);search.cancel();
});
test('Cancellation prevents requests and current failures can be retried',async()=>{
 const errors=[],shown=[];let count=0;
 const search=liveSearch(async()=>{if(++count===1)throw Error('Offline');return 'recovered';},r=>shown.push(r),e=>errors.push(e.message),10);
 search.search('cancelled');search.cancel();await wait(30);assert.equal(count,0);
 search.search('retry',true);await wait(10);assert.deepEqual(errors,['Offline']);
 search.search('retry',true);await wait(10);assert.deepEqual(shown,['recovered']);search.cancel();
});
