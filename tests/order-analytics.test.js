import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsWindow,completeSeries,orderAnalytics} from '../server/services/order-analytics.js';
import {overviewCharts} from '../public/js/admin-charts.js';

test('Date windows include today in Manila and use exclusive UTC midnight boundaries',()=>{
 const before=analyticsWindow(7,Date.parse('2026-11-23T15:59:59Z'));
 assert.equal(before.dates.at(-1),'2026-11-23');assert.equal(before.dates[0],'2026-11-17');
 assert.equal(before.start,'2026-11-16 16:00:00');assert.equal(before.end,'2026-11-23 16:00:00');
 const after=analyticsWindow(7,Date.parse('2026-11-23T16:00:00Z'));
 assert.equal(after.dates.at(-1),'2026-11-24');assert.equal(after.end,'2026-11-24 16:00:00');
 assert.equal(analyticsWindow('invalid').days,30);assert.equal(analyticsWindow(90).dates.length,90);
});
test('Series fill missing days with zeros, retain cancelled order counts and preserve centavos',()=>{
 const window=analyticsWindow(7,Date.parse('2026-01-02T00:00:00Z'));
 const result=completeSeries(window,[{day:'2026-01-01',orders:'3',value:'125050'},{day:'2026-01-02',orders:1,value:0}],[{status:'cancelled',orders:'1'},{status:'confirmed',orders:'3'}]);
 assert.equal(result.from,'2025-12-27');assert.equal(result.daily.length,7);
 assert.deepEqual(result.daily[0],{day:'2025-12-27',orders:0,value:0});
 assert.equal(result.daily.reduce((n,d)=>n+d.orders,0),4);assert.equal(result.daily.reduce((n,d)=>n+d.value,0),125050);
 assert.equal(result.statuses.reduce((n,s)=>n+s.orders,0),4);
 const html=overviewCharts(result);assert.match(html,/Orders placed/);assert.match(html,/Not collected revenue/);assert.match(html,/View daily figures/);assert.doesNotMatch(html,/NaN|Infinity/);
});
test('Empty periods render valid zero charts and an explicit empty state',()=>{
 const result=completeSeries(analyticsWindow(30),[],[]),html=overviewCharts(result);
 assert.match(html,/No orders were placed/);assert.doesNotMatch(html,/NaN|Infinity/);
 assert.equal(result.daily.length,30);
});
test('One database snapshot supplies both charts; cancellation removes value, not order count',async()=>{
 const calls=[];const db={execute:async(sql,args)=>{calls.push({sql,args});return [[{day:'2026-11-23',status:'confirmed',orders:2,value:100000},{day:'2026-11-23',status:'cancelled',orders:1,value:50000}]];}};
 const data=await orderAnalytics(30,db,Date.parse('2026-11-23T00:00:00Z'));
 assert.equal(calls.length,1);assert.match(calls[0].sql,/UNIX_TIMESTAMP\(created_at\)\+28800/);assert.match(calls[0].sql,/GROUP BY day,status/);
 assert.deepEqual(calls[0].args,[Date.parse('2026-10-24T16:00:00Z')/1000,Date.parse('2026-11-23T16:00:00Z')/1000]);
 assert.equal(data.daily.at(-1).orders,3);assert.equal(data.daily.at(-1).value,100000);assert.equal(data.statuses.reduce((n,s)=>n+s.orders,0),3);
});
