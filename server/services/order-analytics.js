import {rows,pool} from '../database/connection.js';
const DAY=86400000,OFFSET=8*3600000;
export function analyticsWindow(value,now=Date.now()){
 const days=[7,30,90].includes(Number(value))?Number(value):30;
 const last=Math.floor((now+OFFSET)/DAY)*DAY;
 const dates=Array.from({length:days},(_,i)=>new Date(last-(days-1-i)*DAY).toISOString().slice(0,10));
 const sqlTime=ms=>new Date(ms).toISOString().slice(0,19).replace('T',' ');
 return {days,dates,start:sqlTime(last-(days-1)*DAY-OFFSET),end:sqlTime(last+DAY-OFFSET)};
}
export function completeSeries(window,daily,statuses){
 const map=new Map(daily.map(r=>[r.day,r]));
 return {days:window.days,timezone:'Asia/Manila',from:window.dates[0],to:window.dates.at(-1),daily:window.dates.map(day=>({day,orders:Number(map.get(day)?.orders)||0,value:Number(map.get(day)?.value)||0})),statuses:statuses.map(s=>({status:s.status,orders:Number(s.orders)||0}))};
}
export async function orderAnalytics(days,db=pool,now=Date.now()){
 const window=analyticsWindow(days,now);
 // TIMESTAMP is converted through its epoch so database session timezone cannot shift PH days.
 // One grouped query keeps the trend and status totals in the same database snapshot.
 const records=await rows("SELECT DATE_FORMAT(DATE_ADD('1970-01-01', INTERVAL FLOOR((UNIX_TIMESTAMP(created_at)+28800)/86400) DAY),'%Y-%m-%d') day,status,COUNT(*) orders,COALESCE(SUM(total_cents),0) value FROM orders WHERE created_at>=FROM_UNIXTIME(?) AND created_at<FROM_UNIXTIME(?) GROUP BY day,status ORDER BY day",[Date.parse(window.start.replace(' ','T')+'Z')/1000,Date.parse(window.end.replace(' ','T')+'Z')/1000],db);
 const daily=new Map(),statuses=new Map();for(const row of records){const day=daily.get(row.day)||{day:row.day,orders:0,value:0};day.orders+=Number(row.orders);if(row.status!=='cancelled')day.value+=Number(row.value);daily.set(row.day,day);statuses.set(row.status,(statuses.get(row.status)||0)+Number(row.orders));}
 return completeSeries(window,[...daily.values()],[...statuses].map(([status,orders])=>({status,orders})));
}
